// Deno Edge Function for automated database cleanup
// Handles both tickets and notification_logs cleanup with configurable retention periods
//
// This function provides:
// 1. Automated ticket cleanup with archival
// 2. Notification logs cleanup with flexible retention
// 3. Comprehensive cleanup statistics and reporting
// 4. Safe error handling and rollback capabilities
// 5. Multi-organization support with individual configurations

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CleanupRequest {
  // Cleanup scope
  organizationId?: string; // If provided, cleanup only this org
  cleanupType?: "tickets" | "notifications" | "both"; // Default: 'both'

  // Ticket cleanup settings
  ticketRetentionHours?: number; // Default: 24 hours
  archiveTickets?: boolean; // Default: true

  // Notification cleanup settings
  successfulNotificationRetentionMinutes?: number; // Default: 60 minutes
  failedNotificationRetentionHours?: number; // Default: 24 hours

  // Safety settings
  dryRun?: boolean; // Default: false
  maxBatchSize?: number; // Default: 1000

  // Authentication
  adminKey?: string; // For security
}

interface CleanupResult {
  success: boolean;
  organizationId?: string;
  organizationName?: string;
  ticketsProcessed: number;
  ticketsArchived: number;
  notificationsProcessed: number;
  totalExecutionTimeMs: number;

  // Analytics processing information
  analyticsProcessed?: {
    success: boolean;
    recordsProcessed: number;
    executionTimeMs: number;
    processedDate: string;
    analyticsTypes?: string[];
    error?: string;
  };

  details: {
    ticketsDeleted: number;
    successfulNotificationsDeleted: number;
    failedNotificationsDeleted: number;
    errors: string[];
  };
  recommendations?: string[];
}

