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
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color: "blue" | "green" | "yellow" | "purple" | "red";
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color,
  loading = false,
}) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 bg-blue-50 border-blue-200 text-blue-600",
    green:
      "from-green-500 to-green-600 bg-green-50 border-green-200 text-green-600",
    yellow:
      "from-yellow-500 to-yellow-600 bg-yellow-50 border-yellow-200 text-yellow-600",
    purple:
      "from-purple-500 to-purple-600 bg-purple-50 border-purple-200 text-purple-600",
    red: "from-red-500 to-red-600 bg-red-50 border-red-200 text-red-600",
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="analytics-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-3 rounded-lg bg-gradient-to-br ${
            colorClasses[color].split(" ")[0]
          } ${colorClasses[color].split(" ")[1]} text-white shadow-md`}
        >
          {icon}
        </div>
        {trend && trendValue && (
          <div className="flex items-center space-x-1">
            {getTrendIcon()}
            <span
              className={`text-sm font-medium ${
                trend === "up"
                  ? "text-green-600"
                  : trend === "down"
                  ? "text-red-600"
                  : "text-gray-500"
              }`}
            >
              {trendValue}
            </span>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export const KPISection: React.FC<KPISectionProps> = ({ data, loading }) => {
  const formatTime = (minutes: number): string => {
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

    const rate = data.completionRate;
    let subtitle = "";
    let trend: "up" | "down" | "neutral" = "neutral";

    if (rate >= 90) {
      subtitle = "Excellent performance";
      trend = "up";
    } else if (rate >= 75) {
      subtitle = "Good performance";
      trend = "up";
    } else if (rate >= 50) {
      subtitle = "Needs improvement";
      trend = "neutral";
    } else {
      subtitle = "Poor performance";
      trend = "down";
    }

    return { value: `${rate}%`, subtitle, trend };
  };

  const completionRateInfo = getCompletionRateDisplay();

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

        {/* Current Waiting */}
        <KPICard
          title="Currently Waiting"
          value={data ? data.currentWaiting : 0}
          subtitle={`${data ? data.ticketsIssued : 0} tickets issued today`}
          icon={<AlertCircle className="w-6 h-6" />}
          color={
            data && data.currentWaiting > 10
              ? "red"
              : data && data.currentWaiting > 5
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
                {data.ticketsServed}
              </div>
              <div className="text-sm text-gray-600">Tickets Served</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.ticketsIssued - data.ticketsServed}
              </div>
              <div className="text-sm text-gray-600">Pending Tickets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {data.ticketsIssued > 0
                  ? Math.round((data.ticketsServed / data.ticketsIssued) * 100)
                  : 0}
                %
              </div>
              <div className="text-sm text-gray-600">Efficiency Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
