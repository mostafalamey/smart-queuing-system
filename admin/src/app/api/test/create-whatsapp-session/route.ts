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

/**
 * Manually create WhatsApp session for testing
 * POST /api/test/create-whatsapp-session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, organizationId } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Format phone number (remove + if present)
    const formattedPhone = phone.startsWith("+") ? phone.substring(1) : phone;

    // Create session manually
    const session = await whatsappSessionService.createSession({
      phoneNumber: formattedPhone,
      organizationId: organizationId || "test-org",
      ticketId: undefined,
      customerName: undefined,
    });

    console.log("✅ Manual WhatsApp session created:", {
      phone: formattedPhone,
      organizationId,
      session,
    });

    return NextResponse.json(
      {
        success: true,
        message: "WhatsApp session created successfully",
        session: {
          phone: formattedPhone,
          organizationId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error creating manual WhatsApp session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Get active sessions for debugging
 * GET /api/test/create-whatsapp-session
 */
export async function GET() {
  try {
    // Test with the current user's phone
    const testPhone = "201015544028";
    const hasSession = await whatsappSessionService.hasActiveSession(testPhone);

    return NextResponse.json(
      {
        success: true,
        testPhone,
        hasActiveSession: hasSession,
        message: hasSession
          ? "Active session found for test phone"
          : "No active session for test phone",
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error checking session:", error);
    return NextResponse.json(
      { error: "Failed to check session" },
      { status: 500, headers: corsHeaders }
    );
  }
}
