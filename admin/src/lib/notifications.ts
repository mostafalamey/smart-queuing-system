import { logger } from "@/lib/logger";
import { whatsappSessionService } from "@/lib/whatsapp-sessions";

interface NotificationData {
  phone: string;
  ticketNumber: string;
  departmentName: string;
  organizationName: string;
  type: "ticket_created" | "almost_your_turn" | "your_turn";
  currentServing?: string;
  waitingCount?: number;
  organizationId?: string;
  ticketId?: string;
}

class NotificationService {
  private static instance: NotificationService;
  private isEnabled: boolean = true;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Enhanced WhatsApp message sending with session checking
   */
  async sendWhatsAppMessage(data: NotificationData): Promise<boolean> {
    try {
      console.log(
        "🔍 NotificationService: Checking session for phone:",
        data.phone
      );

      // 1. Check if customer has active WhatsApp session
      // Temporarily remove organization ID matching for production stability
      const hasActiveSession = await whatsappSessionService.hasActiveSession(
        data.phone
        // data.organizationId // Temporarily removed for production
      );

      console.log(
        "🔍 NotificationService: hasActiveSession result:",
        hasActiveSession
      );

      if (!hasActiveSession) {
        logger.info(
          "No active WhatsApp session found - skipping WhatsApp notification",
          {
            phone: data.phone,
            type: data.type,
            ticketNumber: data.ticketNumber,
          }
        );

        // Log attempt for analytics
        await this.logNotificationAttempt({
          phone: data.phone,
          ticketId: data.ticketId,
          method: "whatsapp",
          success: false,
          reason: "no_active_session",
          notificationType: data.type,
        });

        return false;
      }

      // 2. Session is active, proceed with sending
      const message = this.formatMessage(data);

      console.log(
        "✅ NotificationService: Active session found, sending message:",
        {
          phone: data.phone,
          message: message.substring(0, 100) + "...",
        }
      );

      logger.info("Sending WhatsApp message (session verified):", {
        phone: data.phone,
        type: data.type,
        ticketNumber: data.ticketNumber,
      });

      // Use absolute URL for API calls in production (Vercel serverless environment)
      // Relative URLs don't work reliably between serverless functions
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXT_PUBLIC_ADMIN_URL ||
          "https://smart-queue-admin.vercel.app";
      const apiUrl = `${baseUrl}/api/notifications/whatsapp`;

      console.log("🔍 NotificationService: Calling WhatsApp API at:", apiUrl);
      console.log("🔍 NotificationService: Request payload:", {
        phone: data.phone,
        messageLength: message.length,
        organizationId: data.organizationId || "unknown",
        ticketId: data.ticketId,
        notificationType: data.type,
      });

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: data.phone,
          message: message,
          organizationId: data.organizationId || "unknown",
          ticketId: data.ticketId,
          notificationType: data.type,
        }),
      });

      const result = await response.json();

      console.log("🔍 NotificationService: WhatsApp API response:", {
        ok: response.ok,
        status: response.status,
        success: result.success,
        message: result.message,
        error: result.error,
      });

      if (!response.ok || !result.success) {
        console.error("❌ NotificationService: WhatsApp API error:", result);
        logger.error("WhatsApp API error:", result);
        return false;
      }

      logger.info("WhatsApp message sent successfully:", {
        phone: data.phone,
        messageId: result.messageId,
        ticketNumber: data.ticketNumber,
      });

      return true;
    } catch (error) {
      logger.error("Failed to send WhatsApp message:", error);
      return false;
    }
  }

  private formatMessage(data: NotificationData): string {
    const {
      ticketNumber,
      departmentName,
      organizationName,
      type,
      currentServing,
      waitingCount,
    } = data;

    switch (type) {
      case "ticket_created":
        return `🎫 Welcome to ${organizationName}!

Your ticket number: *${ticketNumber}*
Department: ${departmentName}

${
  waitingCount
    ? `There are ${waitingCount} customers ahead of you.`
    : "You'll be called soon!"
}

Please keep this message for reference. We'll notify you when it's almost your turn.

Thank you for choosing ${organizationName}! 🙏`;

      case "almost_your_turn":
        return `⏰ Almost your turn at ${organizationName}!

Your ticket: *${ticketNumber}*
Currently serving: ${currentServing}

You're next! Please be ready at the ${departmentName} counter.

Thank you for your patience! 🙏`;

      case "your_turn":
        return `🔔 It's your turn!

Ticket: *${ticketNumber}*
Please proceed to: ${departmentName}

Thank you for choosing ${organizationName}! 🙏`;

      default:
        return `Update for ticket ${ticketNumber} at ${organizationName}`;
    }
  }

  // Helper method to send ticket creation notification
  async notifyTicketCreated(
    phone: string,
    ticketNumber: string,
    departmentName: string,
    organizationName: string,
    waitingCount: number,
    organizationId?: string,
    ticketId?: string
  ): Promise<boolean> {
    return this.sendWhatsAppMessage({
      phone,
      ticketNumber,
      departmentName,
      organizationName,
      type: "ticket_created",
      waitingCount,
      organizationId,
      ticketId,
    });
  }

  // Helper method to send "almost your turn" notification
  async notifyAlmostYourTurn(
    phone: string,
    ticketNumber: string,
    departmentName: string,
    organizationName: string,
    currentServing: string,
    organizationId?: string,
    ticketId?: string
  ): Promise<boolean> {
    return this.sendWhatsAppMessage({
      phone,
      ticketNumber,
      departmentName,
      organizationName,
      type: "almost_your_turn",
      currentServing,
      organizationId,
      ticketId,
    });
  }

  // Helper method to send "your turn" notification
  async notifyYourTurn(
    phone: string,
    ticketNumber: string,
    departmentName: string,
    organizationName: string,
    organizationId?: string,
    ticketId?: string
  ): Promise<boolean> {
    return this.sendWhatsAppMessage({
      phone,
      ticketNumber,
      departmentName,
      organizationName,
      type: "your_turn",
      organizationId,
      ticketId,
    });
  }

  /**
   * Log notification attempt for analytics
   */
  private async logNotificationAttempt(data: {
    phone: string;
    ticketId?: string;
    method: string;
    success: boolean;
    reason?: string;
    notificationType?: string;
  }): Promise<void> {
    try {
      logger.info("Notification attempt logged", {
        phone: data.phone,
        method: data.method,
        success: data.success,
        reason: data.reason,
        type: data.notificationType,
      });

      // Future: Store in database for analytics
      // await supabase.from('notification_logs').insert({
      //   phone_number: data.phone,
      //   ticket_id: data.ticketId,
      //   method: data.method,
      //   success: data.success,
      //   error_message: data.reason,
      //   notification_type: data.notificationType
      // });
    } catch (error) {
      logger.error("Failed to log notification attempt:", error);
    }
  }

  /**
   * Check WhatsApp session status for a phone number
   */
  async checkWhatsAppSessionStatus(phoneNumber: string): Promise<{
    hasActiveSession: boolean;
    expiresAt?: Date;
    timeRemaining?: number;
  }> {
    try {
      const hasActive = await whatsappSessionService.hasActiveSession(
        phoneNumber
      );

      if (hasActive) {
        const session = await whatsappSessionService.getActiveSession(
          phoneNumber
        );
        return {
          hasActiveSession: true,
          expiresAt: session?.expiresAt,
          timeRemaining: session ? session.expiresAt.getTime() - Date.now() : 0,
        };
      }

      return { hasActiveSession: false };
    } catch (error) {
      logger.error("Error checking WhatsApp session status:", error);
      return { hasActiveSession: false };
    }
  }
}

export const notificationService = NotificationService.getInstance();
