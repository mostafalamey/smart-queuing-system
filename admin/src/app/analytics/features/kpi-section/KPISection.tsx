import React from "react";
import {
  Clock,
  Zap,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { AnalyticsData } from "../../types";

interface KPISectionProps {
  data: AnalyticsData | null;
  loading: boolean;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: "blue" | "purple" | "green" | "yellow" | "red";
  trend?: "up" | "down" | "neutral";
  loading: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  loading,
}) => {
  const getIconColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-100 text-blue-600";
      case "purple":
        return "bg-purple-100 text-purple-600";
      case "green":
        return "bg-green-100 text-green-600";
      case "yellow":
        return "bg-yellow-100 text-yellow-600";
      case "red":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const safeTrendIcon = getTrendIcon(trend);

  return (
    <div className="analytics-card-kpi p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getIconColorClasses(color)}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700">{title}</h3>
            <div className="flex items-center gap-2 mt-1">{safeTrendIcon}</div>
          </div>
        </div>
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-20 mb-2"></div>
            <div className="h-4 bg-gray-300 rounded w-32"></div>
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export const KPISection: React.FC<KPISectionProps> = ({ data, loading }) => {
  const formatTime = (minutes: number): string => {
    if (!minutes || isNaN(minutes) || minutes < 0) return "0m";
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getCompletionRateDisplay = (): {
    value: string;
    subtitle: string;
    trend?: "up" | "down" | "neutral";
  } => {
    if (!data) return { value: "0%", subtitle: "No data available" };

    const rate = data.completionRate || 0;
    // Ensure rate is a valid number
    const validRate = isNaN(rate) ? 0 : Math.round(rate);

    let subtitle = "";
    let trend: "up" | "down" | "neutral" = "neutral";

    if (validRate >= 90) {
      subtitle = "Excellent performance";
      trend = "up";
    } else if (validRate >= 75) {
      subtitle = "Good performance";
      trend = "up";
    } else if (validRate >= 50) {
      subtitle = "Needs improvement";
      trend = "neutral";
    } else {
      subtitle = "Poor performance";
      trend = "down";
    }

    return { value: `${validRate}%`, subtitle, trend };
  };

  const completionRateInfo = getCompletionRateDisplay();

  // Safe number helper
  const safeNumber = (value: number | undefined | null): number => {
    if (value === null || value === undefined || isNaN(value)) {
      return 0;
    }
    return value;
  };

  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Key Performance Indicators
        </h2>
        <p className="text-gray-600">
          Overview of your queue's performance metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Average Wait Time */}
        <KPICard
          title="Average Wait Time"
          value={data ? formatTime(data.avgWaitTime) : "0m"}
          subtitle="Time from ticket to call"
          icon={<Clock className="w-6 h-6" />}
          color="blue"
          loading={loading}
        />

        {/* Average Service Time */}
        <KPICard
          title="Average Service Time"
          value={data ? formatTime(data.avgServiceTime) : "0m"}
          subtitle="Time from call to completion"
          icon={<Zap className="w-6 h-6" />}
          color="purple"
          loading={loading}
        />

        {/* Completion Rate */}
        <KPICard
          title="Completion Rate"
          value={completionRateInfo.value}
          subtitle={completionRateInfo.subtitle}
          icon={<CheckCircle className="w-6 h-6" />}
          trend={completionRateInfo.trend}
          color="green"
          loading={loading}
        />

        {/* Currently Waiting */}
        <KPICard
          title="Currently Waiting"
          value={data ? safeNumber(data.currentWaiting) : 0}
          subtitle={`${
            data ? safeNumber(data.ticketsIssued) : 0
          } tickets issued today`}
          icon={<AlertCircle className="w-6 h-6" />}
          color={
            data && safeNumber(data.currentWaiting) > 10
              ? "red"
              : data && safeNumber(data.currentWaiting) > 5
              ? "yellow"
              : "green"
          }
          loading={loading}
        />
      </div>

      {/* Additional Stats Bar */}
      {data && !loading && (
        <div className="mt-6 analytics-card-stats p-4">
          <div className="grid grid-cols-3 divide-x divide-gray-300">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {safeNumber(data.ticketsServed)}
              </div>
              <div className="text-sm text-gray-600">Tickets Served</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {safeNumber(data.ticketsIssued) -
                  safeNumber(data.ticketsServed)}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(safeNumber(data.noShowRate))}%
              </div>
              <div className="text-sm text-gray-600">No Show Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

