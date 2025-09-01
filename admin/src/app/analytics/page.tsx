"use client";

import React, { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RoleRestrictedAccess } from "@/components/RoleRestrictedAccess";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { Sparkles, BarChart3, Activity } from "lucide-react";

// Original components
import { AnalyticsHeader } from "./features/analytics-header";
import { AnalyticsFilters } from "./features/analytics-filters";
import { KPISection } from "./features/kpi-section";
import { QueuePerformanceSection } from "./features/queue-performance";
import { VolumeSection } from "./features/volume-section";

// Enhanced historical components
import { HistoricalTrendsSection } from "./features/historical-trends";
import { PredictiveInsightsSection } from "./features/predictive-insights";
import { PeakPatternsAnalysisSection } from "./features/peak-patterns";

// Phase 1 Enhanced Components
import { RealTimeAnalyticsDashboard } from "./components/RealTimeAnalyticsDashboard";
import { PredictiveChart } from "./components/charts/PredictiveChart";
import { HeatmapChart } from "./components/charts/HeatmapChart";

// Hooks
import { useAnalyticsData } from "./hooks/useAnalyticsData";
import { useEnhancedAnalyticsData } from "./hooks/useEnhancedAnalyticsData";
import { useAdvancedAnalyticsProcessing } from "./hooks/useAdvancedAnalyticsProcessing";
import { useHistoricalTicketData } from "./hooks/useHistoricalTicketData";

// Data transformation utilities
import {
  transformHistoricalTicketsToAnalytics,
  aggregateTicketsByHour,
  createHeatmapData,
  formatForPredictiveChart,
} from "./utils/analytics-data-utils";

