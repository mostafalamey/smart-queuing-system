import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Get organization country information
    const { data: organization, error } = await supabase
      .from("organizations")
      .select("country, country_code, name")
      .eq("id", organizationId)
      .single();

    if (error) {
      console.error("Error fetching organization country info:", error);
      return NextResponse.json(
        { error: "Failed to fetch organization information" },
        { status: 500 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      country: organization.country || "Egypt",
      countryCode: organization.country_code || "+20",
      organizationName: organization.name,
    });
  } catch (error) {
    console.error("Error in organization country API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
