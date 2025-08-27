import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  bypassSessionCheck?: boolean; // TEMPORARY: For production debugging
}

interface UltraMessageResponse {
  sent: boolean;
  message: string;
  id?: string;
}

/**
 * PRODUCTION-FIXED WhatsApp API Route
 * POST /api/notifications/whatsapp-fixed
 *
 * This version includes extensive debugging and bypasses problematic checks temporarily
 */
export async function POST(request: NextRequest) {
  try {
    const body: WhatsAppMessageRequest = await request.json();
    const {
      phone,
      message,
      organizationId,
      ticketId,
      notificationType,
      bypassSessionCheck,
    } = body;

    console.log("🚀 FIXED WhatsApp API - Request received:", {
      phone: phone?.substring(0, 5) + "****",
      hasMessage: !!message,
      organizationId,
      ticketId,
      notificationType,
      bypassSessionCheck,
    });

    // Validate required fields
    if (!phone || !message || !organizationId) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields: phone, message, organizationId" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check WhatsApp configuration
    const whatsappEnabled = process.env.WHATSAPP_ENABLED === "true";
    const isDebugMode = process.env.WHATSAPP_DEBUG === "true";
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    const baseUrl = process.env.ULTRAMSG_BASE_URL || "https://api.ultramsg.com";

    console.log("🔧 Configuration check:", {
      whatsappEnabled,
      isDebugMode,
      hasInstanceId: !!instanceId,
      hasToken: !!token,
      baseUrl,
    });

    if (!whatsappEnabled) {
      console.log("❌ WhatsApp is disabled");
      return NextResponse.json(
        {
          success: false,
          message: "WhatsApp notifications are disabled",
          debug: "Set WHATSAPP_ENABLED=true in environment variables",
        },
        { status: 200, headers: corsHeaders }
      );
    }

    if (!instanceId || !token) {
      console.error("❌ UltraMessage configuration missing");
      return NextResponse.json(
        { error: "WhatsApp API configuration incomplete" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Format phone number
    const formattedPhone = phone.startsWith("+") ? phone.substring(1) : phone;
    const cleanPhone = formattedPhone.replace(/[\+\-\s]/g, "");

    console.log("📱 Phone formatting:", {
      original: phone,
      formatted: formattedPhone,
      cleaned: cleanPhone,
    });

    // SESSION CHECK - This is the likely problem area
    if (!bypassSessionCheck) {
      console.log("🔍 Performing session check for:", cleanPhone);

      try {
        const { data: sessions, error: sessionError } = await supabase
          .from("whatsapp_sessions")
          .select("id, phone_number, expires_at, is_active, organization_id")
          .eq("phone_number", cleanPhone)
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString());

        console.log("🔍 Session query result:", {
          sessions: sessions?.length || 0,
          error: sessionError?.message,
          sessionsData: sessions,
        });

        if (!sessions || sessions.length === 0) {
          console.log("❌ No active session found for", cleanPhone);
          return NextResponse.json(
            {
              success: false,
              message:
                "No active WhatsApp session - customer must send message first",
              reason: "no_active_session",
              sessionCheck: {
                phone: cleanPhone,
                queriedAt: new Date().toISOString(),
                found: 0,
              },
              debug: {
                suggestion:
                  "Customer needs to send WhatsApp message to activate session",
                compliance:
                  "Inbound-first policy - prevents unsolicited messages",
              },
            },
            { status: 200, headers: corsHeaders }
          );
        }

        console.log("✅ Active session found:", sessions[0]);
      } catch (sessionCheckError) {
        console.error("❌ Session check failed:", sessionCheckError);

        // In case of session check error, we'll continue but log it
        console.log(
          "⚠️ Session check failed, but continuing with message send"
        );
      }
    } else {
      console.log("⚠️ BYPASSING session check for debugging");
    }

    // Debug mode response
    if (isDebugMode) {
      console.log("🔍 Debug mode - simulating message send");
      return NextResponse.json(
        {
          success: true,
          message: "Message sent successfully (DEBUG MODE)",
          debug: {
            phone: cleanPhone,
            messageLength: message.length,
            instanceId,
            endpoint: `${baseUrl}/${instanceId}/messages/chat`,
            sessionCheck: bypassSessionCheck ? "BYPASSED" : "PERFORMED",
          },
        },
        { headers: corsHeaders }
      );
    }

    // Send message via UltraMessage API
    const ultraMessageUrl = `${baseUrl}/${instanceId}/messages/chat`;

    console.log("📱 Sending to UltraMessage:", {
      url: ultraMessageUrl,
      phone: cleanPhone,
      messageLength: message.length,
    });

    const response = await fetch(ultraMessageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        token: token,
        to: cleanPhone,
        body: message,
        priority: "1",
        referenceId: ticketId || `${organizationId}-${Date.now()}`,
      }),
    });

    console.log("📱 UltraMessage response:", {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    const responseText = await response.text();
    console.log("📱 UltraMessage response body:", responseText);

    let responseData: UltraMessageResponse;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Failed to parse UltraMessage response:", responseText);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid response from WhatsApp service",
          details: responseText,
          debug: {
            parseError:
              parseError instanceof Error
                ? parseError.message
                : "Unknown parse error",
            rawResponse: responseText,
          },
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!response.ok) {
      console.error("❌ UltraMessage API error:", {
        status: response.status,
        statusText: response.statusText,
        responseData,
      });

      return NextResponse.json(
        {
          success: false,
          error: "Failed to send WhatsApp message",
          details: responseData,
          httpStatus: response.status,
        },
        { status: response.status, headers: corsHeaders }
      );
    }

    // Check if message was sent successfully
    if (responseData.sent) {
      console.log("✅ WhatsApp message sent successfully:", {
        phone: cleanPhone,
        messageId: responseData.id,
        ticketId,
      });

      return NextResponse.json(
        {
          success: true,
          message: "WhatsApp message sent successfully",
          messageId: responseData.id,
          phone: cleanPhone,
          debug: {
            bypassedSessionCheck: !!bypassSessionCheck,
            notificationType,
            ticketId,
          },
        },
        { headers: corsHeaders }
      );
    } else {
      console.error("❌ UltraMessage reported message not sent:", responseData);

      return NextResponse.json(
        {
          success: false,
          error: "Message was not sent",
          details: responseData.message || "Unknown error",
          sent: responseData.sent,
        },
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("❌ WhatsApp Fixed API error:", error);
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
 * Get WhatsApp service status (same as original)
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
        version: "PRODUCTION_FIXED",
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
