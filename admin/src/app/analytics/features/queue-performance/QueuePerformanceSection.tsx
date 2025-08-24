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

  const maxWaitTime = Math.max(...data.map((d) => d.avgWaitTime));
  const minWaitTime = Math.min(...data.map((d) => d.avgWaitTime));
  const range = maxWaitTime - minWaitTime || 1;

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data
    .map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y =
        padding + ((maxWaitTime - point.avgWaitTime) / range) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  const pathD = `M ${points.split(" ").join(" L ")}`;

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
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
        {data.map((point, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth;
          const y =
            padding + ((maxWaitTime - point.avgWaitTime) / range) * chartHeight;
          return (
            <g key={index}>
              <circle cx={x} cy={y} r="4" fill="#3b82f6" />
              <circle cx={x} cy={y} r="6" fill="#3b82f6" fillOpacity="0.2" />
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
          {Math.round(maxWaitTime)}m
        </text>
        <text
          x={padding - 10}
          y={padding + chartHeight}
          textAnchor="end"
          className="text-xs fill-gray-600"
        >
          {Math.round(minWaitTime)}m
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

  const maxValue = Math.max(...data.map((d) => d.avgWaitTime));
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = (chartWidth / data.length) * 0.7;
  const barSpacing = chartWidth / data.length;

  return (
    <div className="relative">
      <svg width={width} height={height}>
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
        {data.map((item, index) => {
          const barHeight = (item.avgWaitTime / maxValue) * chartHeight;
          const x = padding + index * barSpacing + (barSpacing - barWidth) / 2;
          const y = padding + chartHeight - barHeight;

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#10b981"
                className="hover:fill-green-600 transition-colors"
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-xs fill-gray-700 font-medium"
              >
                {Math.round(item.avgWaitTime)}m
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wait Time Trend */}
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
            <SimpleLineChart
              data={data?.waitTimeTrend || []}
              width={400}
              height={200}
            />
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
            <SimpleBarChart
              data={data?.departmentPerformance || []}
              width={400}
              height={200}
            />
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
                {data.avgWaitTime.toFixed(1)}m
              </div>
              <div className="text-sm text-gray-600">Overall Avg Wait</div>
              <div className="text-xs text-gray-500 mt-1">
                Across all departments
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {data.departmentPerformance.length}
              </div>
              <div className="text-sm text-gray-600">Active Departments</div>
              <div className="text-xs text-gray-500 mt-1">
                Currently serving customers
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {data.avgServiceTime.toFixed(1)}m
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
