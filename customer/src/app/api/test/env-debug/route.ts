import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 ENV DEBUG: Checking environment variables");

    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrlPrefix:
        process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 50) + "...",
      serviceKeyPrefix:
        process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + "...",
    };

    console.log("📝 ENV DEBUG: Environment check:", envCheck);

    // Try to create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Try a simple database query
    const { data: orgTest, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .limit(1);

    console.log("📊 DB TEST: Organizations query:", {
      data: orgTest,
      error: orgError,
    });

    // Try WhatsApp sessions query
    const { data: sessionTest, error: sessionError } = await supabase
      .from("whatsapp_sessions")
      .select("id, phone_number")
      .limit(1);

    console.log("📱 DB TEST: WhatsApp sessions query:", {
      data: sessionTest,
      error: sessionError,
    });

    return NextResponse.json({
      success: true,
      message: "Environment debug complete",
      environment: envCheck,
      database: {
        organizationsQuery: { hasData: !!orgTest, error: orgError?.message },
        whatsappSessionsQuery: {
          hasData: !!sessionTest,
          error: sessionError?.message,
        },
      },
    });
  } catch (error) {
    console.error("❌ ENV DEBUG: Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
