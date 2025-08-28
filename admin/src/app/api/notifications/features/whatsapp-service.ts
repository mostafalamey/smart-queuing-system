import { createClient } from "@supabase/supabase-js";
import { NotificationRequest, TicketData, WhatsAppResult } from "./types";
import { TemplateService } from "./template-service";
import { PushService } from "./push-service";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class WhatsAppService {
  /**
   * Send WhatsApp notification with template-based message
   */
  static async sendWhatsAppNotification(
    customerPhone: string,
    notificationType: string,
    organizationId: string,
    ticketId: string
  ): Promise<WhatsAppResult> {
    try {
      // Get ticket details for better messaging
      const { data: ticketData, error: ticketError } = await supabase
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

      let whatsappMessage: string;
      let fallbackUsed = false;

      if (ticketData && ticketData.departments) {
        // Use real ticket data for message generation
        whatsappMessage = TemplateService.generateWhatsAppMessage(
          notificationType,
          ticketData as any // Type conversion for Supabase response
        );
      } else {
        // Use fallback template for test tickets
        whatsappMessage =
          TemplateService.generateFallbackMessage(notificationType);
        fallbackUsed = true;
      }

      // Send via UltraMsg API
      const result = await this.sendViaUltraMsg(customerPhone, whatsappMessage);

      // Log the attempt
      if (ticketData) {
        await PushService.logNotificationAttempt(
          organizationId,
          ticketId,
          customerPhone,
          ticketData.ticket_number,
          notificationType,
          "whatsapp",
          result.success
        );
      }

      return {
        ...result,
        fallbackUsed,
      };
    } catch (error) {
      console.error("WhatsApp notification error:", error);
      return {
        attempted: true,
        success: false,
        phone: customerPhone,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send message via UltraMsg API
   */
  private static async sendViaUltraMsg(
    customerPhone: string,
    message: string
  ): Promise<WhatsAppResult> {
    try {
      const cleanPhone = customerPhone.replace(/^\+/, "");

      const ultraMsgResponse = await fetch(
        `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            token: process.env.ULTRAMSG_TOKEN!,
            to: `${cleanPhone}@c.us`,
            body: message,
          }),
        }
      );

      const ultraMsgResult = await ultraMsgResponse.json();
      const success = ultraMsgResult.sent === true;

      return {
        attempted: true,
        success,
        phone: customerPhone,
        messageId: ultraMsgResult.id,
        error: success
          ? undefined
          : ultraMsgResult.error || "Unknown UltraMsg error",
      };
    } catch (error) {
      return {
        attempted: true,
        success: false,
        phone: customerPhone,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  /**
   * Send via the fixed WhatsApp endpoint (alternative method)
   */
  static async sendViaFixedEndpoint(
    customerPhone: string,
    message: string,
    organizationId: string,
    ticketId: string,
    notificationType: string
  ): Promise<WhatsAppResult> {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_ADMIN_URL ||
          "https://smart-queue-admin.vercel.app";

      const whatsappUrl = `${baseUrl}/api/notifications/whatsapp-fixed`;

      const response = await fetch(whatsappUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: customerPhone,
          message,
          organizationId,
          ticketId,
          notificationType,
        }),
      });

      const result = await response.json();
      const success = response.ok && result.success;

      return {
        attempted: true,
        success,
        phone: customerPhone,
        messageId: result.messageId,
        error: success ? undefined : result.error || result.message,
      };
    } catch (error) {
      return {
        attempted: true,
        success: false,
        phone: customerPhone,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }
}