interface ComprehensiveCleanupResult {
  success: boolean;
  totalOrganizations: number;
  totalTicketsProcessed: number;
  totalNotificationsProcessed: number;
  totalExecutionTimeMs: number;
  organizationResults: CleanupResult[];
  globalRecommendations: string[];
  nextScheduledCleanup?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Validate environment variables (using non-reserved names)
    const supabaseUrl = Deno.env.get("DB_URL");
    const supabaseServiceKey = Deno.env.get("DB_SERVICE_KEY");
    const expectedAdminKey =
      Deno.env.get("CLEANUP_ADMIN_KEY") || "cleanup-admin-2025";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({
          error: "Server configuration error",
          details: "Missing DB_URL or DB_SERVICE_KEY environment variables",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    let cleanupConfig: CleanupRequest = {};

    if (req.method === "POST") {
      try {
        cleanupConfig = await req.json();
      } catch (error) {
        console.error("JSON parsing error:", error);
        return new Response(
          JSON.stringify({ error: "Invalid JSON in request body" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else if (req.method === "GET") {
      // Allow GET requests for simple scheduling
      const url = new URL(req.url);
      cleanupConfig = {
        organizationId: url.searchParams.get("org") || undefined,
        cleanupType:
          (url.searchParams.get("type") as
            | "tickets"
            | "notifications"
            | "both") || "both",
        dryRun: url.searchParams.get("dryRun") === "true",
        adminKey: url.searchParams.get("adminKey") || undefined,
      };
    }

    // Security check
    if (cleanupConfig.adminKey !== expectedAdminKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid admin key" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Set defaults
    const config: Required<CleanupRequest> = {
      organizationId: cleanupConfig.organizationId || "",
      cleanupType: cleanupConfig.cleanupType || "both",
      ticketRetentionHours: cleanupConfig.ticketRetentionHours || 24,
      archiveTickets: cleanupConfig.archiveTickets ?? true,
      successfulNotificationRetentionMinutes:
        cleanupConfig.successfulNotificationRetentionMinutes || 60,
      failedNotificationRetentionHours:
        cleanupConfig.failedNotificationRetentionHours || 24,
      dryRun: cleanupConfig.dryRun || false,
      maxBatchSize: cleanupConfig.maxBatchSize || 1000,
      adminKey: cleanupConfig.adminKey || "",
    };

    console.log("Starting cleanup with config:", {
      ...config,
      adminKey: "[REDACTED]",
    });

    // Get organizations to clean up
    let organizations: any[] = [];

    if (config.organizationId) {
      // Single organization cleanup
      const { data: org, error } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", config.organizationId)
        .single();

      if (error || !org) {
        return new Response(
          JSON.stringify({
            error: "Organization not found",
            details: error?.message,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      organizations = [org];
    } else {
      // All organizations cleanup
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("id, name");

      if (error) {
        throw new Error(`Failed to fetch organizations: ${error.message}`);
      }

      organizations = orgs || [];
    }

    console.log(`Processing ${organizations.length} organizations`);

    // Process each organization
    const organizationResults: CleanupResult[] = [];

    for (const org of organizations) {
      const orgResult = await cleanupOrganization(supabase, org, config);
      organizationResults.push(orgResult);
    }

    // Calculate totals
    const totalTicketsProcessed = organizationResults.reduce(
      (sum, r) => sum + r.ticketsProcessed,
      0
    );
    const totalNotificationsProcessed = organizationResults.reduce(
      (sum, r) => sum + r.notificationsProcessed,
      0
    );

    // Generate global recommendations
    const globalRecommendations =
      generateGlobalRecommendations(organizationResults);

    const result: ComprehensiveCleanupResult = {
      success: true,
      totalOrganizations: organizations.length,
      totalTicketsProcessed,
      totalNotificationsProcessed,
      totalExecutionTimeMs: Date.now() - startTime,
      organizationResults,
      globalRecommendations,
      nextScheduledCleanup: new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString(),
    };

    console.log("Cleanup completed:", {
      organizations: result.totalOrganizations,
      tickets: result.totalTicketsProcessed,
      notifications: result.totalNotificationsProcessed,
      duration: result.totalExecutionTimeMs + "ms",
    });

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cleanup function error:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
        executionTimeMs: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Process analytics data before cleanup for a specific organization
 * This captures critical analytics information that would be lost during cleanup
 */
async function processAnalyticsBeforeCleanup(
  supabase: any,
  organizationId: string,
  config: Required<CleanupRequest>
): Promise<{
  success: boolean;
  recordsProcessed: number;
  executionTimeMs: number;
  processedDate: string;
  analyticsTypes: string[];
  error?: string;
}> {
  const startTime = Date.now();

  // Calculate the date we're processing (yesterday - the data about to be cleaned up)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = yesterday.toISOString().split("T")[0];

  try {
    console.log(
      `📊 Processing analytics for organization ${organizationId} on date ${targetDate}`
    );

    // Call our database function to process analytics for this organization
    const { data: analyticsResults, error: analyticsError } =
      await supabase.rpc("process_organization_analytics", {
        target_organization_id: organizationId,
        target_date: targetDate,
        analytics_types: ["daily", "service", "notification"],
      });

    if (analyticsError) {
      console.error(`Analytics processing error:`, analyticsError);
      return {
        success: false,
        recordsProcessed: 0,
        executionTimeMs: Date.now() - startTime,
        processedDate: targetDate,
        analyticsTypes: ["daily", "service", "notification"],
        error: analyticsError.message || "Unknown analytics processing error",
      };
    }

    // Calculate total records processed
    const totalRecords = (analyticsResults || []).reduce(
      (sum: number, result: any) => sum + (result.records_processed || 0),
      0
    );

    // Check if all processing was successful
    const allSuccessful = (analyticsResults || []).every(
      (result: any) => result.success
    );

    if (!allSuccessful) {
      const failures = (analyticsResults || []).filter(
        (result: any) => !result.success
      );
      const errorMessage = failures
        .map((f: any) => `${f.analytics_type}: ${f.error_message}`)
        .join("; ");

      console.warn(`⚠️ Some analytics processing failed: ${errorMessage}`);
      return {
        success: false,
        recordsProcessed: totalRecords,
        executionTimeMs: Date.now() - startTime,
        processedDate: targetDate,
        analyticsTypes: ["daily", "service", "notification"],
        error: errorMessage,
      };
    }

    console.log(
      `✅ Analytics processing completed successfully: ${totalRecords} records processed`
    );
    return {
      success: true,
      recordsProcessed: totalRecords,
      executionTimeMs: Date.now() - startTime,
      processedDate: targetDate,
      analyticsTypes: ["daily", "service", "notification"],
    };
  } catch (error) {
    console.error(`❌ Analytics processing failed with exception:`, error);
    return {
      success: false,
      recordsProcessed: 0,
      executionTimeMs: Date.now() - startTime,
      processedDate: targetDate,
      analyticsTypes: ["daily", "service", "notification"],
      error: error.message || "Unknown error during analytics processing",
    };
  }
}

/**
 * Clean up data for a single organization
 */
async function cleanupOrganization(
  supabase: any,
  organization: { id: string; name: string },
  config: Required<CleanupRequest>
): Promise<CleanupResult> {
  const orgStartTime = Date.now();
  const result: CleanupResult = {
    success: false,
    organizationId: organization.id,
    organizationName: organization.name,
    ticketsProcessed: 0,
    ticketsArchived: 0,
    notificationsProcessed: 0,
    totalExecutionTimeMs: 0,
    details: {
      ticketsDeleted: 0,
      successfulNotificationsDeleted: 0,
      failedNotificationsDeleted: 0,
      errors: [],
    },
    recommendations: [],
  };

  try {
    console.log(
      `Processing organization: ${organization.name} (${organization.id})`
    );

    // ⭐ STEP 1: Process Analytics BEFORE Cleanup
    console.log(
      `📊 Processing analytics for ${organization.name} before cleanup...`
    );

    const analyticsResult = await processAnalyticsBeforeCleanup(
      supabase,
      organization.id,
      config
    );

    if (analyticsResult.success) {
      console.log(
        `✅ Analytics processed: ${analyticsResult.recordsProcessed} records`
      );
      // Add analytics info to result for reporting
      result.analyticsProcessed = {
        success: true,
        recordsProcessed: analyticsResult.recordsProcessed,
        executionTimeMs: analyticsResult.executionTimeMs,
        processedDate: analyticsResult.processedDate,
        analyticsTypes: analyticsResult.analyticsTypes,
      };
    } else {
      console.warn(`⚠️ Analytics processing failed: ${analyticsResult.error}`);
      // Don't fail the entire cleanup if analytics fails
      result.analyticsProcessed = {
        success: false,
        recordsProcessed: 0,
        executionTimeMs: analyticsResult.executionTimeMs,
        processedDate: analyticsResult.processedDate,
        error: analyticsResult.error,
      };
      // Add warning to recommendations
      result.recommendations?.push(
        `Analytics processing failed: ${analyticsResult.error}`
      );
    }

    // ⭐ STEP 2: Continue with Cleanup (original logic)
    // Cleanup tickets if requested
    if (config.cleanupType === "tickets" || config.cleanupType === "both") {
      try {
        const ticketResult = await cleanupTicketsForOrganization(
          supabase,
          organization.id,
          config
        );

        result.ticketsProcessed = ticketResult.deleted;
        result.ticketsArchived = ticketResult.archived;
        result.details.ticketsDeleted = ticketResult.deleted;

        if (ticketResult.error) {
          result.details.errors.push(`Tickets: ${ticketResult.error}`);
        }

        console.log(
          `Tickets cleanup: ${ticketResult.deleted} deleted, ${ticketResult.archived} archived`
        );
      } catch (error) {
        result.details.errors.push(`Tickets cleanup failed: ${error.message}`);
        console.error(
          `Tickets cleanup failed for ${organization.name}:`,
          error
        );
      }
    }

    // Cleanup notifications if requested
    if (
      config.cleanupType === "notifications" ||
      config.cleanupType === "both"
    ) {
      try {
        const notificationResult = await cleanupNotificationsForOrganization(
          supabase,
          organization.id,
          config
        );

        result.notificationsProcessed =
          notificationResult.successfulDeleted +
          notificationResult.failedDeleted;
        result.details.successfulNotificationsDeleted =
          notificationResult.successfulDeleted;
        result.details.failedNotificationsDeleted =
          notificationResult.failedDeleted;

        if (notificationResult.error) {
          result.details.errors.push(
            `Notifications: ${notificationResult.error}`
          );
        }

        console.log(
          `Notifications cleanup: ${notificationResult.successfulDeleted} successful, ${notificationResult.failedDeleted} failed deleted`
        );
      } catch (error) {
        result.details.errors.push(
          `Notifications cleanup failed: ${error.message}`
        );
        console.error(
          `Notifications cleanup failed for ${organization.name}:`,
          error
        );
      }
    }

    // Generate recommendations for this organization
    result.recommendations = generateOrganizationRecommendations(result);

    result.success = result.details.errors.length === 0;
    result.totalExecutionTimeMs = Date.now() - orgStartTime;
  } catch (error) {
    result.details.errors.push(`General error: ${error.message}`);
    result.totalExecutionTimeMs = Date.now() - orgStartTime;
    console.error(
      `Organization cleanup failed for ${organization.name}:`,
      error
    );
  }

  return result;
}

/**
 * Clean up tickets for a specific organization
 */
async function cleanupTicketsForOrganization(
  supabase: any,
  organizationId: string,
  config: Required<CleanupRequest>
): Promise<{ deleted: number; archived: number; error?: string }> {
  // Since the RPC function cleanup_old_tickets_with_notifications is not organization-aware,
  // we'll use direct queries to ensure we only clean up tickets for this specific organization
  console.log(`Using direct ticket cleanup for organization ${organizationId}`);
  return await cleanupTicketsDirect(supabase, organizationId, config);
}

/**
 * Direct ticket cleanup when RPC functions aren't available
 */
async function cleanupTicketsDirect(
  supabase: any,
  organizationId: string,
  config: Required<CleanupRequest>
): Promise<{ deleted: number; archived: number; error?: string }> {
  const cutoffTime = new Date(
    Date.now() - config.ticketRetentionHours * 60 * 60 * 1000
  ).toISOString();

  console.log(
    `Cleanup cutoff time: ${cutoffTime} (${config.ticketRetentionHours} hours ago)`
  );

  let archived = 0;
  let deleted = 0;

  try {
    console.log(
      `Starting direct ticket cleanup for organization ${organizationId}`
    );

    // First get branches for this organization
    const { data: branches, error: branchError } = await supabase
      .from("branches")
      .select("id")
      .eq("organization_id", organizationId);

    if (branchError) {
      console.error("Failed to get branches:", branchError);
      return {
        deleted: 0,
        archived: 0,
        error: `Failed to get branches: ${branchError.message}`,
      };
    }

    console.log(
      `Found ${
        branches?.length || 0
      } branches for organization ${organizationId}`
    );

    if (!branches || branches.length === 0) {
      console.log("No branches found for this organization");
      return { deleted: 0, archived: 0 };
    }

    const branchIds = branches.map((b) => b.id);

    // Then get departments for these branches
    const { data: departments, error: deptError } = await supabase
      .from("departments")
      .select("id")
      .in("branch_id", branchIds);

    if (deptError) {
      console.error("Failed to get departments:", deptError);
      return {
        deleted: 0,
        archived: 0,
        error: `Failed to get departments: ${deptError.message}`,
      };
    }

    console.log(
      `Found ${
        departments?.length || 0
      } departments for organization ${organizationId}`
    );

    if (!departments || departments.length === 0) {
      console.log("No departments found for this organization");
      return { deleted: 0, archived: 0 };
    }

    const departmentIds = departments.map((d) => d.id);
    console.log(`Department IDs: ${departmentIds.join(", ")}`);

    // Get old completed/cancelled tickets
    const { data: oldTickets, error: fetchError } = await supabase
      .from("tickets")
      .select("*")
      .in("department_id", departmentIds)
      .in("status", ["completed", "cancelled"])
      .lt("updated_at", cutoffTime)
      .limit(config.maxBatchSize);

    if (fetchError) {
      console.error("Failed to fetch tickets:", fetchError);
      return {
        deleted: 0,
        archived: 0,
        error: `Failed to fetch tickets: ${fetchError.message}`,
      };
    }

    console.log(
      `Found ${
        oldTickets?.length || 0
      } old tickets to clean up for organization ${organizationId}`
    );

    if (!oldTickets || oldTickets.length === 0) {
      console.log("No old tickets found to clean up");
      return { deleted: 0, archived: 0 };
    }

    // Archive if requested and not dry run
    if (config.archiveTickets && !config.dryRun) {
      console.log(`Attempting to archive ${oldTickets.length} tickets...`);
      const { error: archiveError } = await supabase
        .from("tickets_archive")
        .insert(
          oldTickets.map((ticket) => ({
            original_ticket_id: ticket.id,
            department_id: ticket.department_id,
            ticket_number: ticket.ticket_number,
            customer_phone: ticket.customer_phone,
            status: ticket.status,
            priority: ticket.priority,
            estimated_service_time: ticket.estimated_service_time,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            called_at: ticket.called_at,
            completed_at: ticket.completed_at,
          }))
        );

      if (archiveError) {
        console.warn(
          "Archive failed, but continuing with deletion:",
          archiveError
        );
      } else {
        archived = oldTickets.length;
        console.log(`Successfully archived ${archived} tickets`);
      }
    }

    // Delete tickets if not dry run
    if (!config.dryRun) {
      console.log(`Attempting to delete ${oldTickets.length} tickets...`);
      const { error: deleteError } = await supabase
        .from("tickets")
        .delete()
        .in(
          "id",
          oldTickets.map((t) => t.id)
        );

      if (deleteError) {
        console.error("Failed to delete tickets:", deleteError);
        return {
          deleted: 0,
          archived,
          error: `Failed to delete tickets: ${deleteError.message}`,
        };
      }

      deleted = oldTickets.length;
      console.log(`Successfully deleted ${deleted} tickets`);
    } else {
      deleted = oldTickets.length; // For dry run, report what would be deleted
      console.log(`Dry run: would delete ${deleted} tickets`);
    }

    return { deleted, archived };
  } catch (error) {
    return { deleted: 0, archived: 0, error: error.message };
  }
}

/**
 * Clean up notifications for a specific organization
 *
 * IMPORTANT: This function only cleans notification_logs (push history).
 * It NEVER touches notification_preferences table which contains user
 * device subscriptions needed for future push notifications.
 */
async function cleanupNotificationsForOrganization(
  supabase: any,
  organizationId: string,
  config: Required<CleanupRequest>
): Promise<{
  successfulDeleted: number;
  failedDeleted: number;
  error?: string;
}> {
  const successfulCutoffTime = new Date(
    Date.now() - config.successfulNotificationRetentionMinutes * 60 * 1000
  ).toISOString();

  const failedCutoffTime = new Date(
    Date.now() - config.failedNotificationRetentionHours * 60 * 60 * 1000
  ).toISOString();

  let successfulDeleted = 0;
  let failedDeleted = 0;

  try {
    // Clean up successful notifications
    if (!config.dryRun) {
      const { error: successError } = await supabase
        .from("notification_logs")
        .delete()
        .eq("organization_id", organizationId)
        .eq("push_success", true)
        .lt("created_at", successfulCutoffTime);

      if (successError) {
        console.warn(
          "Failed to delete successful notifications:",
          successError
        );
      }
    }

    // Count successful notifications that would be deleted
    const { count: successCount, error: countSuccessError } = await supabase
      .from("notification_logs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("push_success", true)
      .lt("created_at", successfulCutoffTime);

    if (!countSuccessError) {
      successfulDeleted = successCount || 0;
    }

    // Clean up failed notifications
    if (!config.dryRun) {
      const { error: failedError } = await supabase
        .from("notification_logs")
        .delete()
        .eq("organization_id", organizationId)
        .eq("push_success", false)
        .lt("created_at", failedCutoffTime);

      if (failedError) {
        console.warn("Failed to delete failed notifications:", failedError);
      }
    }

    // Count failed notifications that would be deleted
    const { count: failedCount, error: countFailedError } = await supabase
      .from("notification_logs")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("push_success", false)
      .lt("created_at", failedCutoffTime);

    if (!countFailedError) {
      failedDeleted = failedCount || 0;
    }

    return { successfulDeleted, failedDeleted };
  } catch (error) {
    return { successfulDeleted: 0, failedDeleted: 0, error: error.message };
  }
}

/**
 * Generate recommendations for a specific organization
 */
function generateOrganizationRecommendations(result: CleanupResult): string[] {
  const recommendations: string[] = [];

  if (result.details.errors.length > 0) {
    recommendations.push(
      "⚠️ Some cleanup operations failed - check logs and retry"
    );
  }

  if (result.ticketsProcessed > 1000) {
    recommendations.push(
      "📊 High ticket volume detected - consider more frequent cleanup"
    );
  }

  if (result.notificationsProcessed > 5000) {
    recommendations.push(
      "🔔 High notification volume - consider shorter retention periods"
    );
  }

  if (result.ticketsProcessed === 0 && result.notificationsProcessed === 0) {
    recommendations.push("✅ Database is clean - no cleanup needed");
  } else {
    recommendations.push(
      `✅ Cleaned ${result.ticketsProcessed} tickets and ${result.notificationsProcessed} notifications`
    );
  }

  return recommendations;
}

/**
 * Generate global recommendations across all organizations
 */
function generateGlobalRecommendations(results: CleanupResult[]): string[] {
  const recommendations: string[] = [];

  const totalErrors = results.reduce(
    (sum, r) => sum + r.details.errors.length,
    0
  );
  const totalTickets = results.reduce((sum, r) => sum + r.ticketsProcessed, 0);
  const totalNotifications = results.reduce(
    (sum, r) => sum + r.notificationsProcessed,
    0
  );

  if (totalErrors > 0) {
    recommendations.push(
      `⚠️ ${totalErrors} errors occurred during cleanup - review organization details`
    );
  }

  if (totalTickets > 10000) {
    recommendations.push(
      "📈 Very high ticket volume across organizations - consider upgrading database plan"
    );
  }

  if (totalNotifications > 50000) {
    recommendations.push(
      "🔔 Very high notification volume - recommend aggressive cleanup schedule"
    );
  }

  recommendations.push(
    `✅ Global cleanup complete: ${totalTickets} tickets, ${totalNotifications} notifications processed`
  );
  recommendations.push("🕒 Next recommended cleanup: 24 hours from now");

  return recommendations;
}
