/**
 * Analytics Data Transformation Utilities
 * Converts Supabase ticket data into analytics-friendly formats
 */

import { HistoricalTicket } from "../hooks/useHistoricalTicketData";
import {
  TicketData,
  TimeSeriesPoint,
  PredictionData,
  BusinessInsight,
} from "@/lib/analytics/types/analytics";

/**
 * Transform Supabase historical tickets to analytics format
 */
export const transformHistoricalTicketsToAnalytics = (
  tickets: HistoricalTicket[]
): TicketData[] => {
  return tickets.map((ticket) => ({
    id: ticket.id,
    number: ticket.ticket_number,
    departmentId: ticket.department_id,
    branchId: ticket.department?.branch?.id || "",
    organizationId: ticket.department?.branch?.organization_id || "",
    serviceId: undefined,
    status: ticket.status as "waiting" | "serving" | "completed" | "cancelled",
    createdAt: new Date(ticket.created_at),
    calledAt: ticket.called_at ? new Date(ticket.called_at) : undefined,
    completedAt: ticket.completed_at
      ? new Date(ticket.completed_at)
      : undefined,
    // Calculate wait time in minutes
    waitTime: ticket.called_at
      ? Math.round(
          (new Date(ticket.called_at).getTime() -
            new Date(ticket.created_at).getTime()) /
            (1000 * 60)
        )
      : undefined,
    // Calculate service time in minutes
    serviceTime:
      ticket.called_at && ticket.completed_at
        ? Math.round(
            (new Date(ticket.completed_at).getTime() -
              new Date(ticket.called_at).getTime()) /
              (1000 * 60)
          )
        : undefined,
  }));
};

/**
 * Aggregate tickets by hour for trend analysis
 */
