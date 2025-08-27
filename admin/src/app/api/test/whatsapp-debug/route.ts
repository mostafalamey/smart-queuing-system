import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * WhatsApp Direct Test Endpoint
 * POST /api/test/whatsapp-debug
 *
 * This endpoint tests the WhatsApp notification service directly
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerPhone, ticketId } = body;

    console.log("🔍 WhatsApp Debug Test Starting...");
    console.log("Customer Phone:", customerPhone);
    console.log("Ticket ID:", ticketId);

    // Test 1: Check environment variables
    const envCheck = {
      ULTRAMSG_INSTANCE_ID: !!process.env.ULTRAMSG_INSTANCE_ID,
      ULTRAMSG_TOKEN: !!process.env.ULTRAMSG_TOKEN,
      WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED,
    };
    console.log("Environment check:", envCheck);

    // Test 2: Try to import notification service
    let notificationServiceError = null;
    let notificationService = null;
    try {
      const importResult = await import("@/lib/notifications");
      notificationService = importResult.notificationService;
      console.log("✅ Notification service imported successfully");
    } catch (importError) {
      notificationServiceError =
        importError instanceof Error
          ? importError.message
          : String(importError);
      console.error(
        "❌ Failed to import notification service:",
        notificationServiceError
      );
    }

    // Test 3: Get ticket data
    let ticketData = null;
    let ticketError = null;
    if (ticketId) {
      try {
        const { data, error } = await supabase
          .from("tickets")
          .select(
            `
            ticket_number,
            departments (
              name,
              branches (
                name,
                organizations (name)
              )
            )
          `
          )
          .eq("id", ticketId)
          .single();

        ticketData = data;
        ticketError = error;
        console.log("Ticket data fetched:", !!ticketData);
        if (ticketError) console.error("Ticket fetch error:", ticketError);
      } catch (err) {
        ticketError = err instanceof Error ? err.message : String(err);
        console.error("❌ Ticket fetch exception:", ticketError);
      }
    }

    // Test 4: Try WhatsApp notification if everything is available
    let whatsappResult = null;
    let whatsappError = null;
    if (notificationService && ticketData && customerPhone) {
      try {
        console.log("🚀 Attempting WhatsApp notification...");
        const departmentData = ticketData.departments as any;
        const departmentName = departmentData?.name || "Unknown Department";
        const organizationName =
          departmentData?.branches?.organizations?.name || "Your Organization";

        const success = await notificationService.notifyYourTurn(
          customerPhone,
          ticketData.ticket_number,
          departmentName,
          organizationName,
          "d2b82e8d-3e85-41d9-9870-aa5c3b7b2dc7", // organizationId
          ticketId
        );

        whatsappResult = {
          success,
          departmentName,
          organizationName,
          ticketNumber: ticketData.ticket_number,
        };
        console.log("WhatsApp result:", whatsappResult);
      } catch (err) {
        whatsappError = err instanceof Error ? err.message : String(err);
        console.error("❌ WhatsApp notification error:", whatsappError);
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        environment: envCheck,
        notificationService: {
          imported: !!notificationService,
          error: notificationServiceError,
        },
        ticket: {
          found: !!ticketData,
          data: ticketData,
          error: ticketError,
        },
        whatsapp: {
          attempted: !!whatsappResult || !!whatsappError,
          result: whatsappResult,
          error: whatsappError,
        },
      },
    });
  } catch (error) {
    console.error("❌ WhatsApp debug test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
