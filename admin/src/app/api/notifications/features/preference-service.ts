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
        .eq("customer_phone", phoneFormat) // Use customer_phone column, not phone
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
   * Handles three notification preferences: push, whatsapp, both
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

    // NEW LOGIC: Handle three cases - push, whatsapp, both
    // Customer chose "both" notifications
    if (
      preferences.push_enabled === true &&
      preferences.whatsapp_fallback === true
    ) {
      return {
        should: true,
        reason:
          "User selected 'both' - send WhatsApp regardless of push success",
      };
    }

    // Customer chose "whatsapp only"
    if (
      preferences.push_enabled === false &&
      preferences.whatsapp_fallback === true
    ) {
      return {
        should: true,
        reason: "User selected 'WhatsApp only' notifications",
      };
    }

    // Customer chose "push only" but push failed - emergency fallback
    if (
      preferences.push_enabled === true &&
      preferences.whatsapp_fallback === false &&
      pushSuccessCount === 0
    ) {
      return {
        should: true,
        reason: "Push-only user but push failed - emergency WhatsApp fallback",
      };
    }

    // Customer chose "push only" and push succeeded - no WhatsApp
    return {
      should: false,
      reason: "User selected 'push only' notifications",
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
    const now = new Date();

    const { data: sessions, error } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", cleanPhone) // Use phone_number column
      .eq("is_active", true)
      .gt("expires_at", now.toISOString())
      .limit(1);

    if (error) {
      console.error("Error checking WhatsApp session:", error);
      return false;
    }

    return sessions && sessions.length > 0;
  }
}
