// Message Templates for Queue System
// This file contains default message templates that can be customized by organizations

export interface MessageTemplateData {
  organizationName: string;
  ticketNumber: string;
  serviceName: string;
  departmentName: string;
  customerName?: string;
  estimatedWaitTime?: string;
  queuePosition?: number;
  totalInQueue?: number;
  currentlyServing?: string;
}

export interface MessageTemplates {
  ticketCreated: {
    whatsapp: string;
    push: {
      title: string;
      body: string;
    };
  };
  youAreNext: {
    whatsapp: string;
    push: {
      title: string;
      body: string;
    };
  };
  yourTurn: {
    whatsapp: string;
    push: {
      title: string;
      body: string;
    };
  };
}

// Default message templates
export const defaultMessageTemplates: MessageTemplates = {
  ticketCreated: {
    whatsapp: `🎉 *Welcome to {{organizationName}}!*

📋 *Ticket: {{ticketNumber}}*
🏢 Department: {{departmentName}}
🔧 Service: {{serviceName}}

📊 *Queue Status:*
• Position: {{queuePosition}} of {{totalInQueue}}
• Estimated wait: {{estimatedWaitTime}}
• Currently serving: {{currentlyServing}}

We'll notify you when it's your turn. Thank you for choosing us! ✨`,
    push: {
      title: "🎉 Ticket Created - {{organizationName}}",
      body: "Ticket {{ticketNumber}} for {{serviceName}}. Position {{queuePosition}} of {{totalInQueue}}. Est. wait: {{estimatedWaitTime}}",
    },
  },
  youAreNext: {
    whatsapp: `🔔 *You're Next!*

📋 *Ticket: {{ticketNumber}}*
🏢 {{organizationName}} - {{departmentName}}
🔧 {{serviceName}}

⏰ Please be ready! You'll be called shortly.

Currently serving: {{currentlyServing}}`,
    push: {
      title: "🔔 You're Next! - {{organizationName}}",
      body: "Ticket {{ticketNumber}} for {{serviceName}}. Please be ready!",
    },
  },
  yourTurn: {
    whatsapp: `🎯 *Your Turn Now!*

📋 *Ticket: {{ticketNumber}}*
🏢 {{organizationName}} - {{departmentName}}
🔧 {{serviceName}}

👆 Please proceed to the service counter immediately.

Thank you for waiting! 🙏`,
    push: {
      title: "🎯 Your Turn! - {{organizationName}}",
      body: "Ticket {{ticketNumber}} - Please proceed to {{departmentName}} counter now!",
    },
  },
};

// Template replacement function
export function processMessageTemplate(
  template: string,
  data: MessageTemplateData
): string {
  return template
    .replace(
      /\{\{organizationName\}\}/g,
      data.organizationName || "Our Organization"
    )
    .replace(/\{\{ticketNumber\}\}/g, data.ticketNumber || "N/A")
    .replace(/\{\{serviceName\}\}/g, data.serviceName || "Service")
    .replace(/\{\{departmentName\}\}/g, data.departmentName || "Department")
    .replace(/\{\{customerName\}\}/g, data.customerName || "Customer")
    .replace(/\{\{estimatedWaitTime\}\}/g, data.estimatedWaitTime || "N/A")
    .replace(/\{\{queuePosition\}\}/g, (data.queuePosition || 0).toString())
    .replace(/\{\{totalInQueue\}\}/g, (data.totalInQueue || 0).toString())
    .replace(/\{\{currentlyServing\}\}/g, data.currentlyServing || "N/A");
}

// Helper function to get queue statistics
export async function getQueueStatistics(
  serviceId: string,
  supabase: any
): Promise<{
  queuePosition: number;
  totalInQueue: number;
  currentlyServing: string;
  estimatedWaitTime: string;
}> {
  try {
    // Get total tickets in queue for this service
    const { data: allTickets, error: allTicketsError } = await supabase
      .from("tickets")
      .select("id, ticket_number, status, created_at")
      .eq("service_id", serviceId)
      .in("status", ["waiting", "serving"])
      .order("created_at", { ascending: true });

    if (allTicketsError) throw allTicketsError;

    const totalInQueue = allTickets?.length || 0;
    const waitingTickets =
      allTickets?.filter((t: any) => t.status === "waiting") || [];
    const servingTickets =
      allTickets?.filter((t: any) => t.status === "serving") || [];

    const queuePosition = waitingTickets.length;
    const currentlyServing =
      servingTickets.length > 0 ? servingTickets[0].ticket_number : "None";

    // Simple estimation: 5 minutes per person ahead in queue
    const estimatedMinutes = queuePosition * 5;
    const estimatedWaitTime =
      estimatedMinutes <= 0
        ? "Now"
        : estimatedMinutes < 60
        ? `${estimatedMinutes} min`
        : `${Math.round(estimatedMinutes / 60)} hr ${
            estimatedMinutes % 60
          } min`;

    return {
      queuePosition: queuePosition + 1, // +1 because this is the customer's position
      totalInQueue: totalInQueue + 1, // +1 to include the new ticket
      currentlyServing,
      estimatedWaitTime,
    };
  } catch (error) {
    console.error("Error getting queue statistics:", error);
    return {
      queuePosition: 1,
      totalInQueue: 1,
      currentlyServing: "N/A",
      estimatedWaitTime: "N/A",
    };
  }
}
