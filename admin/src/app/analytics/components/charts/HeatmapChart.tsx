import React from "react";
import { ResponsiveContainer, Cell } from "recharts";
import { Calendar, TrendingUp } from "lucide-react";

interface HeatmapData {
  day: string;
  hour: number;
  value: number;
  label?: string;
}

interface HeatmapChartProps {
  data: HeatmapData[];
  title?: string;
  loading?: boolean;
  height?: number;
}

/**
 * Enhanced Heatmap Chart Component
 * Displays peak hours analysis across days and hours
 * Following best practice: < 200 lines, focused visualization
 */
export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  title = "Peak Hours Analysis",
  loading = false,
  height = 200, // Reduced from 320
}) => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Get max value for color scaling
  const maxValue = React.useMemo(
    () => Math.max(...data.map((d) => d.value)),
    [data]
  );

  // Create a map for quick lookup
  const dataMap = React.useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((item) => {
      map.set(`${item.day}-${item.hour}`, item.value);
    });
    return map;
  }, [data]);

  // Get color intensity based on value
  const getColorIntensity = (value: number): string => {
    if (maxValue === 0) return "#f3f4f6";

    const intensity = value / maxValue;
    if (intensity === 0) return "#f9fafb";
    if (intensity <= 0.2) return "#dbeafe";
    if (intensity <= 0.4) return "#bfdbfe";
    if (intensity <= 0.6) return "#93c5fd";
    if (intensity <= 0.8) return "#60a5fa";
    return "#3b82f6";
  };

  // Get text color based on background intensity
  const getTextColor = (value: number): string => {
    const intensity = maxValue === 0 ? 0 : value / maxValue;
    return intensity > 0.6 ? "#ffffff" : "#1f2937";
  };

  const findPeakHour = () => {
    if (data.length === 0) return null;
    const peak = data.reduce((max, current) =>
      current.value > max.value ? current : max
    );
    return peak;
  };

  const peakHour = findPeakHour();

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
            <div className="h-5 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Peak Hours Analysis
            </h3>
            <p className="text-xs text-gray-500">
              When customers visit most - darker = busier
            </p>
          </div>
        </div>

        {/* Simplified legend */}
        <div className="flex items-center space-x-1 text-xs text-gray-400">
          <span>Light</span>
          <div className="flex space-x-px">
            {[0.2, 0.5, 0.8].map((opacity) => (
              <div
                key={opacity}
                className="w-2 h-2 bg-blue-500 rounded-sm"
                style={{ opacity }}
              />
            ))}
          </div>
          <span>Heavy</span>
        </div>
      </div>

      {/* Quick peak insight */}
      {peakHour && (
        <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                Busiest: {peakHour.day} at {peakHour.hour}:00 ({peakHour.value}{" "}
                customers)
              </span>
            </div>
            <span className="text-blue-600 text-xs">💡 Peak time staffing</span>
          </div>
        </div>
      )}

      {/* Ultra-compact heatmap */}
      <div className="space-y-2">
        {/* Time headers - accurate 24-hour scale */}
        <div className="flex">
          <div className="w-10"></div>
          <div className="flex-1 flex justify-between text-xs text-gray-400 px-1">
            <span>0</span>
            <span>6</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </div>

        {/* Taller grid with better spacing */}
        {days.map((day) => (
          <div key={day} className="flex items-center">
            <div className="w-10 text-xs font-medium text-gray-600">
              {day.slice(0, 3)}
            </div>

            <div className="flex-1 flex gap-px">
              {hours.map((hour) => {
                const value = dataMap.get(`${day}-${hour}`) || 0;
                const intensity = maxValue === 0 ? 0 : value / maxValue;

                return (
                  <div
                    key={`${day}-${hour}`}
                    className="h-6 flex-1 rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor:
                        value > 0
                          ? `rgba(59, 130, 246, ${Math.max(intensity, 0.15)})`
                          : "#f3f4f6",
                    }}
                    title={`${day} ${hour}:00 - ${value} customers`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-400 text-center">
        Hover for details • Hours 0-23 (midnight to 11PM) • Darker = more
        customers
      </div>

      {/* No data state */}
      {data.length === 0 && (
        <div className="flex items-center justify-center h-20 text-gray-400">
          <div className="text-center">
            <Calendar className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm">No traffic pattern data yet</p>
          </div>
        </div>
      )}
    </div>
  );
};

