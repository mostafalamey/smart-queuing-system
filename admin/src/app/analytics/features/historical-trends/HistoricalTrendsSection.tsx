import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  Users,
  Target,
} from "lucide-react";
import { EnhancedAnalyticsData } from "../../hooks/useEnhancedAnalyticsData";

interface HistoricalTrendsSectionProps {
  analyticsData: EnhancedAnalyticsData | null;
  loading: boolean;
}

interface MetricDataPoint {
  date: string;
  value: number;
}

interface ComparisonData {
  current: number;
  previous: number;
  change: number;
}

export const HistoricalTrendsSection: React.FC<
  HistoricalTrendsSectionProps
> = ({ analyticsData, loading }) => {
  const [selectedMetric, setSelectedMetric] = useState<
    "waitTime" | "volume" | "completion"
  >("waitTime");

  if (loading) {
    return (
      <div className="analytics-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (
    !analyticsData?.historicalTrends ||
    analyticsData.historicalTrends.length === 0
  ) {
    return (
      <div className="analytics-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">
            Historical Trends
          </h2>
        </div>
        <div className="text-center py-12 text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No historical data available yet</p>
          <p className="text-sm">
            Analytics will appear here once data is collected over time
          </p>
        </div>
      </div>
    );
  }

  const trendData = analyticsData.historicalTrends;
  const periodComparison = analyticsData.periodComparison;

  // Get data for selected metric
  const getMetricData = (): MetricDataPoint[] => {
    if (!trendData || trendData.length === 0) return [];

    switch (selectedMetric) {
      case "waitTime":
        return trendData.map((d: any) => ({
          date: d.date,
          value: isFinite(d.avgWaitTime) ? d.avgWaitTime : 0,
        }));
      case "volume":
        return trendData.map((d: any) => ({
          date: d.date,
          value: isFinite(d.ticketVolume) ? d.ticketVolume : 0,
        }));
      case "completion":
        return trendData.map((d: any) => ({
          date: d.date,
          value: isFinite(d.completionRate) ? d.completionRate : 0,
        }));
      default:
        return [];
    }
  };

  const metricData = getMetricData();

  // Safe min/max calculation with fallbacks
  const validValues = metricData
    .map((d) => d.value)
    .filter((v) => typeof v === "number" && isFinite(v));

  const maxValue = validValues.length > 0 ? Math.max(...validValues) : 100;
  const minValue = validValues.length > 0 ? Math.min(...validValues) : 0;

  // Get comparison data for selected metric
  const getComparisonData = (): ComparisonData | null => {
    if (!periodComparison) return null;

    switch (selectedMetric) {
      case "waitTime":
        return periodComparison.waitTime;
      case "volume":
        return periodComparison.volume;
      case "completion":
        return periodComparison.completion;
      default:
        return null;
    }
  };

  const comparisonData = getComparisonData();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getMetricInfo = () => {
    switch (selectedMetric) {
      case "waitTime":
        return { label: "Wait Time", unit: "min", color: "blue", icon: Clock };
      case "volume":
        return {
          label: "Ticket Volume",
          unit: "",
          color: "green",
          icon: Users,
        };
      case "completion":
        return {
          label: "Completion Rate",
          unit: "%",
          color: "purple",
          icon: Target,
        };
      default:
        return { label: "", unit: "", color: "gray", icon: BarChart3 };
    }
  };

  const metricInfo = getMetricInfo();
  const MetricIcon = metricInfo.icon;

  return (
    <div className="analytics-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">
            Historical Trends
          </h2>
        </div>

        <div className="flex gap-2">
          {[
            { key: "waitTime", label: "Wait Time", icon: Clock },
            { key: "volume", label: "Volume", icon: Users },
            { key: "completion", label: "Completion", icon: Target },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key as any)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedMetric === key
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Period Comparison Cards */}
      {comparisonData && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MetricIcon className={`h-5 w-5 text-${metricInfo.color}-600`} />
              <span className="text-sm font-medium text-gray-600">
                Current Period
              </span>
            </div>
            <div className={`text-2xl font-bold text-${metricInfo.color}-600`}>
              {Math.round(comparisonData.current * 10) / 10}
              {metricInfo.unit}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MetricIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                Previous Period
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-600">
              {Math.round(comparisonData.previous * 10) / 10}
              {metricInfo.unit}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              {comparisonData.change >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
              <span className="text-sm font-medium text-gray-600">Change</span>
            </div>
            <div
              className={`text-2xl font-bold ${
                comparisonData.change >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {comparisonData.change >= 0 ? "+" : ""}
              {Math.round(comparisonData.change * 10) / 10}%
            </div>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div className="relative">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            {metricInfo.label} Trend Over Time
          </h3>
          <p className="text-sm text-gray-500">
            Historical {metricInfo.label.toLowerCase()} data for the selected
            period
          </p>
        </div>

        <div className="h-64 relative">
          <svg className="w-full h-full" viewBox="0 0 800 200">
            {/* Grid lines */}
            <defs>
              <pattern
                id="grid"
                width="40"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 20"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Trend line */}
            {metricData.length > 1 && (
              <path
                d={`M ${metricData
                  .map((d: MetricDataPoint, i: number) => {
                    const x =
                      metricData.length > 1
                        ? (i / (metricData.length - 1)) * 750 + 25
                        : 400;
                    const valueRange = maxValue - minValue;
                    const normalizedValue =
                      valueRange > 0 ? (d.value - minValue) / valueRange : 0.5;
                    const y =
                      180 -
                      (isFinite(normalizedValue) ? normalizedValue : 0.5) * 160;
                    return `${i === 0 ? "M" : "L"} ${isFinite(x) ? x : 400} ${
                      isFinite(y) ? y : 90
                    }`;
                  })
                  .join(" ")}`}
                fill="none"
                stroke={`rgb(${
                  metricInfo.color === "blue"
                    ? "59 130 246"
                    : metricInfo.color === "green"
                    ? "34 197 94"
                    : "168 85 247"
                })`}
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}

            {/* Data points */}
            {metricData.map((d: MetricDataPoint, i: number) => {
              const x =
                metricData.length > 1
                  ? (i / (metricData.length - 1)) * 750 + 25
                  : 400;
              const valueRange = maxValue - minValue;
              const normalizedValue =
                valueRange > 0 ? (d.value - minValue) / valueRange : 0.5;
              const y =
                180 - (isFinite(normalizedValue) ? normalizedValue : 0.5) * 160;

              const safeX = isFinite(x) ? x : 400;
              const safeY = isFinite(y) ? y : 90;

              return (
                <g key={i}>
                  <circle
                    cx={safeX}
                    cy={safeY}
                    r="4"
                    fill={`rgb(${
                      metricInfo.color === "blue"
                        ? "59 130 246"
                        : metricInfo.color === "green"
                        ? "34 197 94"
                        : "168 85 247"
                    })`}
                    className="hover:r-6 transition-all cursor-pointer"
                  />
                  <title>{`${formatDate(d.date)}: ${
                    isFinite(d.value) ? d.value : 0
                  }${metricInfo.unit}`}</title>
                </g>
              );
            })}

            {/* Y-axis labels */}
            <text x="10" y="20" className="text-xs fill-gray-500">
              {isFinite(maxValue) ? Math.round(maxValue * 10) / 10 : 0}
              {metricInfo.unit}
            </text>
            <text x="10" y="180" className="text-xs fill-gray-500">
              {isFinite(minValue) ? Math.round(minValue * 10) / 10 : 0}
              {metricInfo.unit}
            </text>
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-6 text-xs text-gray-500">
          <span>{formatDate(metricData[0]?.date || "")}</span>
          <span>
            {formatDate(metricData[metricData.length - 1]?.date || "")}
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="text-sm text-gray-500">Average</div>
          <div className="text-lg font-semibold text-gray-900">
            {Math.round(
              (metricData.reduce(
                (sum: number, d: MetricDataPoint) => sum + d.value,
                0
              ) /
                metricData.length) *
                10
            ) / 10}
            {metricInfo.unit}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Maximum</div>
          <div className="text-lg font-semibold text-gray-900">
            {Math.round(maxValue * 10) / 10}
            {metricInfo.unit}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Minimum</div>
          <div className="text-lg font-semibold text-gray-900">
            {Math.round(minValue * 10) / 10}
            {metricInfo.unit}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Data Points</div>
          <div className="text-lg font-semibold text-gray-900">
            {metricData.length}
          </div>
        </div>
      </div>
    </div>
  );
};

