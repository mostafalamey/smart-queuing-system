import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { whatsappSessionService } from "@/lib/whatsapp-sessions";

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// CORS headers for webhook
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

interface InboundMessage {
  id: string;
  from: string; // Customer phone number
  to: string; // Company WhatsApp number
  body: string; // Message content
  type: string; // message type
  timestamp: number;
}

interface InboundWebhookPayload {
  token?: string; // Webhook auth token
  messages?: InboundMessage[]; // Array format (batch)
  // Individual message format (single webhook per message)
  id?: string;
  from?: string;
  to?: string;
  body?: string;
  type?: string;
  timestamp?: number;
}

/**
 * Handle inbound WhatsApp messages from UltraMessage webhook
 * POST /api/webhooks/ultramsg/inbound
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook is enabled
    if (process.env.ULTRAMSG_WEBHOOK_ENABLED !== "true") {
      console.log("UltraMessage webhook is disabled");
      return NextResponse.json(
        { error: "Webhook disabled" },
        { status: 503, headers: corsHeaders }
      );
    }

    const body: InboundWebhookPayload = await request.json();
    console.log(
      "Received UltraMessage webhook:",
      JSON.stringify(body, null, 2)
    );

    // Verify webhook token
    const expectedToken = process.env.ULTRAMSG_WEBHOOK_TOKEN;
    if (expectedToken && body.token !== expectedToken) {
      console.error("Invalid webhook token received");
      return NextResponse.json(
        { error: "Invalid webhook token" },
        { status: 401, headers: corsHeaders }
      );
    }

    // Process each message in the webhook
    const results = [];
    const messagesToProcess: InboundMessage[] = [];

    // Handle batch format (messages array)
    if (body.messages && Array.isArray(body.messages)) {
      messagesToProcess.push(...body.messages);
    }

    // Handle individual message format (single webhook per message)
    if (body.id && body.from && body.to && body.body) {
      messagesToProcess.push({
        id: body.id,
        from: body.from,
        to: body.to,
        body: body.body,
        type: body.type || "text",
        timestamp: body.timestamp || Date.now(),
      });
    }

    console.log(`Processing ${messagesToProcess.length} message(s)`);

    for (const message of messagesToProcess) {
      try {
        const result = await processInboundMessage(message, body);
        results.push(result);
      } catch (error) {
        console.error("Error processing message:", error);
        results.push({
          messageId: message.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Webhook processed successfully",
        results,
        processedMessages: results.length,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Process a single inbound WhatsApp message
 */
async function processInboundMessage(
  message: InboundMessage,
  webhookData: InboundWebhookPayload
) {
  const {
    id: messageId,
    from: customerPhone,
    to: companyPhone,
    body: messageContent,
    timestamp,
  } = message;

  console.log("Processing inbound message:", {
    messageId,
    customerPhone,
    messageContent: messageContent?.substring(0, 50) + "...",
  });

  // Clean phone number
  const cleanCustomerPhone = customerPhone.replace(/[^\d+]/g, "");

  // 1. Check if customer already has an active session
  const existingSession = await whatsappSessionService.getActiveSession(
    cleanCustomerPhone
  );

  if (existingSession) {
    // Extend existing session
    await whatsappSessionService.extendSession(cleanCustomerPhone);
    console.log("Extended existing WhatsApp session for", cleanCustomerPhone);

    // Log the message
    await logInboundMessage(
      cleanCustomerPhone,
      messageContent,
      existingSession.id,
      webhookData
    );

    // Check if this is the first message from customer (welcome message not sent yet)
    // Sessions created by customer app won't have received welcome message
    const messageCount = await getCustomerMessageCount(
      cleanCustomerPhone,
      existingSession.id
    );

    if (messageCount <= 1) {
      // This is the first actual message from customer - send welcome message
      console.log("First message from customer - sending welcome message");
      await sendWelcomeMessage(cleanCustomerPhone, existingSession.expiresAt);
    } else {
      // Send regular session extension acknowledgment
      await sendSessionExtensionMessage(
        cleanCustomerPhone,
        existingSession.expiresAt
      );
    }

    return {
      messageId,
      success: true,
      action: messageCount <= 1 ? "first_message_welcome" : "session_extended",
      sessionId: existingSession.id,
      customerPhone: cleanCustomerPhone,
    };
  } else {
    // Create new session
    const newSession = await whatsappSessionService.createSession({
      phoneNumber: cleanCustomerPhone,
    });

    if (!newSession) {
      throw new Error("Failed to create WhatsApp session");
    }

    console.log("Created new WhatsApp session for", cleanCustomerPhone);

    // Log the message
    await logInboundMessage(
      cleanCustomerPhone,
      messageContent,
      newSession.id,
      webhookData
    );

    // Try to associate with existing ticket if phone matches
    await tryAssociateWithTicket(cleanCustomerPhone, newSession.id);

    // Send welcome message
    await sendWelcomeMessage(cleanCustomerPhone, newSession.expiresAt);

    return {
      messageId,
      success: true,
      action: "session_created",
      sessionId: newSession.id,
      customerPhone: cleanCustomerPhone,
      expiresAt: newSession.expiresAt,
    };
  }
}

