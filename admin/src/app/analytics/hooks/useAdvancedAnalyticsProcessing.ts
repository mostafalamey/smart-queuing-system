import { useMemo } from "react";
import { StatisticalAnalysisEngine } from "@/lib/analytics/StatisticalAnalysisEngine";
import {
  TicketData,
  ProcessedAnalyticsData,
  TrendAnalysis,
  PredictionData,
  BusinessInsight,
  AnomalyData,
  TimeSeriesPoint,
} from "@/lib/analytics/types/analytics";

/**
 * Advanced Analytics Data Processing Hook
 * Transforms raw ticket data into actionable insights
 * Following best practice: < 150 lines, focused responsibility
 */
export const useAdvancedAnalyticsProcessing = () => {
  const processHistoricalData = useMemo(() => {
    return (rawData: TicketData[]): ProcessedAnalyticsData | null => {
      if (!rawData?.length) return null;

      try {
        // Filter valid data
        const validTickets = rawData.filter(
          (ticket) => ticket && ticket.createdAt && ticket.status !== undefined
        );

        if (validTickets.length === 0) return null;

        // Process time series data
        const timeSeriesData = aggregateByTimeIntervals(validTickets, "hour");

        // Detect seasonal patterns
        const seasonalPatterns = detectSeasonalPatterns(timeSeriesData);

        // Identify outliers
        const outlierDetection = identifyOutliers(validTickets);

        return {
          trends: calculateTrends(timeSeriesData),
          predictions: generatePredictions(timeSeriesData, seasonalPatterns),
          insights: extractBusinessInsights(validTickets),
          anomalies: outlierDetection,
        };
      } catch (error) {
        console.error("Error processing analytics data:", error);
        return null;
      }
    };
  }, []);

  return { processHistoricalData };
};

// Helper functions for data processing

/**
 * Aggregate ticket data by time intervals
 */
function aggregateByTimeIntervals(
  tickets: TicketData[],
  interval: "hour" | "day" | "week"
): TimeSeriesPoint[] {
  const aggregatedData = new Map<
    string,
    { count: number; totalWaitTime: number; totalServiceTime: number }
  >();

  tickets.forEach((ticket) => {
    const key = formatTimeKey(ticket.createdAt, interval);
    const existing = aggregatedData.get(key) || {
      count: 0,
      totalWaitTime: 0,
      totalServiceTime: 0,
    };

    existing.count += 1;
    existing.totalWaitTime += ticket.waitTime || 0;
    existing.totalServiceTime += ticket.serviceTime || 0;

    aggregatedData.set(key, existing);
  });

  return Array.from(aggregatedData.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([timeKey, data]) => ({
      timestamp: parseTimeKey(timeKey, interval),
      value: data.count,
    }));
}

/**
 * Detect seasonal patterns in time series data
 */
function detectSeasonalPatterns(data: TimeSeriesPoint[]): any {
  if (data.length < 24) return null; // Need at least 24 hours of data

  try {
    const decomposition = StatisticalAnalysisEngine.decomposeTimeSeries(data);
    return {
      hasSeasonal: decomposition.seasonal.some((val) => Math.abs(val) > 0.1),
      seasonalComponent: decomposition.seasonal,
      trendComponent: decomposition.trend,
    };
  } catch (error) {
    console.error("Error detecting seasonal patterns:", error);
    return null;
  }
}

/**
 * Identify data outliers and anomalies
 */
function identifyOutliers(tickets: TicketData[]): AnomalyData[] {
  const anomalies: AnomalyData[] = [];

  try {
    // Analyze wait times for outliers
    const waitTimes = tickets
      .filter((t) => t.waitTime !== undefined && t.waitTime > 0)
      .map((t) => t.waitTime!);

    if (waitTimes.length > 4) {
      const outliers = StatisticalAnalysisEngine.detectOutliers(
        waitTimes,
        "iqr"
      );

      outliers.forEach((outlier, index) => {
        if (outlier.isOutlier) {
          const ticket = tickets[index];
          anomalies.push({
            timestamp: ticket.createdAt,
            metric: "wait_time",
            value: outlier.value,
            expected: waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length,
            severity:
              outlier.score > 3 ? "high" : outlier.score > 2 ? "medium" : "low",
            description: `Unusual wait time detected: ${outlier.value} minutes`,
          });
        }
      });
    }
  } catch (error) {
    console.error("Error identifying outliers:", error);
  }

  return anomalies;
}

