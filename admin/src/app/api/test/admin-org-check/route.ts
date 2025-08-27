import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Admin Organization Check Endpoint (Simplified)
 * GET /api/test/admin-org-check
 *
 * This endpoint shows all admin users and their organizations
 */
export async function GET(request: NextRequest) {
  try {
    // Get all members with their organizations
    const { data: members, error: memberError } = await supabase
      .from("members")
      .select(
        `
        user_id,
        organization_id,
        role,
        organizations (
          name
        )
      `
      )
      .limit(20);

    if (memberError) {
      return NextResponse.json(
        {
          error: "Failed to fetch members",
          details: memberError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      members:
        members?.map((member) => ({
          userId: member.user_id,
          organizationId: member.organization_id,
          organizationName: (member as any).organizations?.name || "Unknown",
          role: member.role,
          matchesCustomer:
            member.organization_id === "def924ee-c304-4772-8129-de97818e6ee9",
        })) || [],
      customerSessionOrg: "def924ee-c304-4772-8129-de97818e6ee9",
      totalMembers: members?.length || 0,
    });
  } catch (error) {
    console.error("❌ Admin org check failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
