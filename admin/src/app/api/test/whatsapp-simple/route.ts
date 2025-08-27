import { NextRequest, NextResponse } from "next/server";

/**
 * WhatsApp Direct Test (No Database)
 * POST /api/test/whatsapp-simple
 *
 * This endpoint tests WhatsApp messaging without database dependencies
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerPhone,
      ticketNumber = "TEST-001",
      departmentName = "Test Department",
      organizationName = "Test Organization",
    } = body;

    console.log("🔍 Simple WhatsApp Test Starting...");
    console.log("Customer Phone:", customerPhone);

    // Environment check
    const envCheck = {
      ULTRAMSG_INSTANCE_ID: process.env.ULTRAMSG_INSTANCE_ID || "MISSING",
      ULTRAMSG_TOKEN: !!process.env.ULTRAMSG_TOKEN,
      WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED,
    };
    console.log("Environment:", envCheck);

    // Test notification service import and direct call
    let testResult = null;
    let testError = null;

    try {
      const { notificationService } = await import("@/lib/notifications");
      console.log("✅ Notification service imported");

      const success = await notificationService.notifyYourTurn(
        customerPhone,
        ticketNumber,
        departmentName,
        organizationName,
        "test-org-id",
        "test-ticket-id"
      );

      testResult = {
        success,
        ticketNumber,
        departmentName,
        organizationName,
        customerPhone,
      };

      console.log("WhatsApp test result:", testResult);
    } catch (err) {
      testError = err instanceof Error ? err.message : String(err);
      console.error("❌ WhatsApp test error:", testError);
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      whatsappTest: {
        result: testResult,
        error: testError,
      },
    });
  } catch (error) {
    console.error("❌ Simple WhatsApp test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
