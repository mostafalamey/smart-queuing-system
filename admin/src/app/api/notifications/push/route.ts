import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
  vibrate?: number[];
}

/**
 * Send push notification to a specific customer
 * POST /api/notifications/push
 *
 * Body:
 * {
 *   organizationId: string,
 *   ticketId: string,
 *   customerPhone?: string, // Optional for WhatsApp/SMS fallback
 *   payload: NotificationPayload,
 *   notificationType: 'ticket_created' | 'almost_your_turn' | 'your_turn',
 *   ticketNumber?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      organizationId,
      ticketId,
      customerPhone, // Now optional
      payload,
      notificationType,
      ticketNumber,
    } = body;

    // Validate required fields (either ticketId OR customerPhone must be provided)
    if (
      !organizationId ||
      (!ticketId && !customerPhone) ||
      !payload ||
      !notificationType
    ) {
      console.error("Push API missing required fields:", {
        organizationId: !!organizationId,
        ticketId: !!ticketId,
        customerPhone: !!customerPhone,
        payload: !!payload,
        notificationType: !!notificationType,
      });
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: {
            organizationId: !organizationId ? "missing" : "present",
            ticketId: !ticketId ? "missing" : "present",
            customerPhone: !customerPhone ? "missing" : "present",
            payload: !payload ? "missing" : "present",
            notificationType: !notificationType ? "missing" : "present",
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Try to find subscriptions by phone number first (new approach)
    // If customerPhone is provided, use phone-based lookup
    // Otherwise, fall back to ticket-based lookup (legacy)
    let subscriptions = null;
    let subscriptionError = null;

    if (customerPhone) {
      console.log("Using phone-based subscription lookup for:", customerPhone);

      // Get active push subscriptions for this phone number
      const { data: phoneSubscriptions, error: phoneError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("customer_phone", customerPhone)
        .eq("is_active", true);

      subscriptions = phoneSubscriptions;
      subscriptionError = phoneError;
    } else {
      console.log("Using ticket-based subscription lookup for:", ticketId);

      // Get active push subscriptions for this ticket (legacy)
      const { data: ticketSubscriptions, error: ticketError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("ticket_id", ticketId)
        .eq("is_active", true);

      subscriptions = ticketSubscriptions;
      subscriptionError = ticketError;
    }

    if (subscriptionError) {
      console.error("Error fetching subscriptions:", subscriptionError);

      // Check if this is a "table doesn't exist" error (migration not run)
      if (
        subscriptionError.code === "PGRST204" ||
        subscriptionError.message?.includes("does not exist") ||
        subscriptionError.message?.includes("push_subscriptions")
      ) {
        return NextResponse.json(
          {
            error: "Database migration required",
            details:
              "Please run the database migration script: sql/database-push-notifications-ticket-based.sql",
            migrationRequired: true,
          },
          { status: 503, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to fetch subscriptions",
          details: subscriptionError.message,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found, attempting WhatsApp fallback");

      // Log that push failed
      await logNotificationAttempt(
        organizationId,
        ticketId,
        customerPhone || null,
        ticketNumber || "",
        notificationType,
        "push",
        false,
        "No active subscriptions found"
      );

      // If we have a customer phone, try WhatsApp fallback immediately
      let whatsappFallbackResult = null;
      if (customerPhone) {
        try {
          console.log("Attempting WhatsApp fallback for:", customerPhone);

          // Get ticket details for better messaging
          const { data: ticketData } = await supabase
            .from("tickets")
            .select(
              `
              ticket_number,
              departments (
                name,
                branches (
                  name,
                  organizations (name)
                )
              )
            `
            )
            .eq("id", ticketId)
            .single();

          if (ticketData && ticketData.departments) {
            // Import the notification service
            const { notificationService } = await import("@/lib/notifications");

            const departmentData = ticketData.departments as any;
            const departmentName = departmentData.name;
            const organizationName =
              departmentData.branches?.organizations?.name ||
              "Your Organization";

            // Send appropriate WhatsApp message based on notification type
            let whatsappSuccess = false;
            switch (notificationType) {
              case "ticket_created":
                whatsappSuccess = await notificationService.notifyTicketCreated(
                  customerPhone,
                  ticketData.ticket_number,
                  departmentName,
                  organizationName,
                  0, // waitingCount - we don't have this info in admin context
                  organizationId,
                  ticketId
                );
                break;

              case "almost_your_turn":
                whatsappSuccess =
                  await notificationService.notifyAlmostYourTurn(
                    customerPhone,
                    ticketData.ticket_number,
                    departmentName,
                    organizationName,
                    "Previous ticket", // currentServing - generic fallback
                    organizationId,
                    ticketId
                  );
                break;

              case "your_turn":
                whatsappSuccess = await notificationService.notifyYourTurn(
                  customerPhone,
                  ticketData.ticket_number,
                  departmentName,
                  organizationName,
                  organizationId,
                  ticketId
                );
                break;
            }

            whatsappFallbackResult = {
              attempted: true,
              success: whatsappSuccess,
              phone: customerPhone,
            };

            // Log WhatsApp attempt
            await logNotificationAttempt(
              organizationId,
              ticketId,
              customerPhone,
              ticketData.ticket_number,
              notificationType,
              "whatsapp",
              whatsappSuccess
            );

            console.log("WhatsApp fallback result:", whatsappFallbackResult);

            if (whatsappSuccess) {
              return NextResponse.json(
                {
                  success: true,
                  message:
                    "WhatsApp notification sent successfully (push fallback)",
                  whatsappFallback: whatsappFallbackResult,
                },
                { status: 200, headers: corsHeaders }
              );
            }
          }
        } catch (whatsappError) {
          console.error("WhatsApp fallback error:", whatsappError);
          whatsappFallbackResult = {
            attempted: true,
            success: false,
            error:
              whatsappError instanceof Error
                ? whatsappError.message
                : "Unknown error",
          };
        }
      }

      return NextResponse.json(
        {
          success: false,
          message: "No active subscriptions found",
          shouldFallback: true,
          whatsappFallback: whatsappFallbackResult,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const pushResults = [];
    let successCount = 0;
    let failureCount = 0;

    // Send notification to all active subscriptions
    for (const subscription of subscriptions) {
      try {
        const pushSubscription: PushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );

        // Update last_used_at for successful subscription
        await supabase
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", subscription.id);

        pushResults.push({
          subscriptionId: subscription.id,
          success: true,
        });
        successCount++;
      } catch (error: any) {
        console.error(
          `Push notification failed for subscription ${subscription.id}:`,
          error
        );

        // Handle specific error cases
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription is no longer valid, mark as inactive
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", subscription.id);
        }

        pushResults.push({
          subscriptionId: subscription.id,
          success: false,
          error: error.message,
        });
        failureCount++;
      }
    }

    // Log the notification attempt
    await logNotificationAttempt(
      organizationId,
      ticketId,
      customerPhone,
      ticketNumber || "",
      notificationType,
      "push",
      successCount > 0,
      failureCount > 0
        ? `${successCount} success, ${failureCount} failed`
        : undefined
    );

    // If push notifications failed and we have a customer phone, try WhatsApp fallback
    let whatsappFallbackResult = null;
    if (successCount === 0 && customerPhone) {
      try {
        console.log(
          "Push notifications failed, attempting WhatsApp fallback for:",
          customerPhone
        );

        // Get ticket details for better messaging
        const { data: ticketData } = await supabase
          .from("tickets")
          .select(
            `
            ticket_number,
            departments (
              name,
              branches (
                name,
                organizations (name)
              )
            )
          `
          )
          .eq("id", ticketId)
          .single();

        if (ticketData && ticketData.departments) {
          // Import the notification service
          const { notificationService } = await import("@/lib/notifications");

          const departmentData = ticketData.departments as any;
          const departmentName = departmentData.name;
          const organizationName =
            departmentData.branches?.organizations?.name || "Your Organization";

          // Send appropriate WhatsApp message based on notification type
          let whatsappSuccess = false;
          switch (notificationType) {
            case "ticket_created":
              whatsappSuccess = await notificationService.notifyTicketCreated(
                customerPhone,
                ticketData.ticket_number,
                departmentName,
                organizationName,
                0, // waitingCount - we don't have this info in admin context
                organizationId,
                ticketId
              );
              break;

            case "almost_your_turn":
              whatsappSuccess = await notificationService.notifyAlmostYourTurn(
                customerPhone,
                ticketData.ticket_number,
                departmentName,
                organizationName,
                "Previous ticket", // currentServing - generic fallback
                organizationId,
                ticketId
              );
              break;

            case "your_turn":
              whatsappSuccess = await notificationService.notifyYourTurn(
                customerPhone,
                ticketData.ticket_number,
                departmentName,
                organizationName,
                organizationId,
                ticketId
              );
              break;
          }

          whatsappFallbackResult = {
            attempted: true,
            success: whatsappSuccess,
            phone: customerPhone,
          };

          // Log WhatsApp attempt
          await logNotificationAttempt(
            organizationId,
            ticketId,
            customerPhone,
            ticketData.ticket_number,
            notificationType,
            "whatsapp",
            whatsappSuccess
          );

          console.log("WhatsApp fallback result:", whatsappFallbackResult);
        }
      } catch (whatsappError) {
        console.error("WhatsApp fallback error:", whatsappError);
        whatsappFallbackResult = {
          attempted: true,
          success: false,
          error:
            whatsappError instanceof Error
              ? whatsappError.message
              : "Unknown error",
        };
      }
    }

    if (successCount > 0) {
      return NextResponse.json(
        {
          success: true,
          message: `Push notification sent successfully`,
          results: {
            total: subscriptions.length,
            success: successCount,
            failed: failureCount,
            details: pushResults,
          },
          whatsappFallback: whatsappFallbackResult,
        },
        { headers: corsHeaders }
      );
    } else {
      return NextResponse.json(
        {
          success: whatsappFallbackResult?.success || false,
          message: whatsappFallbackResult?.success
            ? "Push notification failed, but WhatsApp fallback succeeded"
            : "All push notifications failed" +
              (whatsappFallbackResult?.attempted
                ? ", WhatsApp fallback also failed"
                : ""),
          shouldFallback: !whatsappFallbackResult?.success,
          results: {
            total: subscriptions.length,
            success: successCount,
            failed: failureCount,
            details: pushResults,
          },
          whatsappFallback: whatsappFallbackResult,
        },
        {
          status: whatsappFallbackResult?.success ? 200 : 500,
          headers: corsHeaders,
        }
      );
    }
  } catch (error) {
    console.error("Push notification API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Helper function to log notification attempts
 */
async function logNotificationAttempt(
  organizationId: string,
  ticketId: string,
  customerPhone: string | null, // Now optional
  ticketNumber: string,
  notificationType: string,
  deliveryMethod: string,
  success: boolean,
  errorMessage?: string
) {
  try {
    await supabase.from("notification_logs").insert({
      organization_id: organizationId,
      ticket_id: ticketId, // Use ticket ID as primary identifier
      customer_phone: customerPhone, // Optional
      ticket_number: ticketNumber,
      notification_type: notificationType,
      delivery_method: deliveryMethod,
      push_success: deliveryMethod === "push" ? success : null,
      push_error: deliveryMethod === "push" && !success ? errorMessage : null,
      whatsapp_success: deliveryMethod === "whatsapp" ? success : null,
      whatsapp_error:
        deliveryMethod === "whatsapp" && !success ? errorMessage : null,
    });
  } catch (error) {
    console.error("Failed to log notification attempt:", error);
  }
}
