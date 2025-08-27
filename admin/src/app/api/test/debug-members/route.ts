import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Debug Member Data Endpoint
 * GET /api/test/debug-members
 *
 * Check all members and their organization IDs
 */
export async function GET() {
  try {
    // Get all members
    console.log("Fetching all members...");
    const { data: members, error: memberError } = await supabase
      .from("members")
      .select("*")
      .limit(20);

    console.log("Members result:", { members, error: memberError });

    // Get all organizations
    const { data: organizations, error: orgError } = await supabase
      .from("organizations")
      .select("*");

    console.log("Organizations result:", { organizations, error: orgError });

    return NextResponse.json({
      success: true,
      debug: {
        members: members || [],
        organizations: organizations || [],
        memberCount: members?.length || 0,
        orgCount: organizations?.length || 0,
        expectedOrgId: "def924ee-c304-4772-8129-de97818e6ee9",
      },
      errors: {
        memberError: memberError?.message,
        orgError: orgError?.message,
      },
    });
  } catch (error) {
    console.error("❌ Debug members failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
