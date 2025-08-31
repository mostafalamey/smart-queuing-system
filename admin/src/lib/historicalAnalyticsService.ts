import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export interface HistoricalAnalyticsData {
  daily_analytics: DailyAnalytics[];
  service_analytics: ServiceAnalytics[];
  employee_performance: EmployeePerformanceAnalytics[];
  notification_analytics: NotificationAnalytics[];
}

export interface DailyAnalytics {
  id: string;
  date: string;
  organization_id: string;
  branch_id: string;
  department_id: string;
  service_id: string | null;
  tickets_issued: number; // Updated to match database
  tickets_served: number; // Updated to match database
  tickets_cancelled: number; // Updated to match database
  tickets_no_show: number; // Updated to match database
  avg_wait_time: number;
  min_wait_time?: number; // Added missing fields from database
  max_wait_time?: number; // Added missing fields from database
  median_wait_time?: number; // Added missing fields from database
  avg_service_time: number;
  min_service_time?: number; // Added missing fields from database
  max_service_time?: number; // Added missing fields from database
  median_service_time?: number; // Added missing fields from database
  hourly_ticket_distribution: any[];
  hourly_wait_times?: any[]; // Added missing fields from database
  hourly_service_times?: any[]; // Added missing fields from database
  completion_rate: number;
  no_show_rate: number;
  peak_wait_time_hour: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceAnalytics {
  id: string;
  date: string;
  service_id: string;
  department_id: string;
  tickets_issued: number;
  tickets_served: number;
  tickets_cancelled: number;
  avg_wait_time: number;
  avg_service_time: number;
  utilization_rate: number;
  peak_demand_hour: number;
}

export interface EmployeePerformanceAnalytics {
  id: string;
  date: string;
  employee_id: string;
  organization_id: string;
  department_id: string;
  tickets_handled: number;
  avg_service_time: number;
  customer_satisfaction_score: number;
  productivity_score: number;
}

export interface NotificationAnalytics {
  id: string;
  date: string;
  organization_id: string;
  total_notifications: number;
  successful_notifications: number;
  failed_notifications: number;
  response_rate: number;
  call_notifications: number;
  ready_notifications: number;
  reminder_notifications: number;
}

export interface HistoricalTrendData {
  date: string;
  avgWaitTime: number;
  avgServiceTime: number;
  ticketVolume: number;
  completionRate: number;
  noShowRate: number;
}

export interface PredictiveInsights {
  estimatedWaitTime: {
    value: number;
    confidence: "high" | "medium" | "low";
    factorsConsidered: string[];
  };
  peakHoursPrediction: {
    hour: number;
    expectedVolume: number;
    confidence: number;
  }[];
  volumeForecast: {
    period: string;
    expectedTickets: number;
    trend: "increasing" | "decreasing" | "stable";
  }[];
  recommendedStaffing: {
    hour: number;
    recommendedStaff: number;
    reasoning: string;
  }[];
}

export class HistoricalAnalyticsService {
  /**
   * Fetch historical analytics data for a specific time range
   */
  static async fetchHistoricalData(
    organizationId: string,
    branchId?: string,
    departmentId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<HistoricalAnalyticsData> {
    try {
      // Set default date range (last 30 days) if not provided
      const end = endDate || new Date().toISOString().split("T")[0];
      const start =
        startDate ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];

      // Initialize empty results
      let dailyAnalytics: DailyAnalytics[] = [];
      let serviceAnalytics: ServiceAnalytics[] = [];
      let employeePerformance: EmployeePerformanceAnalytics[] = [];
      let notificationAnalytics: NotificationAnalytics[] = [];

      // Try to fetch daily analytics
      try {
        let dailyQuery = supabase
          .from("daily_analytics")
          .select(
            `
            *,
            departments(name, id),
            services(name, id),
            branches(name, id)
          `
          )
          .eq("organization_id", organizationId)
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true });

        if (branchId) {
          dailyQuery = dailyQuery.eq("branch_id", branchId);
        }

        if (departmentId) {
          dailyQuery = dailyQuery.eq("department_id", departmentId);
        }

        const { data, error } = await dailyQuery;
        if (!error && data) {
          dailyAnalytics = data;
        }
      } catch (error) {
        logger.warn("Could not fetch daily analytics:", error);
      }

