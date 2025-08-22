// API route for permanent member deletion with auth and storage cleanup
// This requires service role privileges

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for admin operations
);

interface DeleteMemberRequest {
  memberId: string;
  memberName: string;
}

export async function DELETE(request: NextRequest) {
  try {
    const { memberId, memberName }: DeleteMemberRequest = await request.json();

    console.log("=== PERMANENT MEMBER DELETION ===");
    console.log("Member ID:", memberId);
    console.log("Member Name:", memberName);

    // Validate required fields
    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Step 1: Get member data
    const { data: memberData, error: fetchError } = await supabaseAdmin
      .from("members")
      .select("auth_user_id, avatar_url, email, name")
      .eq("id", memberId)
      .single();

    if (fetchError) {
      console.error("Error fetching member data:", fetchError);
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { auth_user_id, avatar_url, email, name } = memberData;
    console.log("Member data:", { auth_user_id, avatar_url, email, name });

    let avatarDeleted = false;
    let authUserDeleted = false;

    // Step 2: Delete avatar from storage if it exists
    if (avatar_url) {
      try {
        // Extract the file path from the avatar_url
        const urlParts = avatar_url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const folderPath = urlParts[urlParts.length - 2];
        const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

        console.log("Attempting to delete avatar:", filePath);

        const { error: storageError } = await supabaseAdmin.storage
          .from("avatars")
          .remove([filePath]);

        if (storageError) {
          console.warn("Failed to delete avatar file:", storageError);
        } else {
          console.log("Avatar file deleted successfully");
          avatarDeleted = true;
        }
      } catch (avatarError) {
        console.warn("Error processing avatar deletion:", avatarError);
      }
    }

    // Step 3: Delete user from Supabase Auth if auth_user_id exists
    if (auth_user_id) {
      try {
        console.log("Attempting to delete auth user:", auth_user_id);

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
          auth_user_id
        );

        if (authError) {
          console.error("Failed to delete auth user:", authError);
        } else {
          console.log("Auth user deleted successfully");
          authUserDeleted = true;
        }
      } catch (authDeleteError) {
        console.error("Error during auth user deletion:", authDeleteError);
      }
    }

    // Step 4: Delete member record from database
    const { error: deleteError } = await supabaseAdmin
      .from("members")
      .delete()
      .eq("id", memberId);

    if (deleteError) {
      console.error("Error deleting member record:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete member record" },
        { status: 500 }
      );
    }

    console.log("Member record deleted successfully");

    const result = {
      success: true,
      memberId,
      memberName: name || memberName,
      email,
      avatarDeleted,
      authUserDeleted,
      message: `${
        name || memberName
      } has been permanently removed with full cleanup`,
    };

    console.log("Permanent deletion completed:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in permanent member deletion:", error);
    return NextResponse.json(
      { error: "Internal server error during member deletion" },
      { status: 500 }
    );
  }
}