export const aggregateTicketsByHour = (
  tickets: HistoricalTicket[],
  timeZone = "UTC"
): TimeSeriesPoint[] => {
  const hourlyMap = new Map<string, number>();

  tickets.forEach((ticket) => {
    const date = new Date(ticket.created_at);
    // Create hour key (YYYY-MM-DD HH:00:00)
    const hourKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(
      date.getHours()
    ).padStart(2, "0")}:00:00`;

    hourlyMap.set(hourKey, (hourlyMap.get(hourKey) || 0) + 1);
  });

  return Array.from(hourlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([timeKey, count]) => ({
      timestamp: new Date(`${timeKey}Z`), // Add Z for UTC
      value: count,
    }));
};

/**
 * Create heatmap data from tickets (day of week vs hour of day)
 */
export const createHeatmapData = (tickets: HistoricalTicket[]) => {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const heatmapMap = new Map<string, number>();

  tickets.forEach((ticket) => {
    const date = new Date(ticket.created_at);
    const dayOfWeek = date.getDay(); // 0 = Sunday
    const hour = date.getHours();
    const key = `${dayNames[dayOfWeek]}-${hour}`;

    heatmapMap.set(key, (heatmapMap.get(key) || 0) + 1);
  });

  const heatmapData = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const key = `${dayNames[day]}-${hour}`;
      const value = heatmapMap.get(key) || 0;

      // Only include hours with some activity
      if (value > 0) {
        heatmapData.push({
          day: dayNames[day],
          hour,
          value,
          label: `${dayNames[day]} ${hour}:00 - ${value} tickets`,
        });
      }
    }
  }

  return heatmapData;
};

/**
 * Calculate basic statistics for business insights
 */
export const calculateBasicStatistics = (
  tickets: HistoricalTicket[]
): {
  avgWaitTime: number;
  avgServiceTime: number;
  completionRate: number;
  peakHour: { hour: number; count: number } | null;
  busiestDay: { day: string; count: number } | null;
} => {
  const validWaitTimes = tickets
    .filter((t) => t.called_at)
    .map(
      (t) =>
        (new Date(t.called_at!).getTime() - new Date(t.created_at).getTime()) /
        (1000 * 60)
    );

  const validServiceTimes = tickets
    .filter((t) => t.called_at && t.completed_at)
    .map(
      (t) =>
        (new Date(t.completed_at!).getTime() -
          new Date(t.called_at!).getTime()) /
        (1000 * 60)
    );

  const avgWaitTime =
    validWaitTimes.length > 0
      ? validWaitTimes.reduce((a, b) => a + b, 0) / validWaitTimes.length
      : 0;

  const avgServiceTime =
    validServiceTimes.length > 0
      ? validServiceTimes.reduce((a, b) => a + b, 0) / validServiceTimes.length
      : 0;

  const completionRate =
    tickets.length > 0
      ? (tickets.filter((t) => t.completed_at).length / tickets.length) * 100
      : 0;

  // Find peak hour
  const hourlyCount = new Map<number, number>();
  tickets.forEach((ticket) => {
    const hour = new Date(ticket.created_at).getHours();
    hourlyCount.set(hour, (hourlyCount.get(hour) || 0) + 1);
  });

  const peakHour =
    hourlyCount.size > 0
      ? Array.from(hourlyCount.entries()).reduce(
          (max, [hour, count]) => (count > max.count ? { hour, count } : max),
          { hour: 0, count: 0 }
        )
      : null;

  // Find busiest day
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dailyCount = new Map<string, number>();
  tickets.forEach((ticket) => {
    const day = dayNames[new Date(ticket.created_at).getDay()];
    dailyCount.set(day, (dailyCount.get(day) || 0) + 1);
  });

  const busiestDay =
    dailyCount.size > 0
      ? Array.from(dailyCount.entries()).reduce(
          (max, [day, count]) => (count > max.count ? { day, count } : max),
          { day: "", count: 0 }
        )
      : null;

  return {
    avgWaitTime: Math.round(avgWaitTime * 10) / 10,
    avgServiceTime: Math.round(avgServiceTime * 10) / 10,
    completionRate: Math.round(completionRate * 10) / 10,
    peakHour: peakHour && peakHour.count > 0 ? peakHour : null,
    busiestDay: busiestDay && busiestDay.count > 0 ? busiestDay : null,
  };
};

/**
 * Generate business insights from historical data
 */
export const generateBusinessInsights = (
  tickets: HistoricalTicket[],
  statistics: ReturnType<typeof calculateBasicStatistics>
): BusinessInsight[] => {
  const insights: BusinessInsight[] = [];

  // Insight 1: Wait time assessment
  if (statistics.avgWaitTime > 0) {
    const priority =
      statistics.avgWaitTime > 15
        ? "high"
        : statistics.avgWaitTime > 8
        ? "medium"
        : "low";
    insights.push({
      id: `wait-time-${Date.now()}`,
      type: "efficiency",
      priority,
      title: `Average Wait Time: ${statistics.avgWaitTime} minutes`,
      description:
        priority === "high"
          ? "Wait times are significantly above optimal levels"
          : priority === "medium"
          ? "Wait times are moderate but could be improved"
          : "Wait times are within acceptable range",
      impact:
        priority === "high"
          ? "High customer dissatisfaction risk"
          : priority === "medium"
          ? "Moderate efficiency impact"
          : "Low impact",
      actionable: priority !== "low",
      createdAt: new Date(),
    });
  }

  // Insight 2: Peak hour analysis
  if (statistics.peakHour) {
    insights.push({
      id: `peak-hour-${Date.now()}`,
      type: "staffing",
      priority: "medium",
      title: `Peak Hour: ${statistics.peakHour.hour}:00 (${statistics.peakHour.count} tickets)`,
      description: "Consider adjusting staff scheduling during peak hours",
      impact: "Staffing optimization opportunity",
      actionable: true,
      createdAt: new Date(),
    });
  }

  // Insight 3: Completion rate
  if (statistics.completionRate < 95) {
    insights.push({
      id: `completion-rate-${Date.now()}`,
      type: "efficiency",
      priority: statistics.completionRate < 80 ? "high" : "medium",
      title: `Completion Rate: ${statistics.completionRate}%`,
      description:
        "Some tickets may not be completing their full service cycle",
      impact:
        statistics.completionRate < 80
          ? "High service quality risk"
          : "Moderate process efficiency impact",
      actionable: true,
      createdAt: new Date(),
    });
  }

  // Insight 4: Service efficiency
  if (statistics.avgServiceTime > 0) {
    const efficiency =
      statistics.avgServiceTime < 5
        ? "excellent"
        : statistics.avgServiceTime < 10
        ? "good"
        : "needs-improvement";

    if (efficiency === "needs-improvement") {
      insights.push({
        id: `service-time-${Date.now()}`,
        type: "efficiency",
        priority: "medium",
        title: `Service Time: ${statistics.avgServiceTime} minutes`,
        description: "Service times could be optimized for better throughput",
        impact: "Process optimization opportunity",
        actionable: true,
        createdAt: new Date(),
      });
    }
  }

  return insights;
};

/**
 * Format data for predictive charts
 */
export const formatForPredictiveChart = (timeSeriesData: TimeSeriesPoint[]) => {
  return timeSeriesData.map((point) => ({
    timestamp: point.timestamp.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    actual: point.value,
    label: `${point.value} tickets`,
  }));
};

