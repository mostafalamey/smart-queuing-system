import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { PushSubscription, PushResult, NotificationRequest } from "./types";

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

export class PushService {
  /**
   * Get active push subscriptions for a request
   */
  static async getActiveSubscriptions(request: NotificationRequest): Promise<{
    subscriptions: PushSubscription[];
    error?: any;
  }> {
    const { organizationId, ticketId, customerPhone } = request;

    // Try phone-based lookup first (new system)
    if (customerPhone) {
      const cleanPhone = customerPhone.replace(/^\+/, "");

      const { data: phoneSubscriptions, error: phoneError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("phone", cleanPhone)
        .eq("is_active", true);

      if (!phoneError && phoneSubscriptions && phoneSubscriptions.length > 0) {
        return { subscriptions: phoneSubscriptions };
      }
    }

    // Fallback to ticket-based lookup (legacy)
    const { data: ticketSubscriptions, error: ticketError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("ticket_id", ticketId)
      .eq("is_active", true);

    return {
      subscriptions: ticketSubscriptions || [],
      error: ticketError,
    };
  }

  /**
   * Send push notifications to all active subscriptions
   */
  static async sendPushNotifications(
    subscriptions: PushSubscription[],
    request: NotificationRequest
  ): Promise<{
    results: PushResult[];
    successCount: number;
    failureCount: number;
  }> {
    const { notificationType, payload } = request;

    const pushPayload = {
      title: payload?.title || `Queue Update - ${notificationType}`,
      body: payload?.body || `Your queue status has been updated.`,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: notificationType,
      timestamp: Date.now(),
      data: {
        notificationType,
        ...payload,
      },
    };

    const results: PushResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    const pushPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          JSON.stringify(pushPayload)
        );

        successCount++;
        results.push({
          success: true,
          endpoint: subscription.endpoint.substring(0, 50) + "...",
        });
      } catch (error) {
        failureCount++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        results.push({
          success: false,
          error: errorMessage,
          endpoint: subscription.endpoint.substring(0, 50) + "...",
        });

        // Deactivate invalid subscriptions
        if (errorMessage.includes("410") || errorMessage.includes("invalid")) {
          await this.deactivateSubscription(subscription.id);
        }
      }
    });

    await Promise.all(pushPromises);

    return { results, successCount, failureCount };
  }

  /**
   * Deactivate an invalid subscription
   */
  private static async deactivateSubscription(
    subscriptionId: string
  ): Promise<void> {
    try {
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("id", subscriptionId);
    } catch (error) {
      console.error("Error deactivating subscription:", error);
    }
  }

  /**
   * Log notification attempt for analytics
   */
  static async logNotificationAttempt(
    organizationId: string,
    ticketId: string,
    phone: string,
    ticketNumber: string,
    notificationType: string,
    channel: "push" | "whatsapp",
    success: boolean
  ): Promise<void> {
    try {
      await supabase.from("notification_logs").insert({
        organization_id: organizationId,
        ticket_id: ticketId,
        phone: phone,
        ticket_number: ticketNumber,
        notification_type: notificationType,
        channel: channel,
        success: success,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error logging notification attempt:", error);
    }
  }
}
