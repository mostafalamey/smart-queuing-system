import { NextRequest, NextResponse } from "next/server";
import {
  ValidationService,
  PreferenceService,
  PushService,
  WhatsAppService,
  NotificationRequest,
  NotificationResponse,
  NotificationError,
} from "../features";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Main notification handler
export async function POST(
  request: NextRequest
): Promise<NextResponse<NotificationResponse | NotificationError>> {
  try {
    // 1. Parse and validate request
    const body = await ValidationService.parseRequestBody(request);
    const validation = ValidationService.validateRequest(body);

    if (!validation.isValid) {
      return NextResponse.json(validation.error!, {
        status: 400,
        headers: corsHeaders,
      });
    }

    const notificationRequest = validation.data!;

    // 2. Get user notification preferences
    const preferences = await PreferenceService.getNotificationPreferences(
      notificationRequest.customerPhone!
    );

    // 3. Send push notifications
    const { subscriptions, error: subscriptionError } =
      await PushService.getActiveSubscriptions(notificationRequest);

    if (subscriptionError) {
      return handleSubscriptionError(subscriptionError, corsHeaders);
    }

    let pushResults = {
      results: [] as any[],
      successCount: 0,
      failureCount: 0,
    };

    if (subscriptions.length > 0) {
      pushResults = await PushService.sendPushNotifications(
        subscriptions,
        notificationRequest
      );
    }

    // 4. Determine if WhatsApp should be sent
    const whatsappDecision = PreferenceService.shouldSendWhatsApp(
      preferences,
      pushResults.successCount,
      notificationRequest.notificationType
    );

    // 5. Send WhatsApp if needed (with session verification)
    let whatsappResult = null;
    if (whatsappDecision.should && notificationRequest.customerPhone) {
      // Check if customer has an active WhatsApp session
      const hasActiveSession = await PreferenceService.hasActiveWhatsAppSession(
        notificationRequest.customerPhone
      );

      if (hasActiveSession) {
        whatsappResult = await WhatsAppService.sendWhatsAppNotification(
          notificationRequest.customerPhone,
          notificationRequest.notificationType,
          notificationRequest.organizationId,
          notificationRequest.ticketId
        );

        if (!whatsappResult.success) {
          console.error("📲 WhatsApp failure details:", {
            error: whatsappResult.error,
            attempted: whatsappResult.attempted,
            phone: whatsappResult.phone,
            messageId: whatsappResult.messageId,
            fallbackUsed: whatsappResult.fallbackUsed,
            fullResult: whatsappResult,
          });
        }
      } else {
        whatsappResult = {
          success: false,
          attempted: false,
          reason: "no_active_session",
          message:
            "Customer needs to send WhatsApp message first to enable notifications",
        };
      }
    }

    // 6. Return appropriate response
    const overallSuccess =
      pushResults.successCount > 0 || whatsappResult?.success === true;

    if (overallSuccess) {
      return NextResponse.json(
        {
          success: true,
          message: getSuccessMessage(pushResults.successCount, whatsappResult),
          results: {
            total: subscriptions.length,
            success: pushResults.successCount,
            failed: pushResults.failureCount,
            details: pushResults.results,
          },
          whatsappFallback: whatsappResult || undefined,
        },
        { headers: corsHeaders }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: getFailureMessage(subscriptions.length, whatsappResult),
          shouldFallback: true,
          results:
            subscriptions.length > 0
              ? {
                  total: subscriptions.length,
                  success: pushResults.successCount,
                  failed: pushResults.failureCount,
                  details: pushResults.results,
                }
              : undefined,
          whatsappFallback: whatsappResult || undefined,
        },
        { headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Notification processing error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

// Helper functions
function handleSubscriptionError(
  error: any,
  corsHeaders: Record<string, string>
) {
  console.error("Error fetching subscriptions:", error);

  // Check if this is a "table doesn't exist" error (migration not run)
  if (
    error.code === "PGRST204" ||
    error.message?.includes("does not exist") ||
    error.message?.includes("push_subscriptions")
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
      details: error.message,
    },
    { status: 500, headers: corsHeaders }
  );
}

function getSuccessMessage(
  pushSuccessCount: number,
  whatsappResult: any
): string {
  if (pushSuccessCount > 0 && whatsappResult?.success) {
    return "Both push and WhatsApp notifications sent successfully";
  } else if (pushSuccessCount > 0) {
    return "Push notification sent successfully";
  } else if (whatsappResult?.success) {
    return whatsappResult.fallbackUsed
      ? "WhatsApp notification sent successfully (fallback mode)"
      : "WhatsApp notification sent successfully";
  }
  return "Notification processed";
}

function getFailureMessage(
  subscriptionCount: number,
  whatsappResult: any
): string {
  if (subscriptionCount > 0) {
    return whatsappResult?.success
      ? "Push notification failed, but WhatsApp fallback succeeded"
      : "All push notifications failed" +
          (whatsappResult?.attempted ? ", WhatsApp fallback also failed" : "");
  } else {
    return whatsappResult?.success
      ? "WhatsApp notification sent successfully (no push subscriptions found)"
      : "No active subscriptions found";
  }
}
