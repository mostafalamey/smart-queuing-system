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
 * Subscribe to push notifications
 * POST /api/notifications/subscribe
 *
 * Body:
 * {
 *   organizationId: string,
 *   customerPhone: string,
 *   subscription: {
 *     endpoint: string,
 *     keys: {
 *       p256dh: string,
 *       auth: string
 *     }
 *   },
 *   userAgent?: string,
 *   notificationPreference?: "push" | "whatsapp" | "both"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      organizationId,
      customerPhone,
      subscription,
      userAgent,
      notificationPreference = "push", // Default to push only if not specified
    } = body;

    // Clean phone number consistently (remove +, -, spaces)
    const cleanCustomerPhone = customerPhone?.replace(/[\+\-\s]/g, "") || "";

    // Validate required fields (phone number instead of ticket ID)
    if (
      !organizationId ||
      !cleanCustomerPhone ||
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: {
            organizationId: !!organizationId,
            customerPhone: !!cleanCustomerPhone,
            subscriptionEndpoint: !!subscription?.endpoint,
            subscriptionKeys: !!(
              subscription?.keys?.p256dh && subscription?.keys?.auth
            ),
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if subscription already exists for this phone number and organization
    const { data: existingSubscription, error: selectError } = await supabase
      .from("push_subscriptions")
      .select("id, is_active, endpoint")
      .eq("organization_id", organizationId)
      .eq("customer_phone", cleanCustomerPhone)
      .eq("endpoint", subscription.endpoint)
      .single();

    if (selectError && selectError.code !== "PGRST116") {
      console.error("Database select error:", selectError);
      return NextResponse.json(
        { error: "Database error", details: selectError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    if (existingSubscription) {
      // Update existing subscription to active
      const { error: updateError } = await supabase
        .from("push_subscriptions")
        .update({
          is_active: true,
          last_used_at: new Date().toISOString(),
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          user_agent: userAgent || null,
        })
        .eq("id", existingSubscription.id);

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        return NextResponse.json(
          {
            error: "Failed to update subscription",
            details: updateError.message,
          },
          { status: 500, headers: corsHeaders }
        );
      }

      // Update notification preferences based on user's actual choice
      await upsertNotificationPreferences(
        organizationId,
        null, // No specific ticket ID
        customerPhone,
        true, // push enabled (they're subscribing)
        false, // push not denied
        notificationPreference // Pass the user's notification preference
      );

      return NextResponse.json(
        {
          success: true,
          message: "Subscription updated successfully",
          subscriptionId: existingSubscription.id,
          customerPhone: cleanCustomerPhone,
        },
        { headers: corsHeaders }
      );
    } else {
      // Create new subscription

      // Create new subscription (no ticket_id, just phone-based)
      const { data: newSubscription, error: insertError } = await supabase
        .from("push_subscriptions")
        .insert({
          organization_id: organizationId,
          customer_phone: cleanCustomerPhone,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          user_agent: userAgent || null,
          is_active: true,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creating subscription:", insertError);
        return NextResponse.json(
          {
            error: "Failed to create subscription",
            details: insertError.message,
          },
          { status: 500, headers: corsHeaders }
        );
      }

      // Update notification preferences based on user's actual choice
      await upsertNotificationPreferences(
        organizationId,
        null, // No specific ticket ID
        customerPhone,
        true, // push enabled (they're subscribing)
        false, // push not denied
        notificationPreference // Pass the user's notification preference
      );

      return NextResponse.json(
        {
          success: true,
          message: "Subscription created successfully",
          subscriptionId: newSubscription.id,
          customerPhone: customerPhone,
        },
        { headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error("Subscribe API error:", error);
    return NextResponse.json(
      {
        error: "Database error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Update notification preferences when push is denied
 * PUT /api/notifications/subscribe
 *
 * Body:
 * {
 *   organizationId: string,
 *   customerPhone: string,
 *   pushDenied: boolean,
 *   notificationPreference?: "push" | "whatsapp" | "both"
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const {
      organizationId,
      customerPhone,
      pushDenied,
      notificationPreference = "push",
    } = await request.json();

    // Validate required fields
    if (!organizationId || !customerPhone || typeof pushDenied !== "boolean") {
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: {
            organizationId: !!organizationId,
            customerPhone: !!customerPhone,
            pushDenied: typeof pushDenied === "boolean",
          },
        },
        { status: 400 }
      );
    }

    console.log(
      "Updating notification preferences for phone:",
      customerPhone,
      "with preference:",
      notificationPreference
    );

    // Update notification preferences for this phone number with user's choice
    await upsertNotificationPreferences(
      organizationId,
      null, // No specific ticket ID for phone-based subscriptions
      customerPhone,
      !pushDenied,
      pushDenied,
      notificationPreference
    );

    return NextResponse.json({
      success: true,
      customerPhone: customerPhone,
      message: pushDenied
        ? `Push notifications disabled, using ${
            notificationPreference === "whatsapp"
              ? "WhatsApp only"
              : "WhatsApp fallback"
          }`
        : `Push notifications enabled with ${notificationPreference} preference`,
    });
  } catch (error) {
    console.error("Update preferences API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Get notification preferences for a customer
 * GET /api/notifications/subscribe?organizationId=xxx&ticketId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const ticketId = searchParams.get("ticketId");

    if (!organizationId || !ticketId) {
      return NextResponse.json(
        { error: "Missing organizationId or ticketId" },
        { status: 400 }
      );
    }

    // Get customer phone from ticket (might be null)
    const { data: ticketData, error: ticketError } = await supabase
      .from("tickets")
      .select("customer_phone")
      .eq("id", ticketId)
      .single();

    if (ticketError) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Get notification preferences for this specific ticket
    let preferences = null;
    const { data } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("ticket_id", ticketId)
      .single();
    preferences = data;

    return NextResponse.json(
      {
        success: true,
        ticketExists: true, // Explicitly indicate ticket exists
        preferences: preferences || {
          push_enabled: true,
          push_denied: false,
          whatsapp_fallback: true,
        },
        activeSubscriptions: preferences ? 1 : 0, // Based on preferences existence
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Get preferences API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to upsert notification preferences for a customer phone
 */
async function upsertNotificationPreferences(
  organizationId: string,
  ticketId: string | null,
  customerPhone: string | null,
  pushEnabled: boolean,
  pushDenied: boolean,
  notificationPreference: "push" | "whatsapp" | "both" = "push"
) {
  if (!customerPhone) {
    return;
  }

  // Map notification preference to database fields
  let whatsappFallback: boolean;
  let pushEnabledFinal: boolean;

  switch (notificationPreference) {
    case "push":
      // Push only: enable push, disable WhatsApp fallback
      pushEnabledFinal = pushEnabled;
      whatsappFallback = false;
      break;
    case "whatsapp":
      // WhatsApp only: disable push, enable WhatsApp fallback
      pushEnabledFinal = false;
      whatsappFallback = true;
      break;
    case "both":
      // Both: enable push and WhatsApp fallback
      pushEnabledFinal = pushEnabled;
      whatsappFallback = true;
      break;
    default:
      // Fallback to push only
      pushEnabledFinal = pushEnabled;
      whatsappFallback = false;
  }

  // First, try to find existing preference for this phone number in this organization
  const { data: existingPreference } = await supabase
    .from("notification_preferences")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("customer_phone", customerPhone)
    .single();

  if (existingPreference) {
    // Update existing preference
    const { error } = await supabase
      .from("notification_preferences")
      .update({
        push_enabled: pushEnabledFinal,
        push_denied: pushDenied,
        push_denied_at: pushDenied ? new Date().toISOString() : null,
        whatsapp_fallback: whatsappFallback,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingPreference.id);

    if (error) {
      console.error("Error updating notification preferences:", error);
    }
  } else {
    // Create new preference
    const { error } = await supabase.from("notification_preferences").insert({
      organization_id: organizationId,
      ticket_id: ticketId, // Can be null for phone-based subscriptions
      customer_phone: customerPhone,
      push_enabled: pushEnabledFinal,
      push_denied: pushDenied,
      push_denied_at: pushDenied ? new Date().toISOString() : null,
      whatsapp_fallback: whatsappFallback,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating notification preferences:", error);
    } else {
      console.log(
        "Successfully created notification preferences for",
        customerPhone
      );
    }
  }
}
