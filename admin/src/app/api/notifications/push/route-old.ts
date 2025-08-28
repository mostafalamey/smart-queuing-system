import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import {
  defaultMessageTemplates,
  processMessageTemplate,
  MessageTemplateData,
} from "../../../../../../shared/message-templates";

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
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

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  tag?: string;
  renotify?: boolean;
  vibrate?: number[];
}

/**
 * Send push notification to a specific customer
 * POST /api/notifications/push
 *
 * Body:
 * {
 *   organizationId: string,
 *   ticketId: string,
 *   customerPhone?: string, // Optional for WhatsApp/SMS fallback
 *   payload: NotificationPayload,
 *   notificationType: 'ticket_created' | 'almost_your_turn' | 'your_turn',
 *   ticketNumber?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      organizationId,
      ticketId,
      customerPhone, // Now optional
      payload,
      notificationType,
      ticketNumber,
    } = body;

    // Validate required fields (either ticketId OR customerPhone must be provided)
    if (
      !organizationId ||
      (!ticketId && !customerPhone) ||
      !payload ||
      !notificationType
    ) {
      console.error("Push API missing required fields:", {
        organizationId: !!organizationId,
        ticketId: !!ticketId,
        customerPhone: !!customerPhone,
        payload: !!payload,
        notificationType: !!notificationType,
      });
      return NextResponse.json(
        {
          error: "Missing required fields",
          details: {
            organizationId: !organizationId ? "missing" : "present",
            ticketId: !ticketId ? "missing" : "present",
            customerPhone: !customerPhone ? "missing" : "present",
            payload: !payload ? "missing" : "present",
            notificationType: !notificationType ? "missing" : "present",
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Clean customer phone number consistently (remove +, -, spaces)
    // Clean customer phone by removing ALL non-digits (to match whatsapp-sessions service cleaning)
    const cleanCustomerPhone = customerPhone?.replace(/[^\d]/g, "") || "";

    // Try to find subscriptions by phone number first (new approach)
    // If customerPhone is provided, use phone-based lookup
    // Otherwise, fall back to ticket-based lookup (legacy)
    let subscriptions = null;
    let subscriptionError = null;

    if (cleanCustomerPhone) {
      console.log(
        "Using phone-based subscription lookup for:",
        cleanCustomerPhone
      );

      // Get active push subscriptions for this phone number
      const { data: phoneSubscriptions, error: phoneError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("customer_phone", cleanCustomerPhone)
        .eq("is_active", true);

      subscriptions = phoneSubscriptions;
      subscriptionError = phoneError;
    } else {
      console.log("Using ticket-based subscription lookup for:", ticketId);

      // Get active push subscriptions for this ticket (legacy)
      const { data: ticketSubscriptions, error: ticketError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("ticket_id", ticketId)
        .eq("is_active", true);

      subscriptions = ticketSubscriptions;
      subscriptionError = ticketError;
    }

    if (subscriptionError) {
      console.error("Error fetching subscriptions:", subscriptionError);

      // Check if this is a "table doesn't exist" error (migration not run)
      if (
        subscriptionError.code === "PGRST204" ||
        subscriptionError.message?.includes("does not exist") ||
        subscriptionError.message?.includes("push_subscriptions")
      ) {
        return NextResponse.json(
          {
            error: "Database migration required",
            details:
              "Please run the database migration script: sql/database-push-notifications-ticket-based.sql",
            migrationRequired: true,
          },
          { status: 503, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to fetch subscriptions",
          details: subscriptionError.message,
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found, attempting WhatsApp fallback");

      // Log that push failed
      await logNotificationAttempt(
        organizationId,
        ticketId,
        customerPhone || null,
        ticketNumber || "",
        notificationType,
        "push",
        false,
        "No active subscriptions found"
      );

      // If we have a customer phone, try WhatsApp fallback immediately
      let whatsappFallbackResult = null;
      if (customerPhone) {
        try {
          console.log("Attempting WhatsApp fallback for:", customerPhone);

          // Get ticket details for better messaging
          const { data: ticketData, error: ticketError } = await supabase
            .from("tickets")
            .select(
              `
              ticket_number,
              departments (
                name,
                branches (
                  name,
                  organizations (name)
                )
              )
            `
            )
            .eq("id", ticketId)
            .single();

          console.log("🔍 Ticket data lookup:", {
            ticketData,
            ticketError,
            ticketId,
          });

          if (ticketData && ticketData.departments) {
            console.log("✅ Using real ticket data for WhatsApp message");
            // Import the notification service
            const { notificationService } = await import("@/lib/notifications");

            const departmentData = ticketData.departments as any;
            const departmentName = departmentData.name;
            const organizationName =
              departmentData.branches?.organizations?.name ||
              "Your Organization";

            // Prepare message template data
            const templateData: MessageTemplateData = {
              organizationName,
              ticketNumber: ticketData.ticket_number,
              serviceName: departmentName, // Using department as service for now
              departmentName,
              queuePosition: 1, // Default values - could be enhanced with real queue data
              totalInQueue: 1,
              estimatedWaitTime: "N/A",
              currentlyServing: "N/A",
            };

            // Generate WhatsApp message using templates
            let whatsappMessage = "";
            let whatsappSuccess = false;

            switch (notificationType) {
              case "ticket_created":
                whatsappMessage = processMessageTemplate(
                  defaultMessageTemplates.ticketCreated.whatsapp,
                  templateData
                );
                break;

              case "almost_your_turn":
                whatsappMessage = processMessageTemplate(
                  defaultMessageTemplates.youAreNext.whatsapp,
                  templateData
                );
                break;

              case "your_turn":
                whatsappMessage = processMessageTemplate(
                  defaultMessageTemplates.yourTurn.whatsapp,
                  templateData
                );
                break;

              default:
                // Fallback for other notification types
                whatsappMessage = `📋 Queue Update\n\nTicket: ${ticketData.ticket_number}\nDepartment: ${departmentName}\n\nYour queue status has been updated.`;
                break;
            }

            // Call the fixed WhatsApp endpoint directly
            const whatsappResponse = await fetch(
              `${
                process.env.NEXT_PUBLIC_ADMIN_URL ||
                "https://smart-queue-admin.vercel.app"
              }/api/notifications/whatsapp-fixed`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  phone: customerPhone,
                  message: whatsappMessage,
                  organizationId,
                  ticketId,
                  notificationType,
                }),
              }
            );

            const whatsappData = await whatsappResponse.json();
            whatsappSuccess = whatsappData.success === true;

            whatsappFallbackResult = {
              attempted: true,
              success: whatsappSuccess,
              phone: customerPhone,
            };

            // Log WhatsApp attempt
            await logNotificationAttempt(
              organizationId,
              ticketId,
              customerPhone,
              ticketData.ticket_number,
              notificationType,
              "whatsapp",
              whatsappSuccess
            );

            console.log("WhatsApp fallback result:", whatsappFallbackResult);

            if (whatsappSuccess) {
              return NextResponse.json(
                {
                  success: true,
                  message:
                    "WhatsApp notification sent successfully (push fallback)",
                  whatsappFallback: whatsappFallbackResult,
                },
                { status: 200, headers: corsHeaders }
              );
            }
          } else {
            // Fallback for test tickets or when ticket data is not found
            console.log(
              "⚠️  No ticket data found, using template-based fallback WhatsApp message"
            );

            // Use template-based fallback messages for better consistency
            let fallbackMessage = "";
            const genericTemplateData: MessageTemplateData = {
              organizationName: "Your Organization",
              ticketNumber: "N/A",
              serviceName: "Service",
              departmentName: "Department",
              queuePosition: 1,
              totalInQueue: 1,
              estimatedWaitTime: "N/A",
              currentlyServing: "N/A",
            };

            switch (notificationType) {
              case "almost_your_turn":
                fallbackMessage = processMessageTemplate(
                  defaultMessageTemplates.youAreNext.whatsapp,
                  genericTemplateData
                );
                break;
              case "your_turn":
                fallbackMessage = processMessageTemplate(
                  defaultMessageTemplates.yourTurn.whatsapp,
                  genericTemplateData
                );
                break;
              case "ticket_created":
                fallbackMessage = processMessageTemplate(
                  defaultMessageTemplates.ticketCreated.whatsapp,
                  genericTemplateData
                );
                break;
              default:
                fallbackMessage = `🎫 Queue Update - Your ticket has been updated. Status: ${notificationType}. Please check your queue position.`;
                break;
            }

            try {
              // Direct UltraMsg API call as fallback
              console.log("📱 Sending fallback WhatsApp to:", customerPhone);

              const ultraMsgResponse = await fetch(
                `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                  },
                  body: new URLSearchParams({
                    token: process.env.ULTRAMSG_TOKEN!,
                    to: `${customerPhone.replace(/^\+/, "")}@c.us`,
                    body: fallbackMessage,
                  }),
                }
              );

              const ultraMsgResult = await ultraMsgResponse.json();
              console.log("📱 Fallback WhatsApp result:", ultraMsgResult);

              const whatsappSuccess = ultraMsgResult.sent === true;

              whatsappFallbackResult = {
                attempted: true,
                success: whatsappSuccess,
                phone: customerPhone,
                fallbackUsed: true,
              };

              if (whatsappSuccess) {
                return NextResponse.json(
                  {
                    success: true,
                    message:
                      "WhatsApp notification sent successfully (fallback mode)",
                    whatsappFallback: whatsappFallbackResult,
                  },
                  { status: 200, headers: corsHeaders }
                );
              }
            } catch (whatsappError) {
              console.error("❌ Fallback WhatsApp error:", whatsappError);
              whatsappFallbackResult = {
                attempted: true,
                success: false,
                error:
                  whatsappError instanceof Error
                    ? whatsappError.message
                    : "Unknown error",
                fallbackUsed: true,
              };
            }
          }
        } catch (whatsappError) {
          console.error("WhatsApp fallback error:", whatsappError);
          whatsappFallbackResult = {
            attempted: true,
            success: false,
            error:
              whatsappError instanceof Error
                ? whatsappError.message
                : "Unknown error",
          };
        }
      }

      // If WhatsApp fallback succeeded, consider the notification successful
      const overallSuccess = whatsappFallbackResult?.success === true;

      return NextResponse.json(
        {
          success: overallSuccess,
          message: overallSuccess
            ? "WhatsApp notification sent successfully (no push subscriptions found)"
            : "No active subscriptions found",
          shouldFallback: true,
          whatsappFallback: whatsappFallbackResult,
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const pushResults = [];
    let successCount = 0;
    let failureCount = 0;

    // Send notification to all active subscriptions
    for (const subscription of subscriptions) {
      try {
        const pushSubscription: PushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        };

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        );

        // Update last_used_at for successful subscription
        await supabase
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", subscription.id);

        pushResults.push({
          subscriptionId: subscription.id,
          success: true,
        });
        successCount++;
      } catch (error: any) {
        console.error(
          `Push notification failed for subscription ${subscription.id}:`,
          error
        );

        // Handle specific error cases
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription is no longer valid, mark as inactive
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", subscription.id);
        }

        pushResults.push({
          subscriptionId: subscription.id,
          success: false,
          error: error.message,
        });
        failureCount++;
      }
    }

    // Log the notification attempt
    await logNotificationAttempt(
      organizationId,
      ticketId,
      customerPhone,
      ticketNumber || "",
      notificationType,
      "push",
      successCount > 0,
      failureCount > 0
        ? `${successCount} success, ${failureCount} failed`
        : undefined
    );

    // ⚠️ CRITICAL FIX: Handle WhatsApp notifications BEFORE early return
    // This ensures users who want "both" notifications get WhatsApp regardless of push success
    let whatsappFallbackResult = null;
    
    // Check user's notification preferences to determine WhatsApp sending
    if (customerPhone) {
      const cleanCustomerPhone = customerPhone.replace(/^\+/, "");
      
      // Get user's notification preferences
      let notificationPrefs = null;
      
      // Try by ticket_id first
      const { data: ticketPrefs } = await supabase
        .from("notification_preferences")
        .select("push_enabled, whatsapp_fallback")
        .eq("ticket_id", ticketId)
        .single();

      notificationPrefs = ticketPrefs;

      // If no preferences found by ticket_id, try by customer_phone
      if (!notificationPrefs) {
        // Try both phone formats
        const phoneFormats = [customerPhone, cleanCustomerPhone];
        
        for (const phoneFormat of phoneFormats) {
          const { data: phonePrefsArray } = await supabase
            .from("notification_preferences")
            .select("push_enabled, whatsapp_fallback")
            .eq("customer_phone", phoneFormat)
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (phonePrefsArray && phonePrefsArray.length > 0) {
            notificationPrefs = phonePrefsArray[0];
            break;
          }
        }
      }

      // Determine if we should send WhatsApp
      let shouldSendWhatsApp = false;
      let whatsappReason = "";

      if (notificationPrefs?.whatsapp_fallback === true) {
        // User explicitly wants WhatsApp notifications (either "whatsapp" only or "both")
        // This should ALWAYS send WhatsApp regardless of push success
        shouldSendWhatsApp = true;
        whatsappReason = "User opted for WhatsApp notifications (whatsapp_fallback=true)";
        console.log("✅ WhatsApp enabled because user wants WhatsApp (whatsapp_fallback=true)");
      } else if (
        notificationPrefs?.push_enabled === true &&
        notificationPrefs?.whatsapp_fallback === false &&
        successCount === 0
      ) {
        // User wants ONLY push notifications but push failed - use WhatsApp as emergency fallback
        shouldSendWhatsApp = true;
        whatsappReason = "Emergency fallback: Push-only user but push failed";
        console.log("✅ WhatsApp enabled as emergency fallback (push-only user but push failed)");
      } else if (!notificationPrefs && successCount === 0) {
        // Legacy behavior for tickets without preferences (fallback when push fails)
        shouldSendWhatsApp = true;
        whatsappReason = "Legacy fallback logic (no preferences found)";
        console.log("⚠️ Using legacy logic (no notification preferences found)");
      }

      // Skip WhatsApp for ticket_created to avoid duplicates
      if (notificationType === "ticket_created") {
        shouldSendWhatsApp = false;
        whatsappReason = "Skipping ticket_created WhatsApp (handled during session setup)";
      }

      console.log("🔍 WhatsApp decision logic:", {
        successCount,
        customerPhone: !!customerPhone,
        notificationType,
        userWantsWhatsApp: notificationPrefs?.whatsapp_fallback,
        userWantsPush: notificationPrefs?.push_enabled,
        shouldSendWhatsApp,
        reason: whatsappReason,
      });

      // Send WhatsApp if determined necessary
      if (shouldSendWhatsApp) {
        try {
          console.log(whatsappReason + ":", customerPhone, `(${notificationType})`);
          
          // Try to get ticket data for better messaging
          const { data: ticketData } = await supabase
            .from("tickets")
            .select(`
              ticket_number,
              departments (
                name,
                branches (
                  name,
                  organizations (name)
                )
              )
            `)
            .eq("id", ticketId)
            .single();

          let whatsappSuccess = false;
          
          if (ticketData && ticketData.departments) {
            // Use real ticket data with templates
            const departmentData = ticketData.departments as any;
            const templateData: MessageTemplateData = {
              organizationName: departmentData.branches?.organizations?.name || "Your Organization",
              ticketNumber: ticketData.ticket_number,
              serviceName: departmentData.name,
              departmentName: departmentData.name,
              queuePosition: 1,
              totalInQueue: 1,
              estimatedWaitTime: "N/A",
              currentlyServing: "N/A",
            };

            let whatsappMessage = "";
            switch (notificationType) {
              case "almost_your_turn":
                whatsappMessage = processMessageTemplate(
                  defaultMessageTemplates.youAreNext.whatsapp,
                  templateData
                );
                break;
              case "your_turn":
                whatsappMessage = processMessageTemplate(
                  defaultMessageTemplates.yourTurn.whatsapp,
                  templateData
                );
                break;
              default:
                whatsappMessage = processMessageTemplate(
                  defaultMessageTemplates.youAreNext.whatsapp,
                  templateData
                );
                break;
            }

            // Send via UltraMsg
            const ultraMsgResponse = await fetch(
              `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
              {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  token: process.env.ULTRAMSG_TOKEN!,
                  to: `${cleanCustomerPhone}@c.us`,
                  body: whatsappMessage,
                }),
              }
            );

            const ultraMsgResult = await ultraMsgResponse.json();
            whatsappSuccess = ultraMsgResult.sent === true;
            
          } else {
            // Fallback template for test tickets
            const genericTemplateData: MessageTemplateData = {
              organizationName: "Your Organization",
              ticketNumber: "N/A",
              serviceName: "Service",
              departmentName: "Department",
              queuePosition: 1,
              totalInQueue: 1,
              estimatedWaitTime: "N/A",
              currentlyServing: "N/A",
            };

            let fallbackMessage = "";
            switch (notificationType) {
              case "almost_your_turn":
                fallbackMessage = processMessageTemplate(
                  defaultMessageTemplates.youAreNext.whatsapp,
                  genericTemplateData
                );
                break;
              case "your_turn":
                fallbackMessage = processMessageTemplate(
                  defaultMessageTemplates.yourTurn.whatsapp,
                  genericTemplateData
                );
                break;
              default:
                fallbackMessage = `🎫 Queue Update - Your ticket has been updated. Status: ${notificationType}.`;
                break;
            }

            const ultraMsgResponse = await fetch(
              `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
              {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  token: process.env.ULTRAMSG_TOKEN!,
                  to: `${cleanCustomerPhone}@c.us`,
                  body: fallbackMessage,
                }),
              }
            );

            const ultraMsgResult = await ultraMsgResponse.json();
            whatsappSuccess = ultraMsgResult.sent === true;
          }

          whatsappFallbackResult = {
            attempted: true,
            success: whatsappSuccess,
            phone: customerPhone,
            method: "integrated-flow"
          };

          console.log("WhatsApp integrated result:", whatsappFallbackResult);

        } catch (whatsappError) {
          console.error("WhatsApp integrated error:", whatsappError);
          whatsappFallbackResult = {
            attempted: true,
            success: false,
            phone: customerPhone,
            error: whatsappError instanceof Error ? whatsappError.message : "Unknown error",
          };
        }
      }
    }

    // Enhanced notification logic based on user's actual preferences:
    // 1. Always attempt push notifications
    // 2. Check user's notification preferences from the database
    // 3. Send WhatsApp if user opted for WhatsApp or both AND has active session
    // 4. Use WhatsApp as fallback if push completely fails (for users who want push but push failed)
    let whatsappFallbackResult = null;

    // Check if user has an active WhatsApp session
    let hasActiveWhatsAppSession = false;
    if (cleanCustomerPhone) {
      try {
        const { whatsappSessionService } = await import(
          "@/lib/whatsapp-sessions"
        );
        hasActiveWhatsAppSession =
          await whatsappSessionService.hasActiveSession(cleanCustomerPhone);

        console.log(`WhatsApp session check for ${cleanCustomerPhone}:`, {
          hasSession: hasActiveWhatsAppSession,
          method: "whatsappSessionService.hasActiveSession",
        });
      } catch (sessionError) {
        console.log("No active WhatsApp session found for:", customerPhone);
        hasActiveWhatsAppSession = false;
      }
    }

    // Get user's notification preferences from the database
    // Try by ticket_id first, then by customer_phone as fallback
    let { data: notificationPrefs } = await supabase
      .from("notification_preferences")
      .select("push_enabled, whatsapp_fallback")
      .eq("ticket_id", ticketId)
      .single();

    // If no preferences found by ticket_id, try by customer_phone
    if (!notificationPrefs && customerPhone) {
      console.log(
        "🔍 No preferences found by ticket_id, trying by customer_phone"
      );
      console.log("🔍 Trying both cleaned and original phone formats:", {
        originalPhone: customerPhone,
        cleanedPhone: cleanCustomerPhone,
      });

      // Try with original phone format first (with + sign)
      // Use order by and limit(1) instead of single() to handle multiple records
      let { data: phonePrefsArray, error: phoneError } = await supabase
        .from("notification_preferences")
        .select("push_enabled, whatsapp_fallback")
        .eq("customer_phone", customerPhone)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1);

      let phonePrefs =
        phonePrefsArray && phonePrefsArray.length > 0
          ? phonePrefsArray[0]
          : null;

      console.log("🔍 Original phone lookup result:", {
        phonePrefs,
        phoneError,
        queryPhone: customerPhone,
        recordCount: phonePrefsArray?.length || 0,
      });

      // If not found, try with cleaned phone format (without + sign)
      if (!phonePrefs) {
        console.log("🔍 Trying with cleaned phone format");
        const { data: cleanedPhonePrefsArray, error: cleanedError } =
          await supabase
            .from("notification_preferences")
            .select("push_enabled, whatsapp_fallback")
            .eq("customer_phone", cleanCustomerPhone)
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .limit(1);

        phonePrefs =
          cleanedPhonePrefsArray && cleanedPhonePrefsArray.length > 0
            ? cleanedPhonePrefsArray[0]
            : null;
        console.log("🔍 Cleaned phone lookup result:", {
          phonePrefs,
          cleanedError,
          queryPhone: cleanCustomerPhone,
          recordCount: cleanedPhonePrefsArray?.length || 0,
        });
      }

      notificationPrefs = phonePrefs;
    }

    console.log("🔍 Looking up notification preferences:", {
      ticketId,
      cleanCustomerPhone,
      organizationId,
    });

    console.log("User notification preferences:", notificationPrefs);

    // Determine if we should send WhatsApp based on user's actual preferences
    let shouldSendWhatsApp = false;
    let whatsappReason = "";

    console.log("🔍 Notification preferences check:", {
      notificationPrefs,
      customerPhone: !!customerPhone,
      hasActiveWhatsAppSession,
      successCount,
    });

    if (customerPhone) {
      if (notificationPrefs?.whatsapp_fallback === true) {
        // User explicitly wants WhatsApp notifications (either "whatsapp" only or "both")
        // This should ALWAYS send WhatsApp regardless of push success
        shouldSendWhatsApp = true;
        whatsappReason =
          "User opted for WhatsApp notifications (whatsapp_fallback=true):";
        console.log(
          "✅ WhatsApp enabled because user wants WhatsApp (whatsapp_fallback=true)"
        );
      } else if (
        notificationPrefs?.push_enabled === true &&
        notificationPrefs?.whatsapp_fallback === false &&
        successCount === 0
      ) {
        // User wants ONLY push notifications but push failed - use WhatsApp as emergency fallback
        shouldSendWhatsApp = true;
        whatsappReason = "Emergency fallback: Push-only user but push failed:";
        console.log(
          "✅ WhatsApp enabled as emergency fallback (push-only user but push failed)"
        );
      } else if (!notificationPrefs) {
        // Legacy behavior for tickets without preferences (fallback when push fails)
        shouldSendWhatsApp = successCount === 0;
        whatsappReason = "Legacy fallback logic (no preferences found):";
        console.log(
          "⚠️ Using legacy logic (no notification preferences found)"
        );
      } else {
        console.log(
          "❌ WhatsApp NOT enabled - user only wants push notifications"
        );
      }

      // Additional check for session requirement
      if (shouldSendWhatsApp && !hasActiveWhatsAppSession) {
        console.log(
          "⚠️ WhatsApp wanted but no active session - will attempt anyway for debugging"
        );
        // Don't disable for now to debug - normally we'd set shouldSendWhatsApp = false here
      }
    } else {
      console.log("❌ No customer phone provided");
    }

    // Skip WhatsApp for ticket_created to avoid duplicates (handled during session creation)
    if (notificationType === "ticket_created") {
      shouldSendWhatsApp = false;
      whatsappReason =
        "Skipping ticket_created WhatsApp (handled during session setup)";
    }

    console.log(`🔍 WhatsApp decision logic:`, {
      successCount,
      hasActiveWhatsAppSession,
      customerPhone: !!customerPhone,
      notificationType,
      userWantsWhatsApp: notificationPrefs?.whatsapp_fallback,
      userWantsPush: notificationPrefs?.push_enabled,
      shouldSendWhatsApp,
      reason: whatsappReason,
    });

    if (shouldSendWhatsApp) {
      try {
        console.log(whatsappReason, customerPhone, `(${notificationType})`);

        // Get ticket details for better messaging
        const { data: ticketData, error: ticketError } = await supabase
          .from("tickets")
          .select(
            `
            ticket_number,
            departments (
              name,
              branches (
                name,
                organizations (name)
              )
            )
          `
          )
          .eq("id", ticketId)
          .single();

        console.log("🔍 Ticket data lookup:", {
          ticketData,
          ticketError,
          ticketId,
        });

        if (ticketData && ticketData.departments) {
          console.log("✅ Using real ticket data for WhatsApp message");
          // Import the notification service
          const { notificationService } = await import("@/lib/notifications");

          const departmentData = ticketData.departments as any;
          const departmentName = departmentData.name;
          const organizationName =
            departmentData.branches?.organizations?.name || "Your Organization";

          // Send appropriate WhatsApp message based on notification type
          let whatsappSuccess = false;
          switch (notificationType) {
            case "ticket_created":
              whatsappSuccess = await notificationService.notifyTicketCreated(
                customerPhone,
                ticketData.ticket_number,
                departmentName,
                organizationName,
                0, // waitingCount - we don't have this info in admin context
                organizationId,
                ticketId
              );
              break;

            case "almost_your_turn":
              // Use message template for consistency
              console.log(
                "⏰ Sending almost_your_turn WhatsApp message directly..."
              );
              try {
                // Prepare template data for this message
                const templateData: MessageTemplateData = {
                  organizationName: organizationName,
                  ticketNumber: ticketData.ticket_number,
                  serviceName: departmentName,
                  departmentName: departmentName,
                  queuePosition: 1,
                  totalInQueue: 1,
                  estimatedWaitTime: "Soon",
                  currentlyServing: "N/A",
                };

                const directMessage = processMessageTemplate(
                  defaultMessageTemplates.youAreNext.whatsapp,
                  templateData
                );

                console.log("📱 Direct WhatsApp call:", {
                  phone: customerPhone,
                  messagePreview: directMessage.substring(0, 50) + "...",
                  organizationId: organizationId,
                });

                // Use the fixed WhatsApp endpoint with absolute URL (Vercel serverless fix)
                const baseUrl = process.env.VERCEL_URL
                  ? `https://${process.env.VERCEL_URL}`
                  : process.env.NEXT_PUBLIC_ADMIN_URL ||
                    "https://smart-queue-admin.vercel.app";
                const whatsappUrl = `${baseUrl}/api/notifications/whatsapp-fixed`;

                const directResponse = await fetch(whatsappUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    phone: customerPhone,
                    message: directMessage,
                    organizationId: organizationId,
                    ticketId: ticketId,
                    notificationType: "almost_your_turn",
                  }),
                });

                const directResult = await directResponse.json();
                whatsappSuccess = directResponse.ok && directResult.success;

                console.log("📱 Direct WhatsApp result:", {
                  httpOk: directResponse.ok,
                  status: directResponse.status,
                  resultSuccess: directResult.success,
                  messageId: directResult.messageId,
                  error: directResult.error,
                  finalSuccess: whatsappSuccess,
                });

                if (whatsappSuccess) {
                  console.log(
                    `✅ Almost your turn WhatsApp sent! MessageId: ${directResult.messageId}`
                  );
                } else {
                  console.log(
                    `❌ Almost your turn WhatsApp failed:`,
                    directResult.error || directResult.message
                  );
                }
              } catch (whatsappError) {
                console.error("❌ WhatsApp direct call error:", whatsappError);
                whatsappSuccess = false;
              }
              break;

            case "your_turn":
              // Use message template for consistency
              console.log("🎯 Sending your_turn WhatsApp message directly...");
              try {
                // Prepare template data for this message
                const templateData: MessageTemplateData = {
                  organizationName: organizationName,
                  ticketNumber: ticketData.ticket_number,
                  serviceName: departmentName,
                  departmentName: departmentName,
                  queuePosition: 1,
                  totalInQueue: 1,
                  estimatedWaitTime: "Now",
                  currentlyServing: ticketData.ticket_number,
                };

                const directMessage = processMessageTemplate(
                  defaultMessageTemplates.yourTurn.whatsapp,
                  templateData
                );

                console.log("📱 Direct WhatsApp call:", {
                  phone: customerPhone,
                  messagePreview: directMessage.substring(0, 50) + "...",
                  organizationId: organizationId,
                });

                // Use the fixed WhatsApp endpoint with absolute URL (Vercel serverless fix)
                const baseUrl = process.env.VERCEL_URL
                  ? `https://${process.env.VERCEL_URL}`
                  : process.env.NEXT_PUBLIC_ADMIN_URL ||
                    "https://smart-queue-admin.vercel.app";
                const whatsappUrl = `${baseUrl}/api/notifications/whatsapp-fixed`;

                const directResponse = await fetch(whatsappUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    phone: customerPhone,
                    message: directMessage,
                    organizationId: organizationId,
                    ticketId: ticketId,
                    notificationType: "your_turn",
                  }),
                });

                const directResult = await directResponse.json();
                whatsappSuccess = directResponse.ok && directResult.success;

                console.log("📱 Direct WhatsApp result:", {
                  httpOk: directResponse.ok,
                  status: directResponse.status,
                  resultSuccess: directResult.success,
                  messageId: directResult.messageId,
                  error: directResult.error,
                  finalSuccess: whatsappSuccess,
                });

                if (whatsappSuccess) {
                  console.log(
                    `✅ Your turn WhatsApp sent! MessageId: ${directResult.messageId}`
                  );
                } else {
                  console.error("❌ Your turn WhatsApp failed:", directResult);
                }
              } catch (directError) {
                console.error("❌ Direct WhatsApp API exception:", directError);
                whatsappSuccess = false;
              }
              break;
          }

          whatsappFallbackResult = {
            attempted: true,
            success: whatsappSuccess,
            phone: customerPhone,
          };

          // Log WhatsApp attempt
          await logNotificationAttempt(
            organizationId,
            ticketId,
            customerPhone,
            ticketData.ticket_number,
            notificationType,
            "whatsapp",
            whatsappSuccess
          );

          console.log("WhatsApp fallback result:", whatsappFallbackResult);
        } else {
          // Fallback for test tickets or when ticket data is not found (main shouldSendWhatsApp flow)
          console.log(
            "⚠️  No ticket data found in shouldSendWhatsApp flow, using fallback WhatsApp message"
          );

          try {
            // Use a generic template-style message for better consistency
            let fallbackMessage = "";
            const genericTemplateData: MessageTemplateData = {
              organizationName: "Your Organization",
              ticketNumber: "N/A",
              serviceName: "Service",
              departmentName: "Department",
              queuePosition: 1,
              totalInQueue: 1,
              estimatedWaitTime: "N/A",
              currentlyServing: "N/A",
            };

            switch (notificationType) {
              case "almost_your_turn":
                fallbackMessage = processMessageTemplate(
                  defaultMessageTemplates.youAreNext.whatsapp,
                  genericTemplateData
                );
                break;
              case "your_turn":
                fallbackMessage = processMessageTemplate(
                  defaultMessageTemplates.yourTurn.whatsapp,
                  genericTemplateData
                );
                break;
              default:
                fallbackMessage = `🎫 Queue Update - Your ticket has been updated. Status: ${notificationType}. Please check your queue position.`;
                break;
            }

            console.log(
              "📱 Sending fallback WhatsApp in shouldSendWhatsApp flow to:",
              customerPhone
            );

            const ultraMsgResponse = await fetch(
              `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  token: process.env.ULTRAMSG_TOKEN!,
                  to: `${customerPhone.replace(/^\+/, "")}@c.us`,
                  body: fallbackMessage,
                }),
              }
            );

            const ultraMsgResult = await ultraMsgResponse.json();
            console.log(
              "📱 shouldSendWhatsApp fallback result:",
              ultraMsgResult
            );

            const whatsappSuccess = ultraMsgResult.sent === true;

            whatsappFallbackResult = {
              attempted: true,
              success: whatsappSuccess,
              phone: customerPhone,
              fallbackUsed: true,
            };

            console.log(
              "WhatsApp fallback result (shouldSendWhatsApp):",
              whatsappFallbackResult
            );
          } catch (fallbackError) {
            console.error(
              "❌ shouldSendWhatsApp fallback error:",
              fallbackError
            );
            whatsappFallbackResult = {
              attempted: true,
              success: false,
              error:
                fallbackError instanceof Error
                  ? fallbackError.message
                  : "Unknown error",
              fallbackUsed: true,
            };
          }
        }
      } catch (whatsappError) {
        console.error("WhatsApp fallback error:", whatsappError);
        whatsappFallbackResult = {
          attempted: true,
          success: false,
          error:
            whatsappError instanceof Error
              ? whatsappError.message
              : "Unknown error",
        };
      }
    }

    if (successCount > 0) {
      return NextResponse.json(
        {
          success: true,
          message: `Push notification sent successfully`,
          results: {
            total: subscriptions.length,
            success: successCount,
            failed: failureCount,
            details: pushResults,
          },
          whatsappFallback: whatsappFallbackResult,
        },
        { headers: corsHeaders }
      );
    } else {
      return NextResponse.json(
        {
          success: whatsappFallbackResult?.success || false,
          message: whatsappFallbackResult?.success
            ? "Push notification failed, but WhatsApp fallback succeeded"
            : "All push notifications failed" +
              (whatsappFallbackResult?.attempted
                ? ", WhatsApp fallback also failed"
                : ""),
          shouldFallback: !whatsappFallbackResult?.success,
          results: {
            total: subscriptions.length,
            success: successCount,
            failed: failureCount,
            details: pushResults,
          },
          whatsappFallback: whatsappFallbackResult,
        },
        {
          status: whatsappFallbackResult?.success ? 200 : 500,
          headers: corsHeaders,
        }
      );
    }
  } catch (error) {
    console.error("Push notification API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Helper function to log notification attempts
 */
async function logNotificationAttempt(
  organizationId: string,
  ticketId: string,
  customerPhone: string | null, // Now optional
  ticketNumber: string,
  notificationType: string,
  deliveryMethod: string,
  success: boolean,
  errorMessage?: string
) {
  try {
    await supabase.from("notification_logs").insert({
      organization_id: organizationId,
      ticket_id: ticketId, // Use ticket ID as primary identifier
      customer_phone: customerPhone, // Optional
      ticket_number: ticketNumber,
      notification_type: notificationType,
      delivery_method: deliveryMethod,
      push_success: deliveryMethod === "push" ? success : null,
      push_error: deliveryMethod === "push" && !success ? errorMessage : null,
      whatsapp_success: deliveryMethod === "whatsapp" ? success : null,
      whatsapp_error:
        deliveryMethod === "whatsapp" && !success ? errorMessage : null,
    });
  } catch (error) {
    console.error("Failed to log notification attempt:", error);
  }
}
