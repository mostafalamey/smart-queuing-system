// Notification Logs Cleanup Manager Component
// Integrates with existing TicketCleanupManager for comprehensive database management

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAppToast } from "@/hooks/useAppToast";

interface NotificationStats {
  organizationName: string;
  totalLogs: number;
  successfulCount: number;
  failedCount: number;
  cleanableSuccessful: number;
  cleanableFailed: number;
  recommendedAction: string;
  priorityLevel: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  estimatedSavingsKb: number;
  oldestLog: string;
  newestLog: string;
}

interface CleanupResult {
  organizationName: string;
  successfulDeleted: number;
  failedDeleted: number;
  totalDeleted: number;
}

interface NotificationCleanupManagerProps {
  className?: string;
  organizationId?: string; // If provided, show only this org's stats
}

export default function NotificationCleanupManager({
  className = "",
  organizationId,
}: NotificationCleanupManagerProps) {
  const [stats, setStats] = useState<NotificationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cleanupSettings, setCleanupSettings] = useState({
    cleanupSuccessful: true,
    cleanupFailed: true,
    failedRetentionHours: 24,
    dryRun: true,
  });
  const { showSuccess, showError } = useAppToast();

  useEffect(() => {
    fetchNotificationStats();
  }, [organizationId]);

  const fetchNotificationStats = async () => {
    try {
      setLoading(true);

      // Get cleanup recommendations
      const { data: recommendations, error } = await supabase.rpc(
        "get_organization_cleanup_recommendations"
      );

      if (error) throw error;

      // Filter by organization if specified
      const filteredData = organizationId
        ? recommendations.filter(
            (r: any) => r.organization_id === organizationId
          )
        : recommendations;

      setStats(
        filteredData.map((item: any) => ({
          organizationName: item.organization_name,
          totalLogs: item.total_logs,
          successfulCount: 0, // Would need separate query for this detail
          failedCount: 0,
          cleanableSuccessful: item.successful_cleanable,
          cleanableFailed: item.failed_cleanable,
          recommendedAction: item.recommendation,
          priorityLevel: item.priority_level,
          estimatedSavingsKb: item.estimated_savings_kb,
          oldestLog: "",
          newestLog: "",
        }))
      );
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      showError("Failed to load notification statistics");
    } finally {
      setLoading(false);
    }
  };

  const performCleanup = async (orgIds?: string[], emergency = false) => {
    try {
      setCleaning(true);

      if (emergency) {
        // Emergency cleanup - all notifications
        const { data, error } = await supabase.rpc(
          "emergency_cleanup_all_notifications",
          {
            confirm_deletion: !cleanupSettings.dryRun,
          }
        );

        if (error) throw error;

        const result = data[0];
        showSuccess(
          `Emergency cleanup: ${result.total_deleted} notifications deleted from ${result.organizations_affected} organizations`
        );
      } else {
        // Standard bulk cleanup
        const { data, error } = await supabase.rpc(
          "safe_bulk_cleanup_notifications",
          {
            organization_ids: orgIds || null,
            dry_run: cleanupSettings.dryRun,
            cleanup_successful: cleanupSettings.cleanupSuccessful,
            cleanup_failed_older_than_hours:
              cleanupSettings.failedRetentionHours,
          }
        );

        if (error) throw error;

        const totalDeleted = data.reduce(
          (sum: number, item: any) => sum + item.total_would_delete,
          0
        );
        const action = cleanupSettings.dryRun ? "would delete" : "deleted";

        showSuccess(
          `${
            cleanupSettings.dryRun ? "DRY RUN: " : ""
          }${totalDeleted} notifications ${action}`
        );

        // Show detailed results
        data.forEach((result: any) => {
          if (result.total_would_delete > 0) {
            console.log(
              `${result.organization_name}: ${result.total_would_delete} notifications ${action}`
            );
          }
        });
      }

      // Refresh stats
      await fetchNotificationStats();
    } catch (error) {
      console.error("Error during cleanup:", error);
      showError("Cleanup failed: " + (error as Error).message);
    } finally {
      setCleaning(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "text-red-600 bg-red-50";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-50";
      case "LOW":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-green-600 bg-green-50";
    }
  };

  const formatFileSize = (kb: number) => {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalCleanableLogs = stats.reduce(
    (sum, stat) => sum + stat.cleanableSuccessful + stat.cleanableFailed,
    0
  );

  const totalEstimatedSavings = stats.reduce(
    (sum, stat) => sum + stat.estimatedSavingsKb,
    0
  );

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Notification Logs Management
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Clean up push notification logs to optimize database performance
            </p>
          </div>
          <button
            onClick={() => fetchNotificationStats()}
            disabled={loading}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {stats.length}
            </div>
            <div className="text-sm text-gray-500">Organizations</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {totalCleanableLogs}
            </div>
            <div className="text-sm text-gray-500">Cleanable Logs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatFileSize(totalEstimatedSavings)}
            </div>
            <div className="text-sm text-gray-500">Est. Savings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {
                stats.filter(
                  (s) =>
                    s.priorityLevel === "HIGH" || s.priorityLevel === "MEDIUM"
                ).length
              }
            </div>
            <div className="text-sm text-gray-500">Need Cleanup</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => performCleanup()}
            disabled={cleaning || totalCleanableLogs === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cleaning ? "⏳ Processing..." : "🧹 Quick Cleanup"}
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            ⚙️ Advanced Options
          </button>

          {totalCleanableLogs > 1000 && (
            <button
              onClick={() => {
                if (
                  confirm(
                    "⚠️ This will delete ALL notification logs. Are you sure?"
                  )
                ) {
                  performCleanup(undefined, true);
                }
              }}
              disabled={cleaning}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              🚨 Emergency Cleanup
            </button>
          )}
        </div>
      </div>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <h4 className="font-medium text-gray-900 mb-4">Cleanup Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cleanupSettings.cleanupSuccessful}
                  onChange={(e) =>
                    setCleanupSettings((prev) => ({
                      ...prev,
                      cleanupSuccessful: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Clean successful notifications (older than 1 hour)
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cleanupSettings.cleanupFailed}
                  onChange={(e) =>
                    setCleanupSettings((prev) => ({
                      ...prev,
                      cleanupFailed: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Clean failed notifications
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Failed notification retention (hours)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={cleanupSettings.failedRetentionHours}
                onChange={(e) =>
                  setCleanupSettings((prev) => ({
                    ...prev,
                    failedRetentionHours: parseInt(e.target.value) || 24,
                  }))
                }
                className="input-field"
                placeholder="Hours to keep failed notifications"
                title="Number of hours to keep failed notifications before cleanup"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cleanupSettings.dryRun}
                  onChange={(e) =>
                    setCleanupSettings((prev) => ({
                      ...prev,
                      dryRun: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Dry run (preview only, don't delete)
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Organization Stats */}
      <div className="p-6">
        <h4 className="font-medium text-gray-900 mb-4">
          Organization Statistics
        </h4>

        {stats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            ✅ No notification logs found - your database is clean!
          </div>
        ) : (
          <div className="space-y-3">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">
                      {stat.organizationName}
                    </h5>
                    <p className="text-sm text-gray-600 mt-1">
                      {stat.totalLogs} total logs •
                      {stat.cleanableSuccessful + stat.cleanableFailed}{" "}
                      cleanable •{formatFileSize(stat.estimatedSavingsKb)}{" "}
                      potential savings
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                        stat.priorityLevel
                      )}`}
                    >
                      {stat.priorityLevel}
                    </span>

                    {stat.cleanableSuccessful + stat.cleanableFailed > 0 && (
                      <button
                        onClick={() => performCleanup([stat.organizationName])}
                        disabled={cleaning}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Clean
                      </button>
                    )}
                  </div>
                </div>

                {stat.recommendedAction !== "No cleanup needed" && (
                  <div className="mt-2 text-sm text-gray-600">
                    💡 {stat.recommendedAction}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
