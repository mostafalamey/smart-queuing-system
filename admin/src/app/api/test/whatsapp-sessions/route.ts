import { NextRequest, NextResponse } from "next/server";
import {
  whatsappSessionService,
  checkWhatsAppSessionStatus,
} from "@/lib/whatsapp-sessions";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
 * Test WhatsApp session management
 * GET /api/test/whatsapp-sessions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const organizationId = searchParams.get("organizationId");

    // Configuration check
    const config = {
      webhookEnabled: process.env.ULTRAMSG_WEBHOOK_ENABLED === "true",
      webhookTokenConfigured: !!process.env.ULTRAMSG_WEBHOOK_TOKEN,
      companyNumber: process.env.WHATSAPP_COMPANY_NUMBER || "Not configured",
      sessionDuration: process.env.WHATSAPP_SESSION_DURATION_HOURS || "24",
      whatsappEnabled: process.env.WHATSAPP_ENABLED === "true",
    };

    let phoneStatus = null;
    let organizationSessions = null;

    // Check specific phone if provided
    if (phone) {
      phoneStatus = await checkWhatsAppSessionStatus(phone);
    }

    // Get organization sessions if provided
    if (organizationId) {
      organizationSessions =
        await whatsappSessionService.getActiveSessionsForOrganization(
          organizationId
        );
    }

    // Cleanup expired sessions
    const cleanedCount = await whatsappSessionService.cleanupExpiredSessions();

    return NextResponse.json(
      {
        success: true,
        message: "WhatsApp session test completed",
        timestamp: new Date().toISOString(),
        configuration: config,
        phoneStatus,
        organizationSessions,
        cleanupResults: {
          expiredSessionsCleaned: cleanedCount,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("WhatsApp session test error:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Create test WhatsApp session
 * POST /api/test/whatsapp-sessions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, organizationId, ticketId, customerName, action } =
      body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    let result;

    switch (action) {
      case "create":
        result = await whatsappSessionService.createSession({
          phoneNumber,
          organizationId,
          ticketId,
          customerName,
        });
        break;

      case "extend":
        result = await whatsappSessionService.extendSession(phoneNumber);
        break;

      case "deactivate":
        result = await whatsappSessionService.deactivateSession(phoneNumber);
        break;

      case "check":
      default:
        result = await checkWhatsAppSessionStatus(phoneNumber);
        break;
    }

    return NextResponse.json(
      {
        success: true,
        action: action || "check",
        phoneNumber,
        result,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("WhatsApp session operation error:", error);
    return NextResponse.json(
      {
        error: "Operation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
