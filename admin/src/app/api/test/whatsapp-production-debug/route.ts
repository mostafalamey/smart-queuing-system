import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { whatsappSessionService } from "@/lib/whatsapp-sessions";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Production WhatsApp Debug Endpoint
 * GET /api/test/whatsapp-production-debug?phone=PHONE_NUMBER
 *
 * This endpoint helps debug WhatsApp issues in production
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testPhone = searchParams.get("phone") || "201015544028"; // Default test phone

    console.log("🔍 Production WhatsApp Debug for phone:", testPhone);

    // Step 1: Check environment variables
    const envCheck = {
      ULTRAMSG_INSTANCE_ID: process.env.ULTRAMSG_INSTANCE_ID
        ? "✅ SET"
        : "❌ MISSING",
      ULTRAMSG_TOKEN: process.env.ULTRAMSG_TOKEN ? "✅ SET" : "❌ MISSING",
      WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED,
      WHATSAPP_DEBUG: process.env.WHATSAPP_DEBUG,
      ULTRAMSG_BASE_URL:
        process.env.ULTRAMSG_BASE_URL || "https://api.ultramsg.com",
    };

    // Step 2: Check WhatsApp sessions for the phone
    const cleanPhone = testPhone.replace(/[\+\-\s]/g, "");
    console.log("🔍 Checking sessions for cleaned phone:", cleanPhone);

    const { data: sessions, error: sessionError } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", cleanPhone)
      .order("created_at", { ascending: false });

    // Step 3: Test session service
    let sessionServiceResult = false;
    try {
      sessionServiceResult = await whatsappSessionService.hasActiveSession(
        cleanPhone
      );
    } catch (sessionServiceError) {
      console.error("Session service error:", sessionServiceError);
    }

    // Step 4: Check recent tickets for this phone
    const { data: recentTickets, error: ticketError } = await supabase
      .from("tickets")
      .select(
        `
        id,
        ticket_number,
        customer_phone,
        status,
        created_at,
        departments (
          name,
          branches (
            name,
            organizations (name)
          )
        )
      `
      )
      .eq("customer_phone", cleanPhone)
      .order("created_at", { ascending: false })
      .limit(3);

    // Step 5: Test UltraMessage API connectivity
    let ultraMessageTest: any = { status: "not_tested" };
    if (
      envCheck.ULTRAMSG_INSTANCE_ID === "✅ SET" &&
      envCheck.ULTRAMSG_TOKEN === "✅ SET"
    ) {
      try {
        const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
        const baseUrl =
          process.env.ULTRAMSG_BASE_URL || "https://api.ultramsg.com";
        const testUrl = `${baseUrl}/${instanceId}/instance/status`;

        const response = await fetch(testUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        ultraMessageTest = {
          status: response.ok ? "✅ Connected" : "❌ Failed",
          httpStatus: response.status,
          url: testUrl,
        };
      } catch (ultraError) {
        ultraMessageTest = {
          status: "❌ Error",
          error:
            ultraError instanceof Error ? ultraError.message : "Unknown error",
        };
      }
    }

    return NextResponse.json({
      phone: testPhone,
      cleanedPhone: cleanPhone,
      timestamp: new Date().toISOString(),

      environment: envCheck,

      sessions: {
        count: sessions?.length || 0,
        sessions: sessions || [],
        sessionServiceResult,
        error: sessionError?.message,
      },

      recentTickets: {
        count: recentTickets?.length || 0,
        tickets: recentTickets || [],
        error: ticketError?.message,
      },

      ultraMessageConnectivity: ultraMessageTest,

      recommendations: [
        envCheck.WHATSAPP_ENABLED !== "true"
          ? "❗ Set WHATSAPP_ENABLED=true"
          : "✅ WhatsApp enabled",
        !sessions?.length
          ? "❗ No WhatsApp sessions found - customer needs to send message first"
          : "✅ Sessions exist",
        !sessionServiceResult
          ? "❗ No active session according to service"
          : "✅ Active session found",
        ultraMessageTest.status !== "✅ Connected"
          ? "❗ UltraMessage API connectivity issue"
          : "✅ UltraMessage connected",
      ],
    });
  } catch (error) {
    console.error("Production debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
