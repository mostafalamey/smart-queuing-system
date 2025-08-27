import { NextRequest, NextResponse } from "next/server";

/**
 * Environment Variables Check Endpoint
 * GET /api/test/env-check
 *
 * This endpoint helps debug environment variable issues in production
 */
export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      // WhatsApp Configuration
      ULTRAMSG_INSTANCE_ID: process.env.ULTRAMSG_INSTANCE_ID
        ? "✅ SET"
        : "❌ MISSING",
      ULTRAMSG_TOKEN: process.env.ULTRAMSG_TOKEN ? "✅ SET" : "❌ MISSING",
      WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED || "❌ MISSING",
      WHATSAPP_BUSINESS_NUMBER: process.env.WHATSAPP_BUSINESS_NUMBER
        ? "✅ SET"
        : "❌ MISSING",
      WHATSAPP_COMPANY_NUMBER: process.env.WHATSAPP_COMPANY_NUMBER
        ? "✅ SET"
        : "❌ MISSING",

      // Other important variables
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? "✅ SET"
        : "❌ MISSING",
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
        ? "✅ SET"
        : "❌ MISSING",

      // Show actual values (masked for security)
      actualValues: {
        ULTRAMSG_INSTANCE_ID: process.env.ULTRAMSG_INSTANCE_ID || "MISSING",
        WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED || "MISSING",
        WHATSAPP_BUSINESS_NUMBER:
          process.env.WHATSAPP_BUSINESS_NUMBER || "MISSING",
        WHATSAPP_COMPANY_NUMBER:
          process.env.WHATSAPP_COMPANY_NUMBER || "MISSING",
        // Don't show token for security
        ULTRAMSG_TOKEN_LENGTH: process.env.ULTRAMSG_TOKEN?.length || 0,
      },

      // Environment info
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
    };

    return NextResponse.json({
      success: true,
      message: "Environment variables check completed",
      envCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Environment check error:", error);
    return NextResponse.json(
      {
        error: "Environment check failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
