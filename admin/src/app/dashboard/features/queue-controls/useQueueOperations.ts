import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { RobustQueueOperations } from "@/lib/robustQueueOperations";

export const useQueueOperations = () => {
  const callNext = useCallback(
    async (
      selectedDepartment: string,
      selectedService: string,
      queueData: any,
      userProfile: any,
      organization: any,
      fetchQueueData: () => void,
      setLoading: (loading: boolean) => void,
      setConnectionError: (error: boolean) => void,
      showSuccess: (title: string, message: string, action?: any) => void,
      showInfo: (title: string, message: string) => void,
      showError: (title: string, message: string, action?: any) => void
    ) => {
      if (!selectedDepartment || !queueData) return;

      setLoading(true);
      try {
        logger.log("Starting robust call next operation", {
          selectedDepartment,
          userProfile: userProfile?.id,
          organization: organization?.id,
        });

        // Use the robust queue operations with conflict resolution
        const result =
          await RobustQueueOperations.callNextWithConflictResolution(
            selectedDepartment,
            userProfile,
            organization
          );

        if (result.success && result.ticket) {
          const nextTicket = result.ticket;

          // Send notifications for the called ticket
          try {
            logger.log("Sending notifications for called ticket:", {
              ticketId: nextTicket.id,
              ticketNumber: nextTicket.ticket_number,
              customerPhone: nextTicket.customer_phone,
            });

            await RobustQueueOperations.sendTicketNotifications(
              nextTicket,
              selectedDepartment,
              userProfile,
              organization,
              queueData
            );

            logger.log("Notifications sent successfully");
          } catch (notificationError) {
            logger.error("Failed to send notifications:", notificationError);
            // Don't fail the whole operation for notification errors
          }

          fetchQueueData();
          setConnectionError(false);

          // Show success toast
          showSuccess(
            "Customer Called Successfully!",
            `Now serving ticket ${nextTicket.ticket_number}`,
            {
              label: "View Details",
              onClick: () => {
                // TODO: Implement ticket details view
              },
            }
          );
        } else if (result.error === "No tickets waiting") {
          showInfo(
            "No Customers Waiting",
            "The queue is currently empty. No customers to call."
          );
        } else {
          throw new Error(result.error || "Call next operation failed");
        }
      } catch (error) {
        logger.error("Error calling next ticket:", error);
        setConnectionError(true);

        // Show error toast
        showError(
          "Failed to Call Next Customer",
          "There was an error processing your request. Please try again.",
          {
            label: "Retry",
            onClick: () =>
              callNext(
                selectedDepartment,
                selectedService,
                queueData,
                userProfile,
                organization,
                fetchQueueData,
                setLoading,
                setConnectionError,
                showSuccess,
                showInfo,
                showError
              ),
          }
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const skipCurrentTicket = useCallback(
    async (
      selectedDepartment: string,
      queueData: any,
      fetchQueueData: () => void,
      setLoading: (loading: boolean) => void,
      setConnectionError: (error: boolean) => void,
      showWarning: (title: string, message: string, action?: any) => void,
      showError: (title: string, message: string, action?: any) => void,
      showSuccess: (title: string, message: string, action?: any) => void
    ) => {
      if (!selectedDepartment || !queueData?.currentServing) return;

      try {
        setLoading(true);

        // Get the currently serving ticket
        const { data: servingTickets } = await supabase
          .from("tickets")
          .select("*")
          .eq("department_id", selectedDepartment)
          .eq("status", "serving")
          .limit(1);

        const servingTicket = servingTickets?.[0];

        if (servingTicket) {
          // Mark the current ticket as cancelled (skipped)
          await supabase
            .from("tickets")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", servingTicket.id);

          // Clear current serving in queue settings
          await supabase
            .from("queue_settings")
            .update({ current_serving: null })
            .eq("department_id", selectedDepartment);

          fetchQueueData();
          setConnectionError(false);

          showSuccess(
            "Customer Skipped Successfully!",
            `Ticket ${servingTicket.ticket_number} has been skipped and marked as cancelled.`,
            {
              label: "Call Next Customer",
              onClick: () => {
                // This would call the callNext function
              },
            }
          );
        }
      } catch (error) {
        logger.error("Error skipping ticket:", error);
        setConnectionError(true);

        showError(
          "Failed to Skip Customer",
          "There was an error skipping the current customer. Please try again.",
          {
            label: "Retry",
            onClick: () =>
              skipCurrentTicket(
                selectedDepartment,
                queueData,
                fetchQueueData,
                setLoading,
                setConnectionError,
                showWarning,
                showError,
                showSuccess
              ),
          }
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const completeCurrentTicket = useCallback(
    async (
      selectedDepartment: string,
      queueData: any,
      fetchQueueData: () => void,
      setLoading: (loading: boolean) => void,
      setConnectionError: (error: boolean) => void,
      showSuccess: (title: string, message: string, action?: any) => void,
      showError: (title: string, message: string, action?: any) => void
    ) => {
      if (!selectedDepartment || !queueData?.currentServing) return;

      try {
        setLoading(true);

        // Get the currently serving ticket
        const { data: servingTickets } = await supabase
          .from("tickets")
          .select("*")
          .eq("department_id", selectedDepartment)
          .eq("status", "serving")
          .limit(1);

        const servingTicket = servingTickets?.[0];

        if (servingTicket) {
          // Mark the current ticket as completed
          await supabase
            .from("tickets")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", servingTicket.id);

          // Clear current serving in queue settings
          await supabase
            .from("queue_settings")
            .update({ current_serving: null })
            .eq("department_id", selectedDepartment);

          fetchQueueData();
          setConnectionError(false);

          showSuccess(
            "Customer Service Completed!",
            `Ticket ${servingTicket.ticket_number} has been marked as completed.`,
            {
              label: "Call Next Customer",
              onClick: () => {
                // This would call the callNext function
              },
            }
          );
        }
      } catch (error) {
        logger.error("Error completing ticket:", error);
        setConnectionError(true);

        showError(
          "Failed to Complete Ticket",
          "There was an error completing the current ticket. Please try again.",
          {
            label: "Retry",
            onClick: () =>
              completeCurrentTicket(
                selectedDepartment,
                queueData,
                fetchQueueData,
                setLoading,
                setConnectionError,
                showSuccess,
                showError
              ),
          }
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const resetQueue = useCallback(
    async (
      selectedDepartment: string,
      includeCleanup: boolean,
      fetchQueueData: () => void,
      setLoading: (loading: boolean) => void,
      setConnectionError: (error: boolean) => void,
      showWarning: (title: string, message: string, action?: any) => void,
      showError: (title: string, message: string, action?: any) => void
    ) => {
      if (!selectedDepartment) return;

      setLoading(true);
      try {
        // Reset all tickets to cancelled
        await supabase
          .from("tickets")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("department_id", selectedDepartment)
          .in("status", ["waiting", "serving"]);

        // Optional: Clean up old completed/cancelled tickets
        if (includeCleanup) {
          // Archive and delete ALL completed/cancelled tickets (no age limit for manual cleanup)

          // First get all completed/cancelled tickets
          const { data: oldTickets } = await supabase
            .from("tickets")
            .select("*")
            .eq("department_id", selectedDepartment)
            .in("status", ["completed", "cancelled"]);

          if (oldTickets && oldTickets.length > 0) {
            // Archive to tickets_archive table (if it exists)
            try {
              await supabase.from("tickets_archive").insert(
                oldTickets.map((ticket) => ({
                  original_ticket_id: ticket.id,
                  department_id: ticket.department_id,
                  ticket_number: ticket.ticket_number,
                  customer_phone: ticket.customer_phone,
                  status: ticket.status,
                  priority: ticket.priority,
                  estimated_service_time: ticket.estimated_service_time,
                  created_at: ticket.created_at,
                  updated_at: ticket.updated_at,
                  called_at: ticket.called_at,
                  completed_at: ticket.completed_at,
                }))
              );
            } catch (archiveError) {
              // Archive table not available, skip archival and proceed with deletion
            }

            // Delete ALL completed/cancelled tickets
            await supabase
              .from("tickets")
              .delete()
              .eq("department_id", selectedDepartment)
              .in("status", ["completed", "cancelled"]);
          }
        }

        // Clear current serving and reset ticket numbering
        await supabase
          .from("queue_settings")
          .update({
            current_serving: null,
            last_ticket_number: 0,
          })
          .eq("department_id", selectedDepartment);

        fetchQueueData();
        setConnectionError(false);

        // Show success toast for reset
        showWarning(
          "Queue Reset Successfully",
          includeCleanup
            ? "Queue cleared and all completed/cancelled tickets cleaned up!"
            : "All pending tickets have been cancelled and the queue has been cleared.",
          {
            label: "Refresh Data",
            onClick: () => fetchQueueData(),
          }
        );
      } catch (error) {
        logger.error("Error resetting queue:", error);
        setConnectionError(true);

        // Show error toast for reset failure
        showError(
          "Failed to Reset Queue",
          "Unable to reset the queue. Please check your connection and try again.",
          {
            label: "Try Again",
            onClick: () =>
              resetQueue(
                selectedDepartment,
                includeCleanup,
                fetchQueueData,
                setLoading,
                setConnectionError,
                showWarning,
                showError
              ),
          }
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const performCleanup = useCallback(
    async (
      selectedDepartment: string,
      fetchQueueData: () => void,
      setLoading: (loading: boolean) => void,
      showInfo: (title: string, message: string) => void,
      showSuccess: (title: string, message: string) => void,
      showError: (title: string, message: string) => void
    ) => {
      if (!selectedDepartment) return;

      try {
        setLoading(true);

        // Clean up old completed/cancelled tickets (older than 24 hours)
        const cutoffTime = new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString();

        // Get tickets to be cleaned
        const { data: oldTickets } = await supabase
          .from("tickets")
          .select("*")
          .eq("department_id", selectedDepartment)
          .in("status", ["completed", "cancelled"])
          .lt("updated_at", cutoffTime);

        if (!oldTickets || oldTickets.length === 0) {
          showInfo(
            "No Cleanup Needed",
            "No old tickets found to clean up. Database is already optimized!"
          );
          return;
        }

        // Archive tickets before deletion
        try {
          await supabase.from("tickets_archive").insert(
            oldTickets.map((ticket) => ({
              original_ticket_id: ticket.id,
              department_id: ticket.department_id,
              ticket_number: ticket.ticket_number,
              customer_phone: ticket.customer_phone,
              status: ticket.status,
              priority: ticket.priority,
              estimated_service_time: ticket.estimated_service_time,
              created_at: ticket.created_at,
              updated_at: ticket.updated_at,
              called_at: ticket.called_at,
              completed_at: ticket.completed_at,
            }))
          );
        } catch (archiveError) {
          logger.warn(
            "Archive table not available, proceeding with cleanup only"
          );
        }

        // Delete old tickets
        await supabase
          .from("tickets")
          .delete()
          .eq("department_id", selectedDepartment)
          .in("status", ["completed", "cancelled"])
          .lt("updated_at", cutoffTime);

        fetchQueueData();

        showSuccess(
          "Cleanup Completed!",
          `Successfully cleaned up ${oldTickets.length} old tickets. Database optimized!`
        );
      } catch (error) {
        logger.error("Error during cleanup:", error);
        showError(
          "Cleanup Failed",
          "There was an error cleaning up old tickets. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    callNext,
    skipCurrentTicket,
    completeCurrentTicket,
    resetQueue,
    performCleanup,
  };
};
