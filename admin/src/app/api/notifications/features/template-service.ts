import {
  defaultMessageTemplates,
  processMessageTemplate,
  MessageTemplateData,
} from "../../../../../../shared/message-templates";
import { NotificationRequest, TicketData } from "./types";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class TemplateService {
  /**
   * Load custom templates and organization data
   */
  static async loadOrganizationData(organizationId: string) {
    try {
      // Load organization data including logo
      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, logo_url")
        .eq("id", organizationId)
        .single();

      if (orgError) {
        console.error("Error loading organization:", orgError);
      }

      // Load custom templates
      const { data: templateData, error: templateError } = await supabase
        .from("message_templates")
        .select("templates")
        .eq("organization_id", organizationId)
        .single();

      if (templateError) {
        console.error("Error loading custom templates:", templateError);
      }

      // Organization data and templates loaded successfully

      return {
        organization: organization || null,
        customTemplates: templateData?.templates || null,
      };
    } catch (error) {
      console.error("Error in loadOrganizationData:", error);
      return {
        organization: null,
        customTemplates: null,
      };
    }
  }

  /**
   * Generate push notification payload with custom templates and logo
   */
  static async generatePushNotificationPayload(
    notificationType: string,
    organizationId: string,
    ticketId?: string
  ): Promise<{ title: string; body: string; icon?: string }> {
    // Load organization data and custom templates
    const { organization, customTemplates } = await this.loadOrganizationData(
      organizationId
    );

    // Try to load ticket data if ticketId is provided
    let ticketData: TicketData | undefined;
    if (ticketId) {
      ticketData = await this.loadTicketData(ticketId);
    }

    const templateData: MessageTemplateData = this.prepareTemplateData(
      ticketData,
      organization?.name
    );

    // Use custom templates if available, otherwise fall back to defaults
    let template;

    switch (notificationType) {
      case "ticket_created":
        template =
          customTemplates?.ticketCreated?.push ||
          defaultMessageTemplates.ticketCreated.push;
        break;
      case "almost_your_turn":
        template =
          customTemplates?.youAreNext?.push ||
          defaultMessageTemplates.youAreNext.push;
        break;
      case "your_turn":
        template =
          customTemplates?.yourTurn?.push ||
          defaultMessageTemplates.yourTurn.push;
        break;
      default:
        template = {
          title: "Queue Update - {{organizationName}}",
          body: "Your queue status has been updated.",
        };
    }

    // Process template with organization logo
    const finalPayload = {
      title: processMessageTemplate(template.title, templateData),
      body: processMessageTemplate(template.body, templateData),
      icon: organization?.logo_url || "/favicon.svg",
    };

    return finalPayload;
  }

  /**
   * Load ticket data from database
   */
  static async loadTicketData(
    ticketId: string
  ): Promise<TicketData | undefined> {
    try {
      const { data: ticketData, error } = await supabase
        .from("tickets")
        .select(
          `
          ticket_number,
          departments!inner (
            name,
            branches!inner (
              name,
              organizations!inner (
                name
              )
            )
          )
        `
        )
        .eq("id", ticketId)
        .single();

      if (error) {
        console.error("Error loading ticket data:", error);
        return undefined;
      }

      console.log("🎫 Raw ticket data from database:", ticketData);

      // Handle the database structure correctly - departments can be object or array
      if (ticketData) {
        let dept: any, branch: any, org: any;

        // Handle departments as object (direct relation) or array (joined relation)
        if (
          Array.isArray(ticketData.departments) &&
          ticketData.departments.length > 0
        ) {
          // Array format from joined query
          dept = ticketData.departments[0];
          branch =
            Array.isArray(dept.branches) && dept.branches.length > 0
              ? dept.branches[0]
              : null;
          org =
            branch &&
            Array.isArray(branch.organizations) &&
            branch.organizations.length > 0
              ? branch.organizations[0]
              : null;
        } else if (
          ticketData.departments &&
          typeof ticketData.departments === "object"
        ) {
          // Object format from joined query
          dept = ticketData.departments as any;
          branch =
            dept.branches && typeof dept.branches === "object"
              ? dept.branches
              : null;
          org =
            branch &&
            branch.organizations &&
            typeof branch.organizations === "object"
              ? branch.organizations
              : null;
        }

        if (dept && dept.name) {
          const processedTicketData = {
            ticket_number: ticketData.ticket_number,
            departments: {
              name: dept.name,
              branches: {
                name: branch?.name || "Main Branch",
                organizations: {
                  name: org?.name || "Organization",
                },
              },
            },
          } as TicketData;

          return processedTicketData;
        }
      }

      return undefined;
    } catch (error) {
      console.error("Error in loadTicketData:", error);
      return undefined;
    }
  }

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
    ticketData?: TicketData,
    organizationName?: string
  ): MessageTemplateData {
    if (!ticketData) {
      return {
        organizationName: organizationName || "Your Organization",
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
    const departmentName = departmentData?.name || "Department";
    const orgName =
      organizationName ||
      departmentData?.branches?.organizations?.name ||
      "Your Organization";

    return {
      organizationName: orgName,
      ticketNumber: ticketData.ticket_number || "N/A",
      serviceName: departmentName, // Using department as service for now
      departmentName,
      queuePosition: 1, // Default values - could be enhanced with real queue data
      totalInQueue: 1,
      estimatedWaitTime: "N/A",
      currentlyServing: "N/A",
    };
  }
}
