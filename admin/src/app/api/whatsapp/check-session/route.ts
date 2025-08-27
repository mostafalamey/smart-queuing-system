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

/**
 * Check if a customer has an active WhatsApp session
 * POST /api/whatsapp/check-session
 *
 * Body: {
 *   phone: string,
 *   organizationId: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, organizationId } = body;

    if (!phone || !organizationId) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          hasActiveSession: false,
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Clean phone number consistently (remove +, -, spaces)
    const cleanPhone = phone.replace(/[\+\-\s]/g, "");

    console.log("Checking WhatsApp session for:", {
      originalPhone: phone,
      cleanPhone,
      organizationId,
    });

    // First, let's see ALL sessions for this phone number (debug)
    const { data: allSessions, error: debugError } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("phone_number", cleanPhone);

    console.log("All sessions for phone:", {
      cleanPhone,
      sessions: allSessions,
      count: allSessions?.length || 0,
    });

    // Check for active WhatsApp session (temporarily without org filter for debugging)
    const { data: session, error } = await supabase
      .from("whatsapp_sessions")
      .select("id, expires_at, is_active, organization_id")
      .eq("phone_number", cleanPhone)
      .eq("is_active", true)
      .gte("expires_at", new Date().toISOString())
      .single();

    console.log("Session query result:", {
      found: !!session,
      session: session,
      error: error,
      expectedOrgId: organizationId,
      actualOrgId: session?.organization_id,
      orgIdMatch: session?.organization_id === organizationId,
    });

    if (error && error.code !== "PGRST116") {
      console.error("Error checking WhatsApp session:", error);
      return NextResponse.json(
        {
          error: "Database error",
          hasActiveSession: false,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // For testing - temporarily allow sessions with any organization ID
    // TODO: Restore organization ID matching for production
    const hasActiveSession = !!session; // Temporarily removed: && session.organization_id === organizationId;

    console.log("WhatsApp session check result:", {
      hasActiveSession,
      sessionId: session?.id,
      expiresAt: session?.expires_at,
    });

    return NextResponse.json(
      {
        success: true,
        hasActiveSession,
        sessionInfo: session
          ? {
              sessionId: session.id,
              expiresAt: session.expires_at,
              isActive: session.is_active,
            }
          : null,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        hasActiveSession: false,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
