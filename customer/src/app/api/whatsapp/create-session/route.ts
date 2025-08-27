import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  // Handle legacy GET requests with query parameters
  const url = new URL(request.url);
  const phone = url.searchParams.get("phone");
  const organizationId = url.searchParams.get("organizationId") || null;

  return handleSessionCreation(phone, organizationId);
}

export async function POST(request: NextRequest) {
  // Handle new POST requests with JSON body
  const { phone, organizationId } = await request.json();
  return handleSessionCreation(phone, organizationId);
}

async function handleSessionCreation(
  phone: string | null,
  organizationId: string | null
) {
  try {
    console.log("🔍 Customer API: Environment check", {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl:
        process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
    });

    // Use service role key for server-side database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Clean phone number (remove + and any spaces/dashes)
    const cleanPhone = phone.replace(/[\+\-\s]/g, "");

    // Check if session already exists and is active
    const { data: existingSession } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", cleanPhone)
      .eq("is_active", true)
      .single();

    if (existingSession) {
      return NextResponse.json({
        success: true,
        message: "Active WhatsApp session already exists",
        sessionId: existingSession.id,
      });
    }

    // Create new WhatsApp session (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: newSession, error } = await supabase
      .from("whatsapp_sessions")
      .insert([
        {
          phone_number: cleanPhone,
          organization_id: organizationId || null,
          is_active: true,
          expires_at: expiresAt.toISOString(),
        },
      ])
      .select()
      .single();

    console.log("🔍 Customer API: Insert attempt result", {
      hasData: !!newSession,
      error: error,
      cleanPhone,
      organizationId,
      expiresAt: expiresAt.toISOString(),
    });

    if (error) {
      console.error("❌ Customer App: Error creating WhatsApp session:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create WhatsApp session",
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log("✅ Customer App: WhatsApp session created:", {
      sessionId: newSession.id,
      phone: cleanPhone,
      organizationId,
      expiresAt: expiresAt.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp session created successfully",
      sessionId: newSession.id,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("❌ Customer App: Session creation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
