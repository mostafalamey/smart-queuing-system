import React, { useState, useEffect } from "react";
import {
  Activity,
  Wifi,
  WifiOff,
  TrendingUp,
  Clock,
  Users,
  Star,
} from "lucide-react";
import { useRealTimeQueueData } from "../hooks/useRealTimeQueueData";

interface RealTimeAnalyticsDashboardProps {
  organizationId: string;
  refreshInterval?: number; // in milliseconds
}

interface LiveMetricCardProps {
  title: string;
  value: string | number;
  trend?: "up" | "down" | "stable";
  icon: React.ReactNode;
  loading?: boolean;
  subtitle?: string;
}

interface ConnectionStatusProps {
  status: "connected" | "disconnected" | "reconnecting";
  lastUpdate?: Date | null;
}

/**
 * Real-Time Analytics Dashboard Component
 * Displays live metrics with real Supabase data
 */
export const RealTimeAnalyticsDashboard: React.FC<
  RealTimeAnalyticsDashboardProps
> = ({ organizationId, refreshInterval = 5000 }) => {
  const { activeTickets, metrics, loading, error, lastUpdate } =
    useRealTimeQueueData(refreshInterval);

  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "reconnecting"
  >("connected");

  // Update connection status based on data freshness
  useEffect(() => {
    if (error) {
      setConnectionStatus("disconnected");
    } else if (loading) {
      setConnectionStatus("reconnecting");
    } else {
      setConnectionStatus("connected");
    }
  }, [error, loading]);

  if (loading && !metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Live Queue Metrics
          </h2>
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-gray-400 animate-pulse" />
            <span className="text-sm text-gray-500">Loading...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Live Queue Metrics
          </h2>
          <div className="flex items-center space-x-2 text-red-600">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm">Connection Error</span>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 mb-2">Failed to load real-time data</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Live Queue Metrics
        </h2>
        <div className="flex items-center space-x-4">
          <ConnectionStatus status={connectionStatus} lastUpdate={lastUpdate} />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <LiveMetricCard
          title="Active Tickets"
          value={metrics?.totalActiveTickets || 0}
          icon={<Users className="h-5 w-5" />}
          trend="stable"
          subtitle={`${metrics?.waitingCount || 0} waiting`}
        />

        <LiveMetricCard
          title="Average Wait"
          value={`${metrics?.avgWaitTime || 0}m`}
          icon={<Clock className="h-5 w-5" />}
          trend={
            (metrics?.avgWaitTime || 0) > 10
              ? "up"
              : (metrics?.avgWaitTime || 0) < 5
              ? "down"
              : "stable"
          }
          subtitle="Current average"
        />

        <LiveMetricCard
          title="Longest Wait"
          value={`${metrics?.longestWaitTime || 0}m`}
          icon={<TrendingUp className="h-5 w-5" />}
          trend={(metrics?.longestWaitTime || 0) > 15 ? "up" : "stable"}
          subtitle="Maximum wait time"
        />

        <LiveMetricCard
          title="Being Served"
          value={metrics?.servingCount || 0}
          icon={<Activity className="h-5 w-5" />}
          trend="stable"
          subtitle="Currently serving"
        />
      </div>

      {/* Department Queues */}
      {metrics?.departmentQueues &&
        Object.keys(metrics.departmentQueues).length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Department Queue Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(metrics.departmentQueues).map(([dept, count]) => (
                <div
                  key={dept}
                  className="bg-gray-50 rounded-lg p-3 flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700 truncate">{dept}</span>
                  <span
                    className={`
                  text-sm font-medium px-2 py-1 rounded-full
                  ${
                    count > 5
                      ? "bg-red-100 text-red-800"
                      : count > 2
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }
                `}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};

// Connection Status Component
const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status,
  lastUpdate,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "text-green-600";
      case "disconnected":
        return "text-red-600";
      case "reconnecting":
        return "text-yellow-600";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "connected":
        return <Wifi className="h-4 w-4" />;
      case "disconnected":
        return <WifiOff className="h-4 w-4" />;
      case "reconnecting":
        return <Activity className="h-4 w-4 animate-pulse" />;
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
      {getStatusIcon()}
      <span className="text-sm font-medium capitalize">{status}</span>
      {lastUpdate && (
        <span className="text-xs text-gray-500">
          {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

// Live Metric Card Component
const LiveMetricCard: React.FC<LiveMetricCardProps> = ({
  title,
  value,
  trend,
  icon,
  loading,
  subtitle,
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case "down":
        return (
          <TrendingUp className="w-4 h-4 text-green-500 transform rotate-180" />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-600">{title}</h4>
        <div className="p-2 bg-gray-50 rounded-lg text-gray-500">{icon}</div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>

        {getTrendIcon() && (
          <div className="flex items-center">{getTrendIcon()}</div>
        )}
      </div>
    </div>
  );
};
