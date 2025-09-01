import React from "react";
import { TrendingUp, Clock, BarChart3 } from "lucide-react";
import { AnalyticsData } from "../../types";

interface QueuePerformanceSectionProps {
  data: AnalyticsData | null;
  loading: boolean;
}

interface SimpleLineChartProps {
  data: { date: string; avgWaitTime: number; ticketCount: number }[];
  width?: number;
  height?: number;
}

interface SimpleBarChartProps {
  data: {
    departmentName: string;
    avgWaitTime: number;
    ticketsServed: number;
  }[];
  width?: number;
  height?: number;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  width = 400,
  height = 200,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No data available</p>
        </div>
      </div>
    );
  }

  // Filter out invalid data and ensure we have valid numbers
  const validData = data.filter(
    (d) =>
      d &&
      typeof d.avgWaitTime === "number" &&
      isFinite(d.avgWaitTime) &&
      typeof d.ticketCount === "number" &&
      isFinite(d.ticketCount)
  );

  if (validData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No valid data available</p>
        </div>
      </div>
    );
  }

  const maxWaitTime = Math.max(...validData.map((d) => d.avgWaitTime));
  const minWaitTime = Math.min(...validData.map((d) => d.avgWaitTime));
  const range = maxWaitTime - minWaitTime || 1;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = validData
    .map((point, index) => {
      const x =
        validData.length > 1
          ? padding + (index / (validData.length - 1)) * chartWidth
          : padding + chartWidth / 2;
      const y =
        padding + ((maxWaitTime - point.avgWaitTime) / range) * chartHeight;

      // Ensure coordinates are finite
      const safeX = isFinite(x) ? x : padding + chartWidth / 2;
      const safeY = isFinite(y) ? y : padding + chartHeight / 2;

      return `${safeX},${safeY}`;
    })
    .join(" ");

  const pathD = `M ${points.split(" ").join(" L ")}`;

  return (
    <div className="relative w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Chart area */}
        <rect
          x={padding}
          y={padding}
          width={chartWidth}
          height={chartHeight}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" />

        {/* Points */}
        {validData.map((point, index) => {
          const x =
            validData.length > 1
              ? padding + (index / (validData.length - 1)) * chartWidth
              : padding + chartWidth / 2;
          const y =
            padding + ((maxWaitTime - point.avgWaitTime) / range) * chartHeight;

          // Ensure coordinates are finite
          const safeX = isFinite(x) ? x : padding + chartWidth / 2;
          const safeY = isFinite(y) ? y : padding + chartHeight / 2;

          return (
            <g key={index}>
              <circle cx={safeX} cy={safeY} r="4" fill="#3b82f6" />
              <circle
                cx={safeX}
                cy={safeY}
                r="6"
                fill="#3b82f6"
                fillOpacity="0.2"
              />
            </g>
          );
        })}

        {/* Y-axis labels */}
        <text
          x={padding - 10}
          y={padding}
          textAnchor="end"
          className="text-xs fill-gray-600"
        >
          {isFinite(maxWaitTime) ? Math.round(maxWaitTime) : 0}m
        </text>
        <text
          x={padding - 10}
          y={padding + chartHeight}
          textAnchor="end"
          className="text-xs fill-gray-600"
        >
          {isFinite(minWaitTime) ? Math.round(minWaitTime) : 0}m
        </text>
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-10 text-xs text-gray-600">
        {data.slice(0, 3).map((point, index) => (
          <span key={index}>
            {new Date(point.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        ))}
      </div>
    </div>
  );
};

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  width = 400,
  height = 200,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No data available</p>
        </div>
      </div>
    );
  }

  const safeData = data.filter(
    (d) => d && typeof d.avgWaitTime === "number" && isFinite(d.avgWaitTime)
  );

  if (safeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No valid data available</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    1,
    Math.max(...safeData.map((d) => d.avgWaitTime || 0))
  );
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = (chartWidth / safeData.length) * 0.7;
  const barSpacing = chartWidth / safeData.length;

  return (
    <div className="relative w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Chart area */}
        <rect
          x={padding}
          y={padding}
          width={chartWidth}
          height={chartHeight}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />

        {/* Bars */}
        {safeData.map((item, index) => {
          const avgWaitTime = isFinite(item.avgWaitTime) ? item.avgWaitTime : 0;
          const barHeight = Math.max(1, (avgWaitTime / maxValue) * chartHeight);
          const x = padding + index * barSpacing + (barSpacing - barWidth) / 2;
          const y = padding + chartHeight - barHeight;

          // Ensure all coordinates are finite
          const safeX = isFinite(x) ? x : padding;
          const safeY = isFinite(y) ? y : padding + chartHeight - 1;
          const safeBarHeight = isFinite(barHeight) ? barHeight : 1;
          const safeBarWidth = isFinite(barWidth) ? barWidth : 10;

          return (
            <g key={index}>
              <rect
                x={safeX}
                y={safeY}
                width={safeBarWidth}
                height={safeBarHeight}
                fill="#10b981"
                className="hover:fill-green-600 transition-colors"
              />
              <text
                x={safeX + safeBarWidth / 2}
                y={safeY - 5}
                textAnchor="middle"
                className="text-xs fill-gray-700 font-medium"
              >
                {Math.round(avgWaitTime)}m
              </text>
            </g>
          );
        })}

        {/* Y-axis label */}
        <text
          x={padding - 10}
          y={padding}
          textAnchor="end"
          className="text-xs fill-gray-600"
        >
          {Math.round(maxValue)}m
        </text>
        <text
          x={padding - 10}
          y={padding + chartHeight}
          textAnchor="end"
          className="text-xs fill-gray-600"
        >
          0m
        </text>
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-around mt-2 text-xs text-gray-600">
        {data.map((item, index) => (
          <span key={index} className="text-center max-w-16 truncate">
            {item.departmentName}
          </span>
        ))}
      </div>
    </div>
  );
};

export const QueuePerformanceSection: React.FC<
  QueuePerformanceSectionProps
> = ({ data, loading }) => {
  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Queue Performance
        </h2>
        <p className="text-gray-600">
          Analyze wait times and department efficiency
        </p>
      </div>

      <div className="space-y-6">
        {/* Wait Time Trend - Full Width */}
        <div className="analytics-card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Wait Time Trend
              </h3>
              <p className="text-sm text-gray-600">
                Average wait times over time
              </p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <SimpleLineChart
                data={data?.waitTimeTrend || []}
                width={600}
                height={200}
              />
            </div>
          )}
        </div>

        {/* Department Performance */}
        <div className="analytics-card p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Department Performance
              </h3>
              <p className="text-sm text-gray-600">
                Average wait times by department
              </p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse">
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              <SimpleBarChart
                data={data?.departmentPerformance || []}
                width={600}
                height={200}
              />
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      {data && !loading && (
        <div className="mt-6 analytics-card-stats p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Performance Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {(data.avgWaitTime && !isNaN(data.avgWaitTime)
                  ? data.avgWaitTime
                  : 0
                ).toFixed(1)}
                m
              </div>
              <div className="text-sm text-gray-600">Overall Avg Wait</div>
              <div className="text-xs text-gray-500 mt-1">
                Across all departments
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {data.departmentPerformance?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Active Departments</div>
              <div className="text-xs text-gray-500 mt-1">
                Currently serving customers
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {(data.avgServiceTime && !isNaN(data.avgServiceTime)
                  ? data.avgServiceTime
                  : 0
                ).toFixed(1)}
                m
              </div>
              <div className="text-sm text-gray-600">Avg Service Time</div>
              <div className="text-xs text-gray-500 mt-1">
                Time to complete service
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

