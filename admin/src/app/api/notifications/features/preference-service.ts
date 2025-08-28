import { createClient } from "@supabase/supabase-js";
import { NotificationPreferences } from "./types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class PreferenceService {
  /**
   * Get notification preferences for a user by phone number
   * Handles multiple records and phone format variations
   */
  static async getNotificationPreferences(
    customerPhone: string
  ): Promise<NotificationPreferences | null> {
    if (!customerPhone) return null;

    const cleanPhone = customerPhone.replace(/^\+/, "");
    const phoneFormats = [customerPhone, cleanPhone];

    for (const phoneFormat of phoneFormats) {
      const { data: phonePrefs, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("phone", phoneFormat)
        .limit(1)
        .order("created_at", { ascending: false });

      if (!error && phonePrefs && phonePrefs.length > 0) {
        return phonePrefs[0];
      }
    }

    return null;
  }

  /**
   * Check if WhatsApp should be sent based on user preferences and push results
   */
  static shouldSendWhatsApp(
    preferences: NotificationPreferences | null,
    pushSuccessCount: number,
    notificationType: string
  ): { should: boolean; reason: string } {
    // Skip WhatsApp for ticket_created to avoid duplicates (handled during session creation)
    if (notificationType === "ticket_created") {
      return {
        should: false,
        reason:
          "Skipping ticket_created WhatsApp (handled during session setup)",
      };
    }

    if (!preferences) {
      // Legacy behavior for tickets without preferences (fallback when push fails)
      return {
        should: pushSuccessCount === 0,
        reason: "Legacy fallback logic (no preferences found)",
      };
    }

    if (preferences.whatsapp_fallback === true) {
      // User explicitly wants WhatsApp notifications (either "whatsapp" only or "both")
      // This should ALWAYS send WhatsApp regardless of push success
      return {
        should: true,
        reason:
          "User opted for WhatsApp notifications (whatsapp_fallback=true)",
      };
    }

    if (
      preferences.push_enabled === true &&
      preferences.whatsapp_fallback === false &&
      pushSuccessCount === 0
    ) {
      // User wants ONLY push notifications but push failed - use WhatsApp as emergency fallback
      return {
        should: true,
        reason: "Emergency fallback: Push-only user but push failed",
      };
    }

    return {
      should: false,
      reason: "User only wants push notifications",
    };
  }

  /**
   * Check if there's an active WhatsApp session for the phone number
   */
  static async hasActiveWhatsAppSession(
    customerPhone: string
  ): Promise<boolean> {
    if (!customerPhone) return false;

    const cleanPhone = customerPhone.replace(/^\+/, "");

    const { data: sessions, error } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone", cleanPhone)
      .eq("is_active", true)
      .limit(1);

    if (error) {
      console.error("Error checking WhatsApp session:", error);
      return false;
    }

    return sessions && sessions.length > 0;
  }
}
