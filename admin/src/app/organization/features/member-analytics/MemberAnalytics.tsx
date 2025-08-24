"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  Users,
  TrendingUp,
  Calendar,
  Shield,
  Building2,
  UserCheck,
  Clock,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";

interface MemberAnalytics {
  total_members: number;
  active_members: number;
  pending_members: number;
  role_distribution: {
    admin: number;
    manager: number;
    employee: number;
  };
  recent_joins: number; // last 30 days
  acceptance_rate: number;
  avg_time_to_accept: number; // in days
  onboarding_stats: {
    completed: number;
    skipped: number;
    pending: number;
    completion_rate: number;
  };
  branch_distribution: Array<{
    branch_id: string;
    branch_name: string;
    member_count: number;
  }>;
  department_distribution: Array<{
    department_id: string;
    department_name: string;
    member_count: number;
  }>;
  member_activity: Array<{
    date: string;
    joins: number;
    invitations: number;
  }>;
}

interface MemberAnalyticsProps {
  organizationId: string;
  currentUserRole: string;
}

export const MemberAnalytics: React.FC<MemberAnalyticsProps> = ({
  organizationId,
  currentUserRole,
}) => {
  const [analytics, setAnalytics] = useState<MemberAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const canViewAnalytics = ["admin", "manager"].includes(currentUserRole);

  useEffect(() => {
    if (canViewAnalytics) {
      fetchMemberAnalytics();
    }
  }, [organizationId, timeRange, canViewAnalytics]);

  const fetchMemberAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all members for the organization
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select(
          `
          *,
          branches:branch_id(id, name)
        `
        )
        .eq("organization_id", organizationId);

      if (membersError) throw membersError;

      // Fetch branches and departments for better analytics
      const { data: branches, error: branchesError } = await supabase
        .from("branches")
        .select("id, name")
        .eq("organization_id", organizationId);

      if (branchesError) throw branchesError;

      const { data: departments, error: deptError } = await supabase
        .from("departments")
        .select("id, name, branch_id")
        .in("branch_id", branches?.map((b) => b.id) || []);

      if (deptError) throw deptError;

      // Calculate analytics
      const totalMembers = members?.length || 0;
      const activeMembers = members?.filter((m) => m.is_active).length || 0;
      const pendingMembers = members?.filter((m) => !m.is_active).length || 0;

      // Role distribution
      const roleDistribution = {
        admin:
          members?.filter((m) => m.role === "admin" && m.is_active).length || 0,
        manager:
          members?.filter((m) => m.role === "manager" && m.is_active).length ||
          0,
        employee:
          members?.filter((m) => m.role === "employee" && m.is_active).length ||
          0,
      };

      // Recent joins (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentJoins =
        members?.filter(
          (m) =>
            m.is_active &&
            new Date(m.updated_at || m.created_at) >= thirtyDaysAgo
        ).length || 0;

      // Acceptance rate
      const acceptanceRate =
        totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

      // Average time to accept (simplified calculation)
      const acceptedMembers =
        members?.filter((m) => m.is_active && m.updated_at !== m.created_at) ||
        [];
      const avgTimeToAccept =
        acceptedMembers.length > 0
          ? acceptedMembers.reduce((acc, member) => {
              const created = new Date(member.created_at);
              const updated = new Date(member.updated_at || member.created_at);
              const diffDays = Math.max(
                0,
                Math.floor(
                  (updated.getTime() - created.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              );
              return acc + diffDays;
            }, 0) / acceptedMembers.length
          : 0;

      // Onboarding statistics
      const onboardingCompleted =
        members?.filter((m) => m.is_active && m.onboarding_completed).length ||
        0;
      const onboardingSkipped =
        members?.filter((m) => m.is_active && m.onboarding_skipped).length || 0;
      const onboardingPending =
        activeMembers - onboardingCompleted - onboardingSkipped;
      const onboardingCompletionRate =
        activeMembers > 0
          ? Math.round(
              ((onboardingCompleted + onboardingSkipped) / activeMembers) * 100
            )
          : 0;

      const onboardingStats = {
        completed: onboardingCompleted,
        skipped: onboardingSkipped,
        pending: Math.max(0, onboardingPending),
        completion_rate: onboardingCompletionRate,
      };

      // Branch distribution
      const branchDistribution =
        branches
          ?.map((branch) => {
            const memberCount =
              members?.filter((m) => m.is_active && m.branch_id === branch.id)
                .length || 0;
            return {
              branch_id: branch.id,
              branch_name: branch.name,
              member_count: memberCount,
            };
          })
          .filter((b) => b.member_count > 0) || [];

      // Department distribution (simplified)
      const departmentDistribution =
        departments
          ?.map((dept) => {
            const memberCount =
              members?.filter(
                (m) =>
                  m.is_active &&
                  m.department_ids &&
                  Array.isArray(m.department_ids) &&
                  m.department_ids.includes(dept.id)
              ).length || 0;
            return {
              department_id: dept.id,
              department_name: dept.name,
              member_count: memberCount,
            };
          })
          .filter((d) => d.member_count > 0) || [];

      // Member activity (simplified - last 7 days)
      const memberActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];

        const joins =
          members?.filter((m) => {
            const joinDate = new Date(m.updated_at || m.created_at)
              .toISOString()
              .split("T")[0];
            return m.is_active && joinDate === dateStr;
          }).length || 0;

        const invitations =
          members?.filter((m) => {
            const inviteDate = new Date(m.created_at)
              .toISOString()
              .split("T")[0];
            return inviteDate === dateStr;
          }).length || 0;

        memberActivity.push({
          date: dateStr,
          joins,
          invitations,
        });
      }

      const analyticsData: MemberAnalytics = {
        total_members: totalMembers,
        active_members: activeMembers,
        pending_members: pendingMembers,
        role_distribution: roleDistribution,
        recent_joins: recentJoins,
        acceptance_rate: acceptanceRate,
        avg_time_to_accept: Math.round(avgTimeToAccept * 10) / 10, // Round to 1 decimal
        onboarding_stats: onboardingStats,
        branch_distribution: branchDistribution,
        department_distribution: departmentDistribution,
        member_activity: memberActivity,
      };

      setAnalytics(analyticsData);

      logger.info("Member analytics fetched successfully", {
        totalMembers,
        activeMembers,
        acceptanceRate,
      });
    } catch (error) {
      logger.error("Error fetching member analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!canViewAnalytics) {
    return (
      <div className="analytics-card border p-8 text-center">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Access Restricted
        </h3>
        <p className="text-gray-500">
          Only administrators and managers can view member analytics.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="analytics-card rounded-lg border p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-card rounded-lg border p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Unable to Load Analytics
        </h3>
        <p className="text-gray-500">
          There was an error loading the member analytics data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">
            Member Analytics
          </h2>
          <p className="text-sm text-gray-500">
            Insights into your organization's membership
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-500" htmlFor="timeRange">
            Time Range:
          </label>
          <select
            id="timeRange"
            value={timeRange}
            onChange={(e) =>
              setTimeRange(e.target.value as "7d" | "30d" | "90d")
            }
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            title="Select time range for analytics"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="analytics-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Members</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.total_members}
              </p>
            </div>
          </div>
        </div>

        <div className="analytics-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Active Members
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.active_members}
              </p>
            </div>
          </div>
        </div>

        <div className="analytics-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.pending_members}
              </p>
            </div>
          </div>
        </div>

        <div className="analytics-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <GraduationCap className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Onboarding Rate
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.onboarding_stats.completion_rate}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="analytics-card rounded-lg border p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Acceptance Rate
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {analytics.acceptance_rate}%
              </p>
            </div>
          </div>
        </div>

        <div className="analytics-card rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Onboarding Progress
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Completed</span>
              <span className="text-sm font-medium text-green-600">
                {analytics.onboarding_stats.completed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Skipped</span>
              <span className="text-sm font-medium text-yellow-600">
                {analytics.onboarding_stats.skipped}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Pending</span>
              <span className="text-sm font-medium text-gray-600">
                {analytics.onboarding_stats.pending}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="analytics-card rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">New joins (30 days)</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.recent_joins}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Avg. acceptance time
              </span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.avg_time_to_accept > 0
                  ? `${analytics.avg_time_to_accept} days`
                  : "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="analytics-card rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Role Distribution
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Administrators
              </span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.role_distribution.admin}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Managers
              </span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.role_distribution.manager}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 flex items-center">
                <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                Employees
              </span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.role_distribution.employee}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Distribution */}
      {analytics.branch_distribution.length > 0 && (
        <div className="analytics-card rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Members by Branch
          </h3>
          <div className="space-y-3">
            {analytics.branch_distribution.map((branch) => (
              <div
                key={branch.branch_id}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-gray-600">
                  {branch.branch_name}
                </span>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 w-8 text-right">
                    {branch.member_count}
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    (
                    {Math.round(
                      (branch.member_count / analytics.active_members) * 100
                    )}
                    %)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Activity Chart (Simplified) */}
      <div className="analytics-card rounded-lg border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Daily Activity (Last 7 Days)
        </h3>
        <div className="space-y-3">
          {analytics.member_activity.map((day) => (
            <div key={day.date} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {new Date(day.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">Invites:</span>
                  <span className="text-sm font-medium text-blue-600">
                    {day.invitations}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-gray-500 mr-1">Joins:</span>
                  <span className="text-sm font-medium text-green-600">
                    {day.joins}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Key Insights</h3>
        <div className="text-sm text-blue-700 space-y-1">
          {analytics.acceptance_rate >= 80 && (
            <p>
              ✓ Great acceptance rate! Your invitation process is working well.
            </p>
          )}
          {analytics.acceptance_rate < 60 && (
            <p>
              ⚠ Low acceptance rate - consider following up on pending
              invitations.
            </p>
          )}
          {analytics.pending_members > analytics.active_members * 0.3 && (
            <p>
              ⚠ High number of pending invitations - consider cleaning up old
              invites.
            </p>
          )}
          {analytics.recent_joins > 0 && (
            <p>
              📈 {analytics.recent_joins} new members joined in the last 30
              days.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