/**
 * Log inbound message to database
 */
async function logInboundMessage(
  phoneNumber: string,
  messageContent: string,
  sessionId: string,
  webhookData: InboundWebhookPayload
) {
  try {
    const { error } = await supabase.from("whatsapp_inbound_messages").insert({
      phone_number: phoneNumber,
      message_content: messageContent,
      session_id: sessionId,
      webhook_data: webhookData,
      processed: true,
    });

    if (error) {
      console.error("Error logging inbound message:", error);
    }
  } catch (error) {
    console.error("Error logging inbound message:", error);
  }
}

/**
 * Try to associate session with existing ticket by phone number
 */
async function tryAssociateWithTicket(phoneNumber: string, sessionId: string) {
  try {
    // Look for recent tickets with this phone number
    const { data: tickets, error } = await supabase
      .from("tickets")
      .select("id, ticket_number")
      .eq("customer_phone", phoneNumber)
      .eq("status", "waiting") // Only active tickets
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error looking for tickets:", error);
      return;
    }

    if (tickets && tickets.length > 0) {
      const ticket = tickets[0];
      await whatsappSessionService.associateWithTicket(phoneNumber, ticket.id);
      console.log(
        `Associated session ${sessionId} with ticket ${ticket.ticket_number}`
      );
    }
  } catch (error) {
    console.error("Error associating with ticket:", error);
  }
}

/**
 * Send welcome message to new WhatsApp session
 */
async function sendWelcomeMessage(phoneNumber: string, expiresAt: Date) {
  try {
    const expiryTime = expiresAt.toLocaleString();
    const welcomeMessage = `🎉 Thank you for contacting us!

You'll now receive WhatsApp notifications for the next 24 hours including:
✅ Ticket confirmations
✅ Queue position updates  
✅ "Almost your turn" alerts
✅ "Your turn" notifications

Your session is active until ${expiryTime}.

Need help? Reply anytime! 💬`;

    // Send via existing WhatsApp API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_ADMIN_URL}/api/notifications/whatsapp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber,
          message: welcomeMessage,
          notificationType: "welcome",
          organizationId: "webhook-system",
          ticketId: null,
        }),
      }
    );

    if (response.ok) {
      console.log("Welcome message sent to", phoneNumber);
    } else {
      console.error("Failed to send welcome message:", await response.text());
    }
  } catch (error) {
    console.error("Error sending welcome message:", error);
  }
}

/**
 * Send session extension acknowledgment
 */
async function sendSessionExtensionMessage(
  phoneNumber: string,
  expiresAt: Date
) {
  try {
    const expiryTime = expiresAt.toLocaleString();
    const extensionMessage = `✅ Your WhatsApp notification session has been extended!

Session now active until: ${expiryTime}

You'll continue receiving queue updates. Thanks! 💬`;

    // Send via existing WhatsApp API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_ADMIN_URL}/api/notifications/whatsapp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: phoneNumber,
          message: extensionMessage,
          notificationType: "session_extended",
          organizationId: "webhook-system",
          ticketId: null,
        }),
      }
    );

    if (response.ok) {
      console.log("Session extension message sent to", phoneNumber);
    } else {
      console.error(
        "Failed to send session extension message:",
        await response.text()
      );
    }
  } catch (error) {
    console.error("Error sending session extension message:", error);
  }
}

/**
 * Get count of messages from customer in this session
 */
async function getCustomerMessageCount(
  phoneNumber: string,
  sessionId: string
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("whatsapp_inbound_messages")
      .select("id", { count: "exact" })
      .eq("phone_number", phoneNumber)
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error counting customer messages:", error);
      return 1; // Default to 1 to trigger welcome message on error
    }

    return data?.length || 1;
  } catch (error) {
    console.error("Error in getCustomerMessageCount:", error);
    return 1; // Default to 1 to trigger welcome message on error
  }
}