      // Try to fetch service analytics
      try {
        let serviceQuery = supabase
          .from("service_analytics")
          .select(
            `
            *,
            services(name, id, department_id),
            departments(name, id, branch_id)
          `
          )
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true });

        // Filter by organization through department->branch relationship
        if (branchId) {
          serviceQuery = serviceQuery.eq("departments.branch_id", branchId);
        } else {
          // Get all branches for this organization
          const { data: orgBranches } = await supabase
            .from("branches")
            .select("id")
            .eq("organization_id", organizationId);

          if (orgBranches && orgBranches.length > 0) {
            const branchIds = orgBranches.map((b) => b.id);
            serviceQuery = serviceQuery.in("departments.branch_id", branchIds);
          }
        }

        if (departmentId) {
          serviceQuery = serviceQuery.eq("department_id", departmentId);
        }

        const { data, error } = await serviceQuery;
        if (!error && data) {
          serviceAnalytics = data;
        }
      } catch (error) {
        logger.warn("Could not fetch service analytics:", error);
      }

      // Try to fetch employee performance analytics
      try {
        let employeeQuery = supabase
          .from("employee_performance_analytics")
          .select(
            `
            *,
            departments(name, id, branch_id)
          `
          )
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true });

        // Filter by organization through department->branch relationship
        if (branchId) {
          employeeQuery = employeeQuery.eq("departments.branch_id", branchId);
        } else {
          // Get all branches for this organization
          const { data: orgBranches } = await supabase
            .from("branches")
            .select("id")
            .eq("organization_id", organizationId);

          if (orgBranches && orgBranches.length > 0) {
            const branchIds = orgBranches.map((b) => b.id);
            employeeQuery = employeeQuery.in(
              "departments.branch_id",
              branchIds
            );
          }
        }

        if (departmentId) {
          employeeQuery = employeeQuery.eq("department_id", departmentId);
        }

        const { data, error } = await employeeQuery;
        if (!error && data) {
          employeePerformance = data;
        }
      } catch (error) {
        logger.warn("Could not fetch employee performance analytics:", error);
      }

      // Try to fetch notification analytics
      try {
        let notificationQuery = supabase
          .from("notification_analytics")
          .select("*")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: true });

        // Try to filter by organization_id if column exists
        try {
          notificationQuery = notificationQuery.eq(
            "organization_id",
            organizationId
          );
        } catch {
          // Column might not exist, continue without this filter
        }

        const { data, error } = await notificationQuery;
        if (!error && data) {
          notificationAnalytics = data;
        }
      } catch (error) {
        logger.warn("Could not fetch notification analytics:", error);
      }

      return {
        daily_analytics: dailyAnalytics,
        service_analytics: serviceAnalytics,
        employee_performance: employeePerformance,
        notification_analytics: notificationAnalytics,
      };
    } catch (error) {
      logger.error("Error fetching historical analytics data:", error);
      throw error;
    }
  }

  /**
   * Generate trend data from historical analytics
   */
  static generateTrendData(
    dailyAnalytics: DailyAnalytics[]
  ): HistoricalTrendData[] {
    return dailyAnalytics.map((record) => ({
      date: record.date,
      avgWaitTime: record.avg_wait_time,
      avgServiceTime: record.avg_service_time,
      ticketVolume: record.tickets_issued, // Updated field name
      completionRate: record.completion_rate,
      noShowRate: record.no_show_rate,
    }));
  }

  /**
   * Calculate predictive insights based on historical data
   */
  static generatePredictiveInsights(
    historicalData: HistoricalAnalyticsData,
    currentQueueLength: number = 0,
    currentHour: number = new Date().getHours(),
    dayOfWeek: number = new Date().getDay()
  ): PredictiveInsights {
    const dailyData = historicalData.daily_analytics;

    // Calculate estimated wait time
    const estimatedWaitTime = this.calculateEstimatedWaitTime(
      dailyData,
      currentQueueLength,
      currentHour,
      dayOfWeek
    );

    // Generate peak hours prediction
    const peakHoursPrediction = this.predictPeakHours(dailyData);

    // Generate volume forecast
    const volumeForecast = this.forecastVolume(dailyData);

    // Generate staffing recommendations
    const recommendedStaffing = this.recommendStaffing(
      dailyData,
      historicalData.service_analytics
    );

    return {
      estimatedWaitTime,
      peakHoursPrediction,
      volumeForecast,
      recommendedStaffing,
    };
  }

  /**
   * Calculate estimated wait time using historical patterns
   */
  private static calculateEstimatedWaitTime(
    dailyData: DailyAnalytics[],
    queueLength: number,
    currentHour: number,
    dayOfWeek: number
  ) {
    // Filter data for similar time periods (same hour, same day of week)
    const recentData = dailyData.slice(-14); // Last 14 days
    const similarTimeData = recentData.filter((record) => {
      const recordDate = new Date(record.date);
      const recordHour = record.peak_wait_time_hour;
      const recordDayOfWeek = recordDate.getDay();

      return (
        Math.abs(recordHour - currentHour) <= 1 && recordDayOfWeek === dayOfWeek
      );
    });

    // Calculate base wait time from historical average
    const baseWaitTime =
      similarTimeData.length > 0
        ? similarTimeData.reduce(
            (sum, record) => sum + record.avg_wait_time,
            0
          ) / similarTimeData.length
        : recentData.reduce((sum, record) => sum + record.avg_wait_time, 0) /
          Math.max(recentData.length, 1);

    // Adjust for current queue length
    const avgServiceTime =
      recentData.length > 0
        ? recentData.reduce((sum, record) => sum + record.avg_service_time, 0) /
          recentData.length
        : 5; // Default 5 minutes

    const queueAdjustment = queueLength * avgServiceTime;
    const adjustedWaitTime = Math.max(
      1,
      Math.round(baseWaitTime + queueAdjustment)
    );

    // Determine confidence level
    let confidence: "high" | "medium" | "low" = "medium";
    if (similarTimeData.length >= 7) {
      confidence = "high";
    } else if (similarTimeData.length < 3) {
      confidence = "low";
    }

    return {
      value: adjustedWaitTime,
      confidence,
      factorsConsidered: [
        `${similarTimeData.length} similar time periods analyzed`,
        `Current queue length: ${queueLength}`,
        `Historical average for this hour: ${Math.round(baseWaitTime)} min`,
        `Queue adjustment: +${Math.round(queueAdjustment)} min`,
      ],
    };
  }

  /**
   * Predict peak hours based on historical patterns
   */
  private static predictPeakHours(dailyData: DailyAnalytics[]) {
    const hourlyVolume: { [hour: number]: { total: number; count: number } } =
      {};

    dailyData.forEach((record) => {
      const peakHour = record.peak_wait_time_hour;
      if (!hourlyVolume[peakHour]) {
        hourlyVolume[peakHour] = { total: 0, count: 0 };
      }
      hourlyVolume[peakHour].total += record.tickets_issued; // Updated field name
      hourlyVolume[peakHour].count += 1;
    });

    return Object.entries(hourlyVolume)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        expectedVolume: Math.round(data.total / data.count),
        confidence: Math.min(100, (data.count / dailyData.length) * 100),
      }))
      .sort((a, b) => b.expectedVolume - a.expectedVolume)
      .slice(0, 5); // Top 5 peak hours
  }

  /**
   * Forecast volume trends
   */
  private static forecastVolume(dailyData: DailyAnalytics[]) {
    if (dailyData.length < 7) {
      return [
        {
          period: "next_week",
          expectedTickets: 0,
          trend: "stable" as const,
        },
      ];
    }

    const recentWeek = dailyData.slice(-7);
    const previousWeek = dailyData.slice(-14, -7);

    const recentAvg =
      recentWeek.reduce((sum, r) => sum + r.tickets_issued, 0) / 7; // Updated field name
    const previousAvg =
      previousWeek.length > 0
        ? previousWeek.reduce((sum, r) => sum + r.tickets_issued, 0) / // Updated field name
          previousWeek.length
        : recentAvg;

    const trendPercent =
      ((recentAvg - previousAvg) / Math.max(previousAvg, 1)) * 100;

    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (trendPercent > 5) trend = "increasing";
    else if (trendPercent < -5) trend = "decreasing";

    return [
      {
        period: "next_week",
        expectedTickets: Math.round(recentAvg * 7),
        trend,
      },
      {
        period: "next_month",
        expectedTickets: Math.round(recentAvg * 30),
        trend,
      },
    ];
  }

  /**
   * Generate staffing recommendations
   */
  private static recommendStaffing(
    dailyData: DailyAnalytics[],
    serviceData: ServiceAnalytics[]
  ) {
    const recommendations: {
      hour: number;
      recommendedStaff: number;
      reasoning: string;
    }[] = [];

    // Analyze patterns for each hour
    for (let hour = 8; hour <= 18; hour++) {
      const hourlyTickets =
        dailyData
          .filter((record) => record.peak_wait_time_hour === hour)
          .reduce((sum, record) => sum + record.tickets_issued, 0) / // Updated field name
        Math.max(dailyData.length, 1);

      const avgServiceTime =
        serviceData.length > 0
          ? serviceData.reduce(
              (sum, record) => sum + record.avg_service_time,
              0
            ) / serviceData.length
          : 5;

      // Calculate recommended staff based on volume and service time
      const ticketsPerHour = Math.ceil(hourlyTickets);
      const staffNeeded = Math.max(
        1,
        Math.ceil((ticketsPerHour * avgServiceTime) / 60)
      );

      let reasoning = `Based on ${Math.round(hourlyTickets)} avg tickets/hour`;
      if (staffNeeded > 2)
        reasoning += ". Peak hour - consider additional staff";
      else if (staffNeeded === 1)
        reasoning += ". Light traffic - minimum staffing";

      recommendations.push({
        hour,
        recommendedStaff: staffNeeded,
        reasoning,
      });
    }

    return recommendations.sort((a, b) => a.hour - b.hour);
  }

  /**
   * Get real-time wait time estimation for customers
   */
  static async getCustomerWaitTimeEstimation(
    departmentId: string,
    serviceId?: string,
    position?: number
  ) {
    try {
      // Get recent historical data for this department/service
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      let query = supabase
        .from("daily_analytics")
        .select("*")
        .eq("department_id", departmentId)
        .gte("date", startDate)
        .lte("date", endDate);

      if (serviceId) {
        query = query.eq("service_id", serviceId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get current queue length
      const { data: currentTickets } = await supabase
        .from("tickets")
        .select("id")
        .eq("department_id", departmentId)
        .eq("status", "waiting");

      const queueLength = currentTickets?.length || 0;
      const currentHour = new Date().getHours();
      const dayOfWeek = new Date().getDay();

      const insights = this.generatePredictiveInsights(
        {
          daily_analytics: data || [],
          service_analytics: [],
          employee_performance: [],
          notification_analytics: [],
        },
        position || queueLength,
        currentHour,
        dayOfWeek
      );

      return insights.estimatedWaitTime;
    } catch (error) {
      logger.error("Error calculating customer wait time:", error);
      return {
        value: 15, // Default estimate
        confidence: "low" as const,
        factorsConsidered: [
          "Using default estimate due to data unavailability",
        ],
      };
    }
  }
}
