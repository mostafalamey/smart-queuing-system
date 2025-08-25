import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { AnalyticsData, Branch, Department, TimeRange } from "../types";
import {
  HistoricalAnalyticsService,
  HistoricalAnalyticsData,
  PredictiveInsights,
} from "@/lib/historicalAnalyticsService";

export interface EnhancedAnalyticsData extends AnalyticsData {
  // Enhanced historical data
  historicalTrends: {
    date: string;
    avgWaitTime: number;
    avgServiceTime: number;
    ticketVolume: number;
    completionRate: number;
    noShowRate: number;
  }[];

  // Predictive insights
  predictiveInsights: PredictiveInsights | null;

  // Comparative metrics
  periodComparison: {
    waitTime: { current: number; previous: number; change: number };
    volume: { current: number; previous: number; change: number };
    completion: { current: number; previous: number; change: number };
  } | null;

  // Peak patterns
  peakPatternsAnalysis: {
    hourly: { hour: number; avgVolume: number; avgWaitTime: number }[];
    daily: { day: number; avgVolume: number; avgWaitTime: number }[];
    seasonal: { month: number; avgVolume: number; avgWaitTime: number }[];
  } | null;
}

export const useEnhancedAnalyticsData = () => {
  const { userProfile } = useAuth();
  const { assignedBranchId } = useRolePermissions();

  // State
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [analyticsData, setAnalyticsData] =
    useState<EnhancedAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [historicalData, setHistoricalData] =
    useState<HistoricalAnalyticsData | null>(null);

  // Calculate date range based on timeRange
  const getDateRange = useCallback(() => {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

    switch (timeRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [timeRange]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    if (!userProfile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, organization_id")
        .eq("organization_id", userProfile.organization_id)
        .order("name");

      if (error) throw error;
      setBranches(data || []);

      // Auto-select branch for managers
      if (assignedBranchId && data) {
        const assignedBranch = data.find((b) => b.id === assignedBranchId);
        if (assignedBranch) {
          setSelectedBranch(assignedBranchId);
        }
      } else if (data && data.length === 1) {
        setSelectedBranch(data[0].id);
      }
    } catch (error) {
      logger.error("Error fetching branches:", error);
      setError("Failed to load branches");
    }
  }, [userProfile?.organization_id, assignedBranchId]);

  // Fetch departments based on selected branch
  const fetchDepartments = useCallback(async () => {
    if (!selectedBranch) return;

    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, branch_id")
        .eq("branch_id", selectedBranch)
        .order("name");

      if (error) throw error;
      setDepartments(data || []);

      // Auto-select first department if only one exists
      if (data && data.length === 1) {
        setSelectedDepartment(data[0].id);
      } else {
        setSelectedDepartment("");
      }
    } catch (error) {
      logger.error("Error fetching departments:", error);
      setError("Failed to load departments");
    }
  }, [selectedBranch]);

  // Fetch enhanced analytics data (historical + live)
  const fetchEnhancedAnalytics = useCallback(async () => {
    if (!selectedBranch || !userProfile?.organization_id) return;

    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange();

      // Fetch historical analytics data
      const historicalData =
        await HistoricalAnalyticsService.fetchHistoricalData(
          userProfile.organization_id,
          selectedBranch,
          selectedDepartment,
          startDate.split("T")[0],
          endDate.split("T")[0]
        );

      setHistoricalData(historicalData);

      // Get current queue data for real-time metrics
      const { data: currentTickets } = await supabase
        .from("tickets")
        .select(
          `
          id,
          ticket_number,
          status,
          created_at,
          called_at,
          completed_at,
          department_id,
          service_id,
          departments!inner(id, name, branch_id),
          services(id, name, estimated_time)
        `
        )
        .eq("departments.branch_id", selectedBranch)
        .eq("department_id", selectedDepartment || undefined)
        .gte("created_at", startDate)
        .lte("created_at", endDate);

      // Generate predictive insights
      const currentQueueCount =
        currentTickets?.filter((t) => t.status === "waiting").length || 0;
      const predictiveInsights =
        HistoricalAnalyticsService.generatePredictiveInsights(
          historicalData,
          currentQueueCount
        );

      // Process enhanced analytics data
      const enhancedData = await processEnhancedAnalyticsData(
        historicalData,
        currentTickets || [],
        predictiveInsights
      );

      setAnalyticsData(enhancedData);
    } catch (error) {
      logger.error("Error fetching enhanced analytics:", error);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [
    selectedBranch,
    selectedDepartment,
    timeRange,
    userProfile?.organization_id,
    getDateRange,
  ]);

  // Process enhanced analytics data
  const processEnhancedAnalyticsData = async (
    historicalData: HistoricalAnalyticsData,
    currentTickets: any[],
    predictiveInsights: PredictiveInsights
  ): Promise<EnhancedAnalyticsData> => {
    const dailyAnalytics = historicalData.daily_analytics;
    const serviceAnalytics = historicalData.service_analytics;
    const notificationAnalytics = historicalData.notification_analytics;

    // Calculate current period metrics
    const totalTickets = dailyAnalytics.reduce(
      (sum, d) => sum + d.total_tickets,
      0
    );
    const totalCompleted = dailyAnalytics.reduce(
      (sum, d) => sum + d.completed_tickets,
      0
    );
    const avgWaitTime =
      dailyAnalytics.length > 0
        ? dailyAnalytics.reduce(
            (sum, d) => sum + d.avg_wait_time * d.total_tickets,
            0
          ) / Math.max(totalTickets, 1)
        : 0;
    const avgServiceTime =
      dailyAnalytics.length > 0
        ? dailyAnalytics.reduce(
            (sum, d) => sum + d.avg_service_time * d.completed_tickets,
            0
          ) / Math.max(totalCompleted, 1)
        : 0;

    // Generate historical trends
    const historicalTrends =
      HistoricalAnalyticsService.generateTrendData(dailyAnalytics);

    // Calculate period comparison (current vs previous period)
    const periodComparison = calculatePeriodComparison(dailyAnalytics);

    // Analyze peak patterns
    const peakPatternsAnalysis = analyzePeakPatterns(dailyAnalytics);

    // Process wait time trends
    const waitTimeTrend = historicalTrends.map((trend) => ({
      date: trend.date,
      avgWaitTime: trend.avgWaitTime,
      ticketCount: trend.ticketVolume,
    }));

    // Process department performance from historical data
    const departmentPerformance = processDepartmentPerformance(dailyAnalytics);

    // Process service distribution
    const serviceDistribution = processServiceDistribution(serviceAnalytics);

    // Calculate notification stats
    const notificationStats = calculateNotificationStats(notificationAnalytics);

    // Get current waiting count
    const currentWaiting = currentTickets.filter(
      (t) => t.status === "waiting"
    ).length;

    return {
      // Basic metrics
      avgWaitTime: Math.round(avgWaitTime * 10) / 10,
      avgServiceTime: Math.round(avgServiceTime * 10) / 10,
      ticketsIssued: totalTickets,
      ticketsServed: totalCompleted,
      noShowRate:
        dailyAnalytics.length > 0
          ? dailyAnalytics.reduce((sum, d) => sum + d.no_show_rate, 0) /
            dailyAnalytics.length
          : 0,
      completionRate:
        totalTickets > 0 ? (totalCompleted / totalTickets) * 100 : 0,
      currentWaiting,
      waitTimeTrend,
      peakHours: [], // Filled from peak patterns analysis
      departmentPerformance,
      serviceDistribution,
      notificationStats,

      // Enhanced historical data
      historicalTrends,
      predictiveInsights,
      periodComparison,
      peakPatternsAnalysis,
    };
  };

  // Calculate period comparison
  const calculatePeriodComparison = (dailyAnalytics: any[]) => {
    if (dailyAnalytics.length < 14) return null;

    const midPoint = Math.floor(dailyAnalytics.length / 2);
    const currentPeriod = dailyAnalytics.slice(midPoint);
    const previousPeriod = dailyAnalytics.slice(0, midPoint);

    const currentWaitTime =
      currentPeriod.reduce((sum, d) => sum + d.avg_wait_time, 0) /
      currentPeriod.length;
    const previousWaitTime =
      previousPeriod.reduce((sum, d) => sum + d.avg_wait_time, 0) /
      previousPeriod.length;

    const currentVolume = currentPeriod.reduce(
      (sum, d) => sum + d.total_tickets,
      0
    );
    const previousVolume = previousPeriod.reduce(
      (sum, d) => sum + d.total_tickets,
      0
    );

    const currentCompletion =
      currentPeriod.reduce((sum, d) => sum + d.completion_rate, 0) /
      currentPeriod.length;
    const previousCompletion =
      previousPeriod.reduce((sum, d) => sum + d.completion_rate, 0) /
      previousPeriod.length;

    return {
      waitTime: {
        current: currentWaitTime,
        previous: previousWaitTime,
        change:
          ((currentWaitTime - previousWaitTime) /
            Math.max(previousWaitTime, 1)) *
          100,
      },
      volume: {
        current: currentVolume,
        previous: previousVolume,
        change:
          ((currentVolume - previousVolume) / Math.max(previousVolume, 1)) *
          100,
      },
      completion: {
        current: currentCompletion,
        previous: previousCompletion,
        change:
          ((currentCompletion - previousCompletion) /
            Math.max(previousCompletion, 1)) *
          100,
      },
    };
  };

  // Analyze peak patterns
  const analyzePeakPatterns = (dailyAnalytics: any[]) => {
    const hourlyData: {
      [hour: number]: { volume: number; waitTime: number; count: number };
    } = {};
    const dailyData: {
      [day: number]: { volume: number; waitTime: number; count: number };
    } = {};

    dailyAnalytics.forEach((record) => {
      const date = new Date(record.date);
      const hour = record.peak_wait_time_hour;
      const day = date.getDay();

      // Hourly patterns
      if (!hourlyData[hour]) {
        hourlyData[hour] = { volume: 0, waitTime: 0, count: 0 };
      }
      hourlyData[hour].volume += record.total_tickets;
      hourlyData[hour].waitTime += record.avg_wait_time;
      hourlyData[hour].count += 1;

      // Daily patterns
      if (!dailyData[day]) {
        dailyData[day] = { volume: 0, waitTime: 0, count: 0 };
      }
      dailyData[day].volume += record.total_tickets;
      dailyData[day].waitTime += record.avg_wait_time;
      dailyData[day].count += 1;
    });

    const hourly = Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgVolume: Math.round(data.volume / data.count),
        avgWaitTime: Math.round((data.waitTime / data.count) * 10) / 10,
      }))
      .sort((a, b) => a.hour - b.hour);

    const daily = Object.entries(dailyData)
      .map(([day, data]) => ({
        day: parseInt(day),
        avgVolume: Math.round(data.volume / data.count),
        avgWaitTime: Math.round((data.waitTime / data.count) * 10) / 10,
      }))
      .sort((a, b) => a.day - b.day);

    return {
      hourly,
      daily,
      seasonal: [], // TODO: Implement monthly patterns when we have more data
    };
  };

  // Process department performance from historical data
  const processDepartmentPerformance = (dailyAnalytics: any[]) => {
    const deptData: { [id: string]: any } = {};

    dailyAnalytics.forEach((record) => {
      if (!deptData[record.department_id]) {
        deptData[record.department_id] = {
          departmentId: record.department_id,
          departmentName: record.departments?.name || "Unknown",
          totalTickets: 0,
          totalServed: 0,
          totalWaitTime: 0,
          totalServiceTime: 0,
          recordCount: 0,
        };
      }

      const dept = deptData[record.department_id];
      dept.totalTickets += record.total_tickets;
      dept.totalServed += record.completed_tickets;
      dept.totalWaitTime += record.avg_wait_time * record.total_tickets;
      dept.totalServiceTime +=
        record.avg_service_time * record.completed_tickets;
      dept.recordCount += 1;
    });

    return Object.values(deptData).map((dept: any) => ({
      departmentId: dept.departmentId,
      departmentName: dept.departmentName,
      avgWaitTime:
        dept.totalTickets > 0
          ? Math.round((dept.totalWaitTime / dept.totalTickets) * 10) / 10
          : 0,
      avgServiceTime:
        dept.totalServed > 0
          ? Math.round((dept.totalServiceTime / dept.totalServed) * 10) / 10
          : 0,
      ticketsServed: dept.totalServed,
      waitingCount: 0, // This would need real-time data
    }));
  };

  // Process service distribution from service analytics
  const processServiceDistribution = (serviceAnalytics: any[]) => {
    const serviceData: { [name: string]: number } = {};
    let totalTickets = 0;

    serviceAnalytics.forEach((record) => {
      const serviceName = record.services?.name || "General Service";
      serviceData[serviceName] =
        (serviceData[serviceName] || 0) + record.tickets_issued;
      totalTickets += record.tickets_issued;
    });

    return Object.entries(serviceData).map(([serviceName, ticketCount]) => ({
      serviceName,
      ticketCount,
      percentage:
        totalTickets > 0
          ? Math.round((ticketCount / totalTickets) * 100 * 10) / 10
          : 0,
    }));
  };

  // Calculate notification statistics
  const calculateNotificationStats = (notificationAnalytics: any[]) => {
    const totals = notificationAnalytics.reduce(
      (acc, record) => ({
        sent: acc.sent + record.total_notifications,
        successful: acc.successful + record.successful_notifications,
        failed: acc.failed + record.failed_notifications,
      }),
      { sent: 0, successful: 0, failed: 0 }
    );

    return {
      sent: totals.sent,
      successful: totals.successful,
      failed: totals.failed,
      successRate:
        totals.sent > 0
          ? Math.round((totals.successful / totals.sent) * 100 * 10) / 10
          : 0,
    };
  };

  // Refresh data function
  const refreshData = useCallback(() => {
    fetchEnhancedAnalytics();
  }, [fetchEnhancedAnalytics]);

  // Effects
  useEffect(() => {
    if (userProfile?.organization_id) {
      fetchBranches();
    }
  }, [fetchBranches]);

  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments();
    }
  }, [fetchDepartments]);

  useEffect(() => {
    if (selectedBranch) {
      fetchEnhancedAnalytics();
    }
  }, [fetchEnhancedAnalytics]);

  return {
    // State
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
    historicalData,

    // Actions
    refreshData,
  };
};
