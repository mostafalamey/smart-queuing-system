"use client";

import React from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RoleRestrictedAccess } from "@/components/RoleRestrictedAccess";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { AnalyticsHeader } from "./features/analytics-header";
import { AnalyticsFilters } from "./features/analytics-filters";
import { KPISection } from "./features/kpi-section";
import { QueuePerformanceSection } from "./features/queue-performance";
import { VolumeSection } from "./features/volume-section";
import { useAnalyticsData } from "./hooks/useAnalyticsData";

export default function AnalyticsPage() {
  const { userProfile } = useAuth();
  const { canAccessAnalytics, userRole } = useRolePermissions();

  const {
    selectedBranch,
    setSelectedBranch,
    selectedDepartment,
    setSelectedDepartment,
    timeRange,
    setTimeRange,
    analyticsData,
    loading,
    error,
    branches,
    departments,
    refreshData,
  } = useAnalyticsData();

  if (!canAccessAnalytics) {
    return (
      <DashboardLayout>
        <RoleRestrictedAccess
          allowedRoles={["admin", "manager"]}
          showMessage={true}
        >
          {/* This won't render due to role restriction */}
          <div />
        </RoleRestrictedAccess>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 max-h-screen overflow-y-auto">
        {/* Analytics Header */}
        <AnalyticsHeader onRefresh={refreshData} />

        {/* Filters Section */}
        <AnalyticsFilters
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          selectedDepartment={selectedDepartment}
          setSelectedDepartment={setSelectedDepartment}
          branches={branches}
          departments={departments}
          loading={loading}
        />

        {/* KPI Cards */}
        <KPISection data={analyticsData} loading={loading} />

        {/* Queue Performance Section */}
        <QueuePerformanceSection data={analyticsData} loading={loading} />

        {/* Volume & Throughput Section */}
        <VolumeSection data={analyticsData} loading={loading} />
      </div>
    </DashboardLayout>
  );
}

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";
