import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * WhatsApp Session Check Endpoint
 * POST /api/test/session-check
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerPhone } = body;

    console.log("🔍 Checking WhatsApp sessions for:", customerPhone);

    // Clean phone number (same logic as in the session service)
    const cleanPhone = customerPhone?.replace(/[\+\-\s]/g, "") || "";
    console.log("Cleaned phone:", cleanPhone);

    const now = new Date();

    // Check for active sessions
    const { data: activeSessions, error: activeError } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", cleanPhone)
      .eq("is_active", true)
      .gt("expires_at", now.toISOString());

    // Check for all sessions (active and inactive)
    const { data: allSessions, error: allError } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", cleanPhone)
      .order("created_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      phone: {
        original: customerPhone,
        cleaned: cleanPhone,
      },
      currentTime: now.toISOString(),
      activeSessions: {
        count: activeSessions?.length || 0,
        data: activeSessions || [],
        error: activeError,
      },
      recentSessions: {
        count: allSessions?.length || 0,
        data: allSessions || [],
        error: allError,
      },
    });
  } catch (error) {
    console.error("❌ Session check failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
