import React, { useState } from "react";
import { BarChart3, Clock, Calendar, TrendingUp } from "lucide-react";
import { EnhancedAnalyticsData } from "../../hooks/useEnhancedAnalyticsData";

interface PeakPatternsAnalysisSectionProps {
  analyticsData: EnhancedAnalyticsData | null;
  loading: boolean;
}

export const PeakPatternsAnalysisSection: React.FC<
  PeakPatternsAnalysisSectionProps
> = ({ analyticsData, loading }) => {
  const [selectedView, setSelectedView] = useState<"hourly" | "daily">(
    "hourly"
  );

  if (loading) {
    return (
      <div className="analytics-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Peak Patterns Analysis
          </h3>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-500">
          Loading peak patterns...
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="analytics-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Peak Patterns Analysis
          </h3>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Get current data based on selected view
  const currentData =
    selectedView === "hourly"
      ? analyticsData.peakPatternsAnalysis?.hourly
      : analyticsData.peakPatternsAnalysis?.daily;

  if (!currentData || currentData.length === 0) {
    return (
      <div className="analytics-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Peak Patterns Analysis
            </h3>
          </div>
        </div>
        <div className="flex items-center justify-center h-48 text-gray-500">
          No peak patterns data available
        </div>
      </div>
    );
  }

  // Calculate max values for normalization with safety checks
  const volumes = currentData
    .map((d: any) => Number(d.avgVolume) || 0)
    .filter((v) => !isNaN(v));
  const waitTimes = currentData
    .map((d: any) => Number(d.avgWaitTime) || 0)
    .filter((v) => !isNaN(v));

  const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 1;
  const maxWaitTime = waitTimes.length > 0 ? Math.max(...waitTimes) : 1;

  const getItemLabel = (item: any, index: number) => {
    if (selectedView === "hourly") {
      return getHourLabel(item.hour || index);
    } else {
      return getDayLabel(item.day || index);
    }
  };

  const getHourLabel = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };

  const getDayLabel = (dayOfWeek: number) => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[dayOfWeek] || `Day ${dayOfWeek + 1}`;
  };

  // Color calculation functions - return inline Tailwind classes
  const getVolumeColor = (volume: number) => {
    const safeVolume = Number(volume) || 0;
    const intensity = maxVolume > 0 ? safeVolume / maxVolume : 0;
    if (intensity >= 0.8) return "bg-red-500";
    if (intensity >= 0.6) return "bg-orange-500";
    if (intensity >= 0.4) return "bg-yellow-500";
    if (intensity >= 0.2) return "bg-blue-400";
    return "bg-green-400";
  };

  const getWaitTimeColor = (waitTime: number) => {
    const safeWaitTime = Number(waitTime) || 0;
    const intensity = maxWaitTime > 0 ? safeWaitTime / maxWaitTime : 0;
    if (intensity >= 0.8) return "bg-red-600";
    if (intensity >= 0.6) return "bg-orange-600";
    if (intensity >= 0.4) return "bg-yellow-600";
    if (intensity >= 0.2) return "bg-blue-500";
    return "bg-green-500";
  };

  return (
    <div className="analytics-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Peak Patterns Analysis
          </h3>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedView("hourly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              selectedView === "hourly"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1" />
            Hourly
          </button>
          <button
            onClick={() => setSelectedView("daily")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              selectedView === "daily"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-1" />
            Daily
          </button>
        </div>
      </div>

      {/* Peak Patterns Content */}
      <div className="space-y-6">
        {/* Volume Patterns */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-gray-900">Volume Patterns</h4>
          </div>

          <div className="space-y-4">
            {currentData.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-4 py-1">
                <div className="w-20 text-sm font-medium text-gray-700 text-right">
                  {getItemLabel(item, index)}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getVolumeColor(
                        item.avgVolume
                      )}`}
                      style={{
                        width: `${
                          ((Number(item.avgVolume) || 0) / maxVolume) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="w-16 text-sm font-medium text-gray-600 text-right">
                    {(Number(item.avgVolume) || 0).toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wait Time Patterns */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-orange-600" />
            <h4 className="font-medium text-gray-900">Wait Time Patterns</h4>
          </div>

          <div className="space-y-4">
            {currentData.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-4 py-1">
                <div className="w-20 text-sm font-medium text-gray-700 text-right">
                  {getItemLabel(item, index)}
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getWaitTimeColor(
                        item.avgWaitTime
                      )}`}
                      style={{
                        width: `${
                          ((Number(item.avgWaitTime) || 0) / maxWaitTime) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="w-16 text-sm font-medium text-gray-600 text-right">
                    {(Number(item.avgWaitTime) || 0).toFixed(1)}m
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h5 className="font-medium text-blue-900">Peak Volume</h5>
            </div>
            <p className="text-sm text-blue-800">
              Peak activity periods help optimize staff scheduling and resource
              allocation.
            </p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <h5 className="font-medium text-orange-900">
                Wait Time Patterns
              </h5>
            </div>
            <p className="text-sm text-orange-800">
              Understanding wait time patterns helps improve service efficiency
              and customer satisfaction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

