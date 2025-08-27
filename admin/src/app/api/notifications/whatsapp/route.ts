import { NextRequest, NextResponse } from "next/server";
import { whatsappSessionService } from "@/lib/whatsapp-sessions";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

interface WhatsAppMessageRequest {
  phone: string;
  message: string;
  organizationId: string;
  ticketId?: string;
  notificationType?: "ticket_created" | "almost_your_turn" | "your_turn";
}

interface UltraMessageResponse {
  sent: boolean;
  message: string;
  id?: string;
}

/**
 * Send WhatsApp message via UltraMessage API
 * POST /api/notifications/whatsapp
 *
 * Body:
 * {
 *   phone: string (with country code, e.g., "+1234567890"),
 *   message: string,
 *   organizationId: string,
 *   ticketId?: string,
 *   notificationType?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppMessageRequest = await request.json();
    const { phone, message, organizationId, ticketId, notificationType } = body;

    // Validate required fields
    if (!phone || !message || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: phone, message, organizationId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if WhatsApp is enabled
    const whatsappEnabled = process.env.WHATSAPP_ENABLED === "true";
    const isDebugMode = process.env.WHATSAPP_DEBUG === "true";

    console.log("🔧 WhatsApp API Request:", {
      phone: phone.substring(0, 5) + "****", // Hide full phone for privacy
      hasMessage: !!message,
      organizationId,
      ticketId,
      notificationType,
    });

    if (!whatsappEnabled) {
      console.log("WhatsApp is disabled, skipping message send");
      return NextResponse.json(
        {
          success: false,
          message: "WhatsApp notifications are disabled",
          debug: "Set WHATSAPP_ENABLED=true in environment variables",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Get UltraMessage configuration
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    const baseUrl = process.env.ULTRAMSG_BASE_URL || "https://api.ultramsg.com";

    console.log("🔧 WhatsApp Configuration:", {
      instanceId: instanceId || "MISSING",
      hasToken: !!token,
      baseUrl,
      whatsappEnabled,
      isDebugMode,
    });

    if (!instanceId || !token) {
      console.error("UltraMessage configuration missing");
      return NextResponse.json(
        { error: "WhatsApp API configuration incomplete" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Format phone number (remove + and ensure it starts with country code)
    const formattedPhone = phone.startsWith("+") ? phone.substring(1) : phone;

    // 🔒 INBOUND-FIRST COMPLIANCE CHECK
    // Verify that the customer has an active WhatsApp session before sending
    console.log("🔍 Checking WhatsApp session for:", formattedPhone);

    const hasActiveSession = await whatsappSessionService.hasActiveSession(
      formattedPhone,
      organizationId
    );

    if (!hasActiveSession) {
      console.log(
        "❌ No active WhatsApp session for",
        formattedPhone.substring(0, 5) + "****"
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "No active WhatsApp session - customer must send message first",
          reason: "no_active_session",
          compliance: "Inbound-first policy - prevents unsolicited messages",
          suggestion:
            "Customer needs to send WhatsApp message to activate session",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    console.log(
      "✅ Active WhatsApp session found for",
      formattedPhone.substring(0, 5) + "****"
    );

    if (isDebugMode) {
      console.log("🔍 WhatsApp Debug Mode - Would send message:", {
        phone: formattedPhone,
        message: message.substring(0, 100) + "...",
        organizationId,
        ticketId,
        notificationType,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Message sent successfully (DEBUG MODE)",
          debug: {
            phone: formattedPhone,
            messageLength: message.length,
            instanceId,
            endpoint: `${baseUrl}/${instanceId}/messages/chat`,
          },
        },
        { headers: corsHeaders }
      );
    }

    // Send message via UltraMessage API
    const ultraMessageUrl = `${baseUrl}/${instanceId}/messages/chat`;

    console.log("📱 Sending WhatsApp message via UltraMessage:", {
      phone: formattedPhone,
      endpoint: ultraMessageUrl,
      messageLength: message.length,
    });

    const response = await fetch(ultraMessageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: token,
        to: formattedPhone,
        body: message,
        priority: "1", // High priority
        referenceId: ticketId || `${organizationId}-${Date.now()}`,
      }),
    });

    const responseText = await response.text();
    let responseData: UltraMessageResponse;

    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse UltraMessage response:", responseText);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid response from WhatsApp service",
          details: responseText,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!response.ok) {
      console.error("UltraMessage API error:", {
        status: response.status,
        statusText: response.statusText,
        responseData,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to send WhatsApp message",
          details: responseData,
        },
        { status: response.status, headers: corsHeaders }
      );
    }

    // Check if message was sent successfully
    if (responseData.sent) {
      console.log("✅ WhatsApp message sent successfully:", {
        phone: formattedPhone,
        messageId: responseData.id,
        ticketId,
      });

      return NextResponse.json(
        {
          success: true,
          message: "WhatsApp message sent successfully",
          messageId: responseData.id,
          phone: formattedPhone,
        },
        { headers: corsHeaders }
      );
    } else {
      console.error("UltraMessage reported message not sent:", responseData);

      return NextResponse.json(
        {
          success: false,
          error: "Message was not sent",
          details: responseData.message || "Unknown error",
        },
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("WhatsApp API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Get WhatsApp service status
 * GET /api/notifications/whatsapp
 */
export async function GET() {
  try {
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    const whatsappEnabled = process.env.WHATSAPP_ENABLED === "true";
    const isDebugMode = process.env.WHATSAPP_DEBUG === "true";

    return NextResponse.json(
      {
        enabled: whatsappEnabled,
        debugMode: isDebugMode,
        configured: !!(instanceId && token),
        instanceId: instanceId || null,
        endpoint: instanceId ? `https://api.ultramsg.com/${instanceId}` : null,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get service status" },
      { status: 500, headers: corsHeaders }
    );
  }
}
