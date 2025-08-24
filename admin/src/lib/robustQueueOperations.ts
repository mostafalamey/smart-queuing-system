// Enhanced Queue Operations with Conflict Resolution
// Handles database conflicts and race conditions for admin queue management

import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

interface TicketUpdateResult {
  success: boolean;
  ticket?: any;
  error?: string;
  shouldRetry?: boolean;
}

export class RobustQueueOperations {
  /**
   * Call next ticket with conflict resolution and retry logic
   */
  static async callNextWithConflictResolution(
    selectedDepartment: string,
    userProfile: any,
    organization: any,
    maxRetries: number = 3
  ): Promise<TicketUpdateResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.log(
          `Attempting to call next ticket (attempt ${attempt}/${maxRetries})`
        );

        // Start a transaction-like sequence
        const result = await this.performCallNextOperation(
          selectedDepartment,
          userProfile,
          organization
        );

        if (result.success) {
          logger.log("Call next operation completed successfully");
          return result;
        }

        // Check if this is a retryable error
        if (result.shouldRetry && attempt < maxRetries) {
          logger.log(`Operation failed but retryable, waiting before retry...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Progressive delay
          continue;
        }

        return result;
      } catch (error: any) {
        logger.error(`Call next attempt ${attempt} failed:`, error);

        // Check if this is a conflict error
        const isConflict =
          error.message?.includes("conflict") ||
          error.code === "PGRST204" ||
          error.code === "PGRST409";

        if (isConflict && attempt < maxRetries) {
          logger.log("Detected conflict, retrying with progressive delay...");
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        return {
          success: false,
          error: error.message || "Unknown error occurred",
          shouldRetry: false,
        };
      }
    }

    return {
      success: false,
      error: "Maximum retry attempts exceeded",
      shouldRetry: false,
    };
  }

  /**
   * Perform the actual call next operation
   */
  private static async performCallNextOperation(
    selectedDepartment: string,
    userProfile: any,
    organization: any
  ): Promise<TicketUpdateResult> {
    // Step 1: Get next waiting ticket with a timestamp check to prevent race conditions
    const { data: nextTickets } = await supabase
      .from("tickets")
      .select("*")
      .eq("department_id", selectedDepartment)
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1);

    const nextTicket = nextTickets?.[0];
    if (!nextTicket) {
      return {
        success: false,
        error: "No waiting customers in queue",
      };
    }

    // Debug: Log the ticket data to see if customer_phone is present
    logger.log("Next ticket retrieved:", {
      id: nextTicket.id,
      ticket_number: nextTicket.ticket_number,
      customer_phone: nextTicket.customer_phone,
      status: nextTicket.status,
      department_id: nextTicket.department_id,
    });

    // Step 2: Try to atomically update the ticket status
    const now = new Date().toISOString();

    // Use a conditional update to prevent race conditions
    const { data: updatedTicket, error: updateError } = await supabase
      .from("tickets")
      .update({
        status: "serving",
        called_at: now,
        updated_at: now,
      })
      .eq("id", nextTicket.id)
      .eq("status", "waiting") // Only update if still waiting
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating ticket to serving:", updateError);

      // Check if this was a conflict (ticket was already updated)
      if (updateError.code === "PGRST116") {
        return {
          success: false,
          error: "Ticket was already called by another user",
          shouldRetry: true,
        };
      }

      return {
        success: false,
        error: updateError.message,
        shouldRetry: true,
      };
    }

    if (!updatedTicket) {
      return {
        success: false,
        error: "Ticket may have already been called",
        shouldRetry: true,
      };
    }

    // Step 3: Mark any other currently serving tickets as completed
    // (This handles edge cases where multiple tickets might be serving)
    try {
      await supabase
        .from("tickets")
        .update({
          status: "completed",
          updated_at: now,
        })
        .eq("department_id", selectedDepartment)
        .eq("status", "serving")
        .neq("id", updatedTicket.id); // Don't update the ticket we just set to serving
    } catch (cleanupError) {
      logger.warn(
        "Warning: Could not clean up other serving tickets:",
        cleanupError
      );
      // Don't fail the operation for this
    }

    // Step 4: Update queue settings with retry logic
    const maxQueueRetries = 3;
    let queueUpdateSuccess = false;

    for (let i = 0; i < maxQueueRetries; i++) {
      try {
        // Try a conditional update first
        const { error: updateError } = await supabase
          .from("queue_settings")
          .update({
            current_serving: updatedTicket.ticket_number,
            updated_at: now,
          })
          .eq("department_id", selectedDepartment);

        if (!updateError) {
          queueUpdateSuccess = true;
          break;
        }

        // If update failed, try upsert
        const { error: upsertError } = await supabase
          .from("queue_settings")
          .upsert(
            {
              department_id: selectedDepartment,
              current_serving: updatedTicket.ticket_number,
              updated_at: now,
            },
            {
              onConflict: "department_id",
            }
          );

        if (!upsertError) {
          queueUpdateSuccess = true;
          break;
        }

        logger.warn(
          `Queue settings update attempt ${i + 1} failed:`,
          upsertError
        );

        if (i < maxQueueRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (i + 1))); // Progressive delay
        }
      } catch (error) {
        logger.warn(`Queue settings update attempt ${i + 1} error:`, error);

        if (i === maxQueueRetries - 1) {
          throw error;
        }
      }
    }

    if (!queueUpdateSuccess) {
      logger.error("All queue settings update attempts failed");

      // Try to revert the ticket status
      try {
        await supabase
          .from("tickets")
          .update({
            status: "waiting",
            called_at: null,
            updated_at: now,
          })
          .eq("id", updatedTicket.id);
      } catch (revertError) {
        logger.error("Failed to revert ticket status:", revertError);
      }

      return {
        success: false,
        error: "Failed to update queue settings after multiple attempts",
        shouldRetry: true,
      };
    }

    return {
      success: true,
      ticket: updatedTicket,
    };
  }

  /**
   * Send notifications for called ticket (separated for better error handling)
   */
  static async sendTicketNotifications(
    ticket: any,
    selectedDepartment: string,
    userProfile: any,
    organization: any,
    queueData: any
  ): Promise<void> {
    try {
      if (!userProfile?.organization_id) {
        logger.error("Organization ID not found for notifications");
        return;
      }

      // 1. Send "Your Turn" notification to the customer being called
      try {
        // Debug: Log what we're sending to the push API
        const pushPayload = {
          organizationId: userProfile.organization_id,
          ticketId: ticket.id,
          customerPhone: ticket.customer_phone, // Include phone for WhatsApp fallback
          payload: {
            title: `🎯 Your Turn! - ${queueData.department.branches.name}`,
            body: `Ticket ${ticket.ticket_number} - Please proceed to ${queueData.department.name}`,
            icon: organization?.logo_url || "/Logo.svg",
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
            tag: "your-turn",
          },
          notificationType: "your_turn" as const,
          ticketNumber: ticket.ticket_number,
        };

        logger.log("Sending push notification with payload:", {
          ticketId: pushPayload.ticketId,
          customerPhone: pushPayload.customerPhone,
          notificationType: pushPayload.notificationType,
          ticketNumber: pushPayload.ticketNumber,
        });

        const response = await fetch("/api/notifications/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pushPayload),
        });

        const responseData = await response.json();

        logger.log("Push notification API response:", {
          status: response.status,
          ok: response.ok,
          success: responseData.success,
          message: responseData.message,
          whatsappFallback: responseData.whatsappFallback,
        });

        if (!response.ok) {
          logger.error("Push notification API returned error:", responseData);
        }

        logger.log("Push notification request sent successfully");
      } catch (pushError) {
        logger.error("Failed to send push notification:", pushError);
      }

      // 2. Send notifications to other waiting customers (Optional)
      try {
        // Get next few customers to notify about updates
        const { data: upcomingTickets } = await supabase
          .from("tickets")
          .select("*")
          .eq("department_id", selectedDepartment)
          .eq("status", "waiting")
          .order("created_at", { ascending: true })
          .range(0, 2);

        if (upcomingTickets && upcomingTickets.length > 0) {
          // Notify next customer they're almost up
          const nextCustomer = upcomingTickets[0];
          if (nextCustomer) {
            await fetch("/api/notifications/push", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                organizationId: userProfile.organization_id,
                ticketId: nextCustomer.id,
                customerPhone: nextCustomer.customer_phone,
                payload: {
                  title: `⏰ Almost Your Turn - ${queueData.department.branches.name}`,
                  body: `Ticket ${nextCustomer.ticket_number} - You're next in line!`,
                  icon: organization?.logo_url || "/Logo.svg",
                  tag: "almost-your-turn",
                },
                notificationType: "almost_your_turn" as const,
                ticketNumber: nextCustomer.ticket_number,
              }),
            });
          }
        }
      } catch (upcomingError) {
        logger.warn("Could not send upcoming notifications:", upcomingError);
        // Don't fail the main operation for this
      }
    } catch (notificationError) {
      logger.error("Notification process failed:", notificationError);
      // Don't fail the main queue operation for notification failures
    }
  }
}
