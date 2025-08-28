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

      // First, get all active subscriptions for this phone
      const { data: phoneSubscriptions, error: phoneError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("customer_phone", cleanPhone)
        .eq("is_active", true);

      if (phoneError) {
        console.error("Error fetching phone subscriptions:", phoneError);
      }

      if (phoneSubscriptions && phoneSubscriptions.length > 0) {
        // Now check notification preferences for this phone
        const phoneFormats = [cleanPhone, `+${cleanPhone}`]; // Try both formats
        let preferences = null;

        for (const phoneFormat of phoneFormats) {
          const { data: prefs, error: prefError } = await supabase
            .from("notification_preferences")
            .select("push_enabled, push_denied")
            .eq("customer_phone", phoneFormat)
            .eq("organization_id", organizationId)
            .limit(1)
            .order("updated_at", { ascending: false });

          if (!prefError && prefs && prefs.length > 0) {
            preferences = prefs;
            break;
          }
        }

        // Filter subscriptions based on preferences
        if (preferences && preferences.length > 0) {
          const pref = preferences[0];

          if (!pref.push_enabled || pref.push_denied) {
            return { subscriptions: [] }; // Return empty array if push is disabled
          }
        }

        // Transform database format to expected format
        const transformedSubscriptions = phoneSubscriptions.map((sub) => ({
          ...sub,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        }));
        return { subscriptions: transformedSubscriptions };
      }
    }

    // Fallback to ticket-based lookup (legacy)

    const { data: ticketSubscriptions, error: ticketError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("ticket_id", ticketId)
      .eq("is_active", true);

    if (ticketError) {
      console.error("Error fetching ticket subscriptions:", ticketError);
    }

    if (ticketSubscriptions && ticketSubscriptions.length > 0) {
      console.log(
        `📱 Found ${ticketSubscriptions.length} active ticket-based push subscriptions`
      );

      // Check preferences for each subscription
      const filteredSubscriptions = [];
      for (const sub of ticketSubscriptions) {
        if (sub.customer_phone) {
          const cleanSubPhone = sub.customer_phone.replace(/^\+/, "");
          const phoneFormats = [
            sub.customer_phone,
            cleanSubPhone,
            `+${cleanSubPhone}`,
          ];

          let preferences = null;
          for (const phoneFormat of phoneFormats) {
            const { data: prefs } = await supabase
              .from("notification_preferences")
              .select("push_enabled, push_denied")
              .eq("customer_phone", phoneFormat)
              .eq("organization_id", organizationId)
              .limit(1)
              .order("updated_at", { ascending: false });

            if (prefs && prefs.length > 0) {
              preferences = prefs;
              break;
            }
          }

          if (preferences && preferences.length > 0) {
            const pref = preferences[0];
            if (pref.push_enabled && !pref.push_denied) {
              filteredSubscriptions.push(sub);
            }
          } else {
            // No preferences found, allow by default (legacy behavior)
            filteredSubscriptions.push(sub);
          }
        } else {
          // No phone number, allow by default (legacy behavior)
          filteredSubscriptions.push(sub);
        }
      }

      // Transform database format to expected format
      const transformedTicketSubscriptions = filteredSubscriptions.map(
        (sub) => ({
          ...sub,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        })
      );

      return {
        subscriptions: transformedTicketSubscriptions,
        error: ticketError,
      };
    }

    return {
      subscriptions: [],
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
    const { notificationType, organizationId, payload } = request;

    // Generate custom payload using templates and organization data
    let customPayload = payload;
    try {
      const { TemplateService } = await import("./template-service");
      const templatePayload =
        await TemplateService.generatePushNotificationPayload(
          notificationType,
          organizationId,
          request.ticketId
        );

      // Prioritize template payload for title/body, but keep other payload properties
      customPayload = {
        ...payload, // Keep other properties like data, badge, etc.
        ...templatePayload, // Override with template-generated title, body, and icon
      };
    } catch (error) {
      console.error(
        "⚠️ Error generating custom payload, using fallback:",
        error
      );
    }

    const pushPayload = {
      title: customPayload?.title || `Queue Update - ${notificationType}`,
      body: customPayload?.body || `Your queue status has been updated.`,
      icon: customPayload?.icon || "/favicon.svg",
      badge: customPayload?.badge || customPayload?.icon || "/favicon.svg",
      tag: notificationType,
      timestamp: Date.now(),
      data: {
        notificationType,
        organizationId,
        ...customPayload,
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
