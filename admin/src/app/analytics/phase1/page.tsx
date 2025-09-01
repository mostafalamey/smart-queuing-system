"use client";

import React, { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { RoleRestrictedAccess } from "@/components/RoleRestrictedAccess";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { Sparkles, BarChart3, TrendingUp, Activity } from "lucide-react";

// Phase 1 Enhanced Components
import { RealTimeAnalyticsDashboard } from "../components/RealTimeAnalyticsDashboard";
import { PredictiveChart } from "../components/charts/PredictiveChart";
import { HeatmapChart } from "../components/charts/HeatmapChart";

// Original components (keep for compatibility)
import { AnalyticsHeader } from "../features/analytics-header";
import { AnalyticsFilters } from "../features/analytics-filters";
import { KPISection } from "../features/kpi-section";

// Enhanced hooks
import { useAnalyticsData } from "../hooks/useAnalyticsData";
import { useAdvancedAnalyticsProcessing } from "../hooks/useAdvancedAnalyticsProcessing";
import { useHistoricalTicketData } from "../hooks/useHistoricalTicketData";
import {
  transformHistoricalTicketsToAnalytics,
  aggregateTicketsByHour,
  createHeatmapData,
  formatForPredictiveChart,
} from "../utils/analytics-data-utils";

/**
 * Phase 1 Enhanced Analytics Page
 * Integrates real-time dashboard and predictive analytics
 * Following best practice: < 500 lines, modular components
 */
export default function Phase1AnalyticsPage() {
  const { userProfile } = useAuth();
  const { canAccessAnalytics, userRole } = useRolePermissions();
  const [analyticsMode, setAnalyticsMode] = useState<"standard" | "phase1">(
    "phase1"
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState("7d");

  // Get existing analytics data
  const standardAnalytics = useAnalyticsData();

  // Get historical data from Supabase
  const {
    data: historicalData,
    loading: historicalLoading,
    error: historicalError,
  } = useHistoricalTicketData({ timeRange: selectedTimeRange as any });

  // Process with advanced analytics
  const { processHistoricalData } = useAdvancedAnalyticsProcessing();

  // Transform historical data for analytics
  const analyticsTickets = useMemo(() => {
    if (!historicalData?.tickets) return [];
    return transformHistoricalTicketsToAnalytics(historicalData.tickets);
  }, [historicalData?.tickets]);

  // Process the data for advanced insights
  const enhancedData = useMemo(() => {
    if (!analyticsTickets.length) return null;
    return processHistoricalData(analyticsTickets);
  }, [analyticsTickets, processHistoricalData]);

  // Generate real historical data for charts
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

  if (!canAccessAnalytics) {
    return (
      <DashboardLayout>
        <RoleRestrictedAccess
          allowedRoles={["admin", "manager"]}
          showMessage={true}
        >
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Access Restricted
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You need admin or manager permissions to access analytics.
            </p>
          </div>
        </RoleRestrictedAccess>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Enhanced Header with Mode Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Activity className="w-6 h-6 text-blue-600" />
              <span>Advanced Analytics</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Phase 1
              </span>
            </h1>
            <p className="text-gray-600 mt-1">
              Real-time insights with predictive analytics and advanced
              visualizations
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAnalyticsMode("standard")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                analyticsMode === "standard"
                  ? "bg-gray-200 text-gray-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => setAnalyticsMode("phase1")}
              className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center space-x-1 ${
                analyticsMode === "phase1"
                  ? "bg-blue-100 text-blue-900"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Enhanced</span>
            </button>
          </div>
        </div>

        {/* Conditional Rendering Based on Mode */}
        {analyticsMode === "phase1" ? (
          // Phase 1 Enhanced Analytics
          <div className="space-y-8">
            {/* Real-Time Dashboard */}
            {userProfile?.organization_id && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>Organization: {userProfile.organization_id}</span>
                  {historicalData && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {historicalData.totalCount} archived tickets
                    </span>
                  )}
                  {historicalLoading && (
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Loading historical data...
                    </span>
                  )}
                </div>
                <RealTimeAnalyticsDashboard
                  organizationId={userProfile.organization_id}
                  refreshInterval={5000}
                />
              </div>
            )}

            {/* Enhanced Visualizations Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Predictive Chart */}
              <div className="space-y-4">
                <PredictiveChart
                  historicalData={realHistoricalData}
                  predictions={enhancedData?.predictions || []}
                  title="Queue Length Prediction"
                  loading={historicalLoading}
                />

                {/* Business Insights Panel */}
                {enhancedData?.insights && enhancedData.insights.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span>AI Insights</span>
                    </h4>
                    <div className="space-y-3">
                      {enhancedData.insights
                        .slice(0, 2)
                        .map((insight, index) => (
                          <div
                            key={insight.id}
                            className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <h5 className="font-medium text-blue-900">
                              {insight.title}
                            </h5>
                            <p className="text-sm text-blue-700 mt-1">
                              {insight.description}
                            </p>
                            {insight.impact && (
                              <p className="text-xs text-blue-600 mt-2 italic">
                                {insight.impact}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Heatmap Chart */}
              <div className="space-y-4">
                <HeatmapChart
                  data={realHeatmapData}
                  title="Peak Hours Analysis"
                  loading={historicalLoading}
                />

                {/* Data Status Info */}
                {!historicalLoading && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Data Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">
                          Historical Tickets:
                        </span>
                        <span className="ml-2 font-medium">
                          {historicalData?.totalCount || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Date Range:</span>
                        <span className="ml-2 font-medium">
                          {historicalData?.dateRange?.earliest
                            ? new Date(
                                historicalData.dateRange.earliest
                              ).toLocaleDateString()
                            : "No data"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Data Quality:</span>
                        <span className="ml-2 font-medium">
                          {historicalData?.dataQuality?.completedPercentage ||
                            0}
                          % complete
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          Insights Generated:
                        </span>
                        <span className="ml-2 font-medium">
                          {enhancedData?.insights?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Analytics Trends Section */}
            {enhancedData?.trends && enhancedData.trends.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Trend Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {enhancedData.trends.map((trend, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600 capitalize">
                          {trend.metric.replace("_", " ")}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            trend.direction === "up"
                              ? "bg-green-100 text-green-800"
                              : trend.direction === "down"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {trend.direction === "up"
                            ? "↗"
                            : trend.direction === "down"
                            ? "↘"
                            : "→"}{" "}
                          {trend.direction}
                        </span>
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {Math.round(trend.percentage)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Confidence: {Math.round(trend.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Anomalies Detection */}
            {enhancedData?.anomalies && enhancedData.anomalies.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>Anomalies Detected</span>
                </h3>
                <div className="space-y-2">
                  {enhancedData.anomalies.slice(0, 3).map((anomaly, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-red-900">
                          {anomaly.description}
                        </p>
                        <p className="text-xs text-red-700">
                          Value: {anomaly.value}, Expected:{" "}
                          {Math.round(anomaly.expected)}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          anomaly.severity === "high"
                            ? "bg-red-200 text-red-800"
                            : anomaly.severity === "medium"
                            ? "bg-yellow-200 text-yellow-800"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {anomaly.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Standard Analytics (Existing Implementation)
          <div className="space-y-6">
            <AnalyticsHeader onRefresh={standardAnalytics.refreshData} />
            <AnalyticsFilters
              timeRange={selectedTimeRange as any}
              setTimeRange={setSelectedTimeRange}
              selectedBranch={standardAnalytics.selectedBranch}
              setSelectedBranch={standardAnalytics.setSelectedBranch}
              selectedDepartment={standardAnalytics.selectedDepartment}
              setSelectedDepartment={standardAnalytics.setSelectedDepartment}
              departments={[]}
              branches={[]}
              loading={false}
            />
            <KPISection
              data={{
                avgWaitTime: 0,
                avgServiceTime: 0,
                ticketsIssued: 0,
                ticketsServed: 0,
                noShowRate: 0,
                completionRate: 0,
                currentWaiting: 0,
                waitTimeTrend: [],
                peakHours: [],
                departmentPerformance: [],
                serviceDistribution: [],
                notificationStats: {
                  sent: 0,
                  successful: 0,
                  failed: 0,
                  successRate: 0,
                },
              }}
              loading={standardAnalytics.loading}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
