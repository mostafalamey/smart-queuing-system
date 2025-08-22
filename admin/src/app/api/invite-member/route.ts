// Server-side API route for sending invitations using Supabase Native Auth
// This will be at /api/invite-member

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // This is the key that enables admin functions
);

interface InvitationRequest {
  email: string;
  role: "admin" | "manager" | "employee";
  organizationId: string;
  organizationName: string;
  branchId?: string | null;
  departmentIds?: string[] | null;
}

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      role,
      organizationId,
      organizationName,
      branchId,
      departmentIds,
    }: InvitationRequest = await request.json();

    console.log("=== SUPABASE NATIVE INVITATION REQUEST ===");

    // Validate required fields
    if (!email || !role || !organizationId || !organizationName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: email, role, organizationId, organizationName",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["admin", "manager", "employee"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, manager, or employee" },
        { status: 400 }
      );
    }

    // Check if user already exists in members table
    const { data: existingMember } = await supabaseAdmin
      .from("members")
      .select("id, email, organization_id, is_active")
      .eq("email", email)
      .single();

    if (existingMember) {
      if (existingMember.organization_id === organizationId) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 400 }
        );
      } else if (existingMember.organization_id) {
        return NextResponse.json(
          { error: "User is already a member of another organization" },
          { status: 400 }
        );
      }
    }

    // Send invitation using Supabase native auth admin function
    console.log("Sending Supabase native invitation...");

    const redirectTo = `${
      process.env.NEXT_PUBLIC_SITE_URL
    }/accept-invitation?org=${organizationId}&role=${role}&orgName=${encodeURIComponent(
      organizationName
    )}`;

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectTo,
        data: {
          role: role,
          organization_id: organizationId,
          organization_name: organizationName,
          invited_by: "admin", // You can pass the current user's info here
          invitation_type: "organization_member",
        },
      });

    if (inviteError) {
      console.error("Supabase invitation error:", inviteError);

      // Handle rate limit errors specifically
      if (
        inviteError.message?.includes("rate limit") ||
        inviteError.message?.includes("429")
      ) {
        return NextResponse.json(
          {
            error:
              "Rate limit exceeded. Please try again later or contact support to increase limits.",
            details: inviteError.message,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          error: `Failed to send invitation: ${inviteError.message}`,
          details: inviteError,
        },
        { status: 400 }
      );
    }

    console.log("✅ Supabase invitation sent successfully:", inviteData);

    // Create or update member record
    const memberData = {
      email: email,
      name: email.split("@")[0], // Default name from email
      role: role,
      organization_id: organizationId,
      branch_id: branchId || null,
      department_ids: departmentIds || null,
      is_active: false, // Will be activated when user accepts invitation
      auth_user_id: null, // Will be set when user signs up
      onboarding_completed: false, // Initialize onboarding status
      onboarding_skipped: false,
      onboarding_completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingMember) {
      // Update existing member record
      const { error: updateError } = await supabaseAdmin
        .from("members")
        .update(memberData)
        .eq("email", email);

      if (updateError) {
        console.error("Member update error:", updateError);
      } else {
        console.log("Member record updated successfully");
      }
    } else {
      // Create new member record
      console.log("Creating new member record:", memberData);
      const { error: insertError } = await supabaseAdmin
        .from("members")
        .insert([memberData]);

      if (insertError) {
        console.error("Member creation error:", insertError);
        // Continue anyway - the invitation was sent successfully
      } else {
        console.log("Member record created successfully");
      }
    }

    console.log("Native Supabase invitation process completed successfully");
    return NextResponse.json({
      success: true,
      message: `Invitation sent successfully to ${email} using Supabase Auth`,
      inviteData: {
        user: inviteData.user,
        email_sent: true,
      },
      redirectTo: redirectTo,
    });
  } catch (error) {
    console.error("Invitation API error:", error);
    return NextResponse.json(
      { error: "Internal server error while sending invitation" },
      { status: 500 }
    );
  }
}
