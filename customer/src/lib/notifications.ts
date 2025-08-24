import { logger } from "./logger";

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

  async sendWhatsAppMessage(data: NotificationData): Promise<boolean> {
    try {
      const message = this.formatMessage(data);

      logger.info("Sending WhatsApp message via admin API:", {
        phone: data.phone,
        type: data.type,
        ticketNumber: data.ticketNumber,
      });

      // Use the admin API route (cross-origin call)
      const adminBaseUrl =
        process.env.NEXT_PUBLIC_ADMIN_URL ||
        window.location.origin.replace("customer", "admin");
      const response = await fetch(
        `${adminBaseUrl}/api/notifications/whatsapp`,
        {
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
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
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
}

export const notificationService = NotificationService.getInstance();