/**
 * Calculate trend analysis from time series data
 */
function calculateTrends(data: TimeSeriesPoint[]): TrendAnalysis[] {
  const trends: TrendAnalysis[] = [];

  if (data.length < 3) return trends;

  try {
    // Convert to regression points
    const points = data.map((point, index) => ({
      x: index,
      y: point.value,
    }));

    const regression = StatisticalAnalysisEngine.linearRegression(points);

    trends.push({
      metric: "ticket_volume",
      direction:
        regression.slope > 0.1
          ? "up"
          : regression.slope < -0.1
          ? "down"
          : "stable",
      percentage: Math.abs(regression.slope) * 100,
      confidence: regression.rSquared,
      timeframe: "current_period",
    });
  } catch (error) {
    console.error("Error calculating trends:", error);
  }

  return trends;
}

/**
 * Generate basic predictions from historical data
 */
function generatePredictions(
  data: TimeSeriesPoint[],
  seasonalData: any
): PredictionData[] {
  if (data.length < 5) return [];

  try {
    const lastValue = data[data.length - 1].value;
    const trend =
      data.length > 1
        ? data[data.length - 1].value - data[data.length - 2].value
        : 0;

    // Simple prediction: last value + trend
    const nextHourPrediction = Math.max(0, lastValue + trend);
    const confidence = Math.min(0.8, data.length / 10); // Higher confidence with more data

    return [
      {
        timestamp: new Date(Date.now() + 60 * 60 * 1000), // Next hour
        predicted: nextHourPrediction,
        confidence: {
          lower: nextHourPrediction * (1 - confidence * 0.2),
          upper: nextHourPrediction * (1 + confidence * 0.2),
        },
      },
    ];
  } catch (error) {
    console.error("Error generating predictions:", error);
    return [];
  }
}

/**
 * Extract business insights from ticket data
 */
function extractBusinessInsights(tickets: TicketData[]): BusinessInsight[] {
  const insights: BusinessInsight[] = [];

  try {
    // Analyze peak hours
    const hourlyDistribution = getHourlyDistribution(tickets);
    const peakHour = findPeakHour(hourlyDistribution);

    if (peakHour) {
      insights.push({
        id: `peak-hour-${Date.now()}`,
        type: "efficiency",
        priority: "medium",
        title: "Peak Hour Identified",
        description: `Highest traffic occurs at ${peakHour.hour}:00 with ${peakHour.count} tickets`,
        impact:
          "Consider increasing staff during peak hours to reduce wait times",
        actionable: true,
        createdAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Error extracting business insights:", error);
  }

  return insights;
}

// Utility functions

function formatTimeKey(date: Date, interval: "hour" | "day" | "week"): string {
  const d = new Date(date);
  switch (interval) {
    case "hour":
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}-${String(
        d.getHours()
      ).padStart(2, "0")}`;
    case "day":
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    case "week":
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return `${weekStart.getFullYear()}-W${Math.ceil(
        weekStart.getDate() / 7
      )}`;
    default:
      return d.toISOString();
  }
}

function parseTimeKey(key: string, interval: "hour" | "day" | "week"): Date {
  const parts = key.split("-");
  switch (interval) {
    case "hour":
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
        parseInt(parts[3])
      );
    case "day":
      return new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      );
    default:
      return new Date(key);
  }
}

function getHourlyDistribution(tickets: TicketData[]) {
  const distribution = new Array(24).fill(0);
  tickets.forEach((ticket) => {
    const hour = new Date(ticket.createdAt).getHours();
    distribution[hour]++;
  });
  return distribution;
}

function findPeakHour(distribution: number[]) {
  const maxCount = Math.max(...distribution);
  const peakHourIndex = distribution.indexOf(maxCount);
  return maxCount > 0 ? { hour: peakHourIndex, count: maxCount } : null;
}