export default function AnalyticsPage() {
  const { userProfile } = useAuth();
  const { canAccessAnalytics, userRole } = useRolePermissions();
  const [analyticsMode, setAnalyticsMode] = useState<
    "standard" | "enhanced" | "phase1"
  >("phase1");

  // Standard analytics data (existing implementation)
  const standardAnalytics = useAnalyticsData();

  // Enhanced analytics data (new historical implementation)
  const enhancedAnalytics = useEnhancedAnalyticsData();

  // Phase 1: Real historical data from Supabase
  const {
    data: historicalData,
    loading: historicalLoading,
    error: historicalError,
  } = useHistoricalTicketData({ timeRange: "7d" });

  // Phase 1 advanced processing
  const { processHistoricalData } = useAdvancedAnalyticsProcessing();

  // Process historical data for Phase 1 charts
  const realHistoricalData = useMemo(() => {
    if (!historicalData?.tickets?.length) return [];
    const timeSeriesData = aggregateTicketsByHour(historicalData.tickets);
    return formatForPredictiveChart(timeSeriesData);
  }, [historicalData?.tickets]);

  // Generate real heatmap data
  const realHeatmapData = useMemo(() => {
    if (!historicalData?.tickets?.length) return [];
    return createHeatmapData(historicalData.tickets);
  }, [historicalData?.tickets]);

  // Choose which analytics to use based on mode
  const currentAnalytics =
    analyticsMode === "enhanced" ? enhancedAnalytics : standardAnalytics;

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
      <div className="max-h-screen overflow-y-auto">
        {/* Analytics Header with Padding */}
        <div className="p-4 lg:p-6 mb-0">
          <AnalyticsHeader onRefresh={currentAnalytics.refreshData} />
        </div>
        {/* Tab Navigation */}
        <div className="px-4 lg:px-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setAnalyticsMode("standard")}
              className={`tab-button flex items-center ${
                analyticsMode === "standard" ? "active" : ""
              }`}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Standard Analytics
            </button>
            <button
              onClick={() => setAnalyticsMode("enhanced")}
              className={`tab-button flex items-center ${
                analyticsMode === "enhanced" ? "active" : ""
              }`}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Enhanced Analytics
            </button>
            <button
              onClick={() => setAnalyticsMode("phase1")}
              className={`tab-button flex items-center ${
                analyticsMode === "phase1" ? "active" : ""
              }`}
            >
              <Activity className="h-4 w-4 mr-2" />
              Phase 1 Analytics
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                New
              </span>
            </button>
          </nav>
        </div>

        {/* Content with padding */}
        <div className="p-4 lg:p-6">
          {/* Filters Section */}
          <AnalyticsFilters
            timeRange={currentAnalytics.timeRange}
            setTimeRange={currentAnalytics.setTimeRange}
            selectedBranch={currentAnalytics.selectedBranch}
            setSelectedBranch={currentAnalytics.setSelectedBranch}
            selectedDepartment={currentAnalytics.selectedDepartment}
            setSelectedDepartment={currentAnalytics.setSelectedDepartment}
            branches={currentAnalytics.branches}
            departments={currentAnalytics.departments}
            loading={currentAnalytics.loading}
          />

          {/* Analytics Content */}
          {analyticsMode === "standard" ? (
            <div className="space-y-6">
              {/* Standard Analytics View */}
              <KPISection
                data={currentAnalytics.analyticsData}
                loading={currentAnalytics.loading}
              />
              <QueuePerformanceSection
                data={currentAnalytics.analyticsData}
                loading={currentAnalytics.loading}
              />
              <VolumeSection
                data={currentAnalytics.analyticsData}
                loading={currentAnalytics.loading}
              />
            </div>
          ) : analyticsMode === "phase1" ? (
            <div className="space-y-8">
              {/* Phase 1 Advanced Analytics */}

              {/* Real-Time Dashboard */}
              {userProfile?.organization_id && (
                <RealTimeAnalyticsDashboard
                  organizationId={userProfile.organization_id}
                  refreshInterval={5000}
                />
              )}

              {/* Enhanced Visualizations Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Predictive Chart with Real Data */}
                <div className="space-y-4">
                  <PredictiveChart
                    historicalData={
                      realHistoricalData.length > 0 ? realHistoricalData : []
                    }
                    predictions={[
                      {
                        timestamp: new Date(Date.now() + 60 * 60 * 1000),
                        predicted:
                          realHistoricalData.length > 0
                            ? Math.round(
                                realHistoricalData
                                  .slice(-6)
                                  .reduce((sum, item) => sum + item.actual, 0) /
                                  6
                              )
                            : 12,
                        confidence: { lower: 8, upper: 16 },
                      },
                    ]}
                    title="Queue Length Prediction (Real Data)"
                    loading={historicalLoading}
                  />
                </div>

                {/* Heatmap Chart with Real Data */}
                <HeatmapChart
                  data={realHeatmapData.length > 0 ? realHeatmapData : []}
                  title="Peak Hours Analysis (Real Data)"
                  loading={historicalLoading}
                />
              </div>

              {/* Phase 1 Info Banner */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Activity className="h-6 w-6 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">
                    Phase 1: Real Data Analytics Engine
                  </h3>
                  {historicalData?.totalCount && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {historicalData.totalCount} Real Tickets Loaded
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">
                      ✅ Implemented Features:
                    </h4>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Real-time metrics from Supabase</li>
                      <li>• Historical data from tickets_archive</li>
                      <li>• Predictive analysis on real patterns</li>
                      <li>• Actual peak hours heatmap</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">
                      � Data Status:
                    </h4>
                    <ul className="space-y-1 text-blue-700">
                      <li>
                        • Organization:{" "}
                        {userProfile?.organization_id ? "HYPER1" : "Loading..."}
                      </li>
                      <li>
                        • Historical Tickets:{" "}
                        {historicalData?.totalCount || "Loading..."}
                      </li>
                      <li>
                        • Data Quality:{" "}
                        {historicalData?.dataQuality?.completedPercentage ||
                          "--"}
                        % Complete
                      </li>
                      <li>
                        • Date Range:{" "}
                        {historicalData?.dateRange?.earliest
                          ? new Date(
                              historicalData.dateRange.earliest
                            ).toLocaleDateString()
                          : "Loading..."}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Enhanced Analytics View */}

              {/* KPI Section (Enhanced with historical data) */}
              <KPISection
                data={currentAnalytics.analyticsData}
                loading={currentAnalytics.loading}
              />

              {/* Historical Trends Analysis */}
              <HistoricalTrendsSection
                analyticsData={enhancedAnalytics.analyticsData}
                loading={enhancedAnalytics.loading}
              />

              {/* Predictive Insights */}
              <PredictiveInsightsSection
                analyticsData={enhancedAnalytics.analyticsData}
                loading={enhancedAnalytics.loading}
              />

              {/* Peak Patterns Analysis */}
              <PeakPatternsAnalysisSection
                analyticsData={enhancedAnalytics.analyticsData}
                loading={enhancedAnalytics.loading}
              />

              {/* Standard Queue Performance (for comparison) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <QueuePerformanceSection
                  data={currentAnalytics.analyticsData}
                  loading={currentAnalytics.loading}
                />
                <VolumeSection
                  data={currentAnalytics.analyticsData}
                  loading={currentAnalytics.loading}
                />
              </div>
            </div>
          )}

          {/* Error State */}
          {currentAnalytics.error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <span className="font-medium">Analytics Error:</span>
                <span>{currentAnalytics.error}</span>
              </div>
              <button
                onClick={currentAnalytics.refreshData}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try refreshing the data
              </button>
            </div>
          )}

          {/* Enhanced Mode Info Banner */}
          {analyticsMode === "enhanced" &&
            !enhancedAnalytics.loading &&
            !enhancedAnalytics.analyticsData && (
              <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">
                    Enhanced Analytics
                  </h3>
                </div>
                <p className="text-purple-800 mb-2">
                  Enhanced analytics uses historical data to provide predictive
                  insights, trend analysis, and peak pattern identification.
                </p>
                <p className="text-purple-700 text-sm">
                  Historical data collection started with Phase 1
                  implementation. More insights will become available as data
                  accumulates over time.
                </p>
              </div>
            )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";
