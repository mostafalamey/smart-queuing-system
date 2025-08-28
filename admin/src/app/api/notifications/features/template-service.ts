import {
  defaultMessageTemplates,
  processMessageTemplate,
  MessageTemplateData,
} from "../../../../../../shared/message-templates";
import { NotificationRequest, TicketData } from "./types";

export class TemplateService {
  /**
   * Generate WhatsApp message using templates
   */
  static generateWhatsAppMessage(
    notificationType: string,
    ticketData?: TicketData
  ): string {
    const templateData: MessageTemplateData =
      this.prepareTemplateData(ticketData);

    switch (notificationType) {
      case "ticket_created":
        return processMessageTemplate(
          defaultMessageTemplates.ticketCreated.whatsapp,
          templateData
        );

      case "almost_your_turn":
        return processMessageTemplate(
          defaultMessageTemplates.youAreNext.whatsapp,
          templateData
        );

      case "your_turn":
        return processMessageTemplate(
          defaultMessageTemplates.yourTurn.whatsapp,
          templateData
        );

      default:
        // Generic fallback for other notification types
        return `📋 Queue Update\n\nTicket: ${templateData.ticketNumber}\nDepartment: ${templateData.departmentName}\n\nYour queue status has been updated.`;
    }
  }

  /**
   * Generate fallback WhatsApp message for test tickets
   */
  static generateFallbackMessage(notificationType: string): string {
    const genericTemplateData: MessageTemplateData = {
      organizationName: "Your Organization",
      ticketNumber: "N/A",
      serviceName: "Service",
      departmentName: "Department",
      queuePosition: 1,
      totalInQueue: 1,
      estimatedWaitTime: "N/A",
      currentlyServing: "N/A",
    };

    switch (notificationType) {
      case "almost_your_turn":
        return processMessageTemplate(
          defaultMessageTemplates.youAreNext.whatsapp,
          genericTemplateData
        );

      case "your_turn":
        return processMessageTemplate(
          defaultMessageTemplates.yourTurn.whatsapp,
          genericTemplateData
        );

      case "ticket_created":
        return processMessageTemplate(
          defaultMessageTemplates.ticketCreated.whatsapp,
          genericTemplateData
        );

      default:
        return `🎫 Queue Update - Your ticket has been updated. Status: ${notificationType}. Please check your queue position.`;
    }
  }

  /**
   * Prepare template data from ticket information
   */
  private static prepareTemplateData(
    ticketData?: TicketData
  ): MessageTemplateData {
    if (!ticketData) {
      return {
        organizationName: "Your Organization",
        ticketNumber: "N/A",
        serviceName: "Service",
        departmentName: "Department",
        queuePosition: 1,
        totalInQueue: 1,
        estimatedWaitTime: "N/A",
        currentlyServing: "N/A",
      };
    }

    const departmentData = ticketData.departments as any;
    const departmentName = departmentData.name;
    const organizationName =
      departmentData.branches?.organizations?.name || "Your Organization";

    return {
      organizationName,
      ticketNumber: ticketData.ticket_number,
      serviceName: departmentName, // Using department as service for now
      departmentName,
      queuePosition: 1, // Default values - could be enhanced with real queue data
      totalInQueue: 1,
      estimatedWaitTime: "N/A",
      currentlyServing: "N/A",
    };
  }
}
