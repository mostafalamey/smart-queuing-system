import React from "react";
import { PieChart, BarChart3, Activity, Users } from "lucide-react";
import { AnalyticsData } from "../../types";

interface VolumeSectionProps {
  data: AnalyticsData | null;
  loading: boolean;
}

interface SimplePieChartProps {
  data: { serviceName: string; percentage: number; ticketCount: number }[];
  width?: number;
  height?: number;
}

const SimplePieChart: React.FC<SimplePieChartProps> = ({
  data,
  width = 300,
  height = 300,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <PieChart className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No service data available</p>
        </div>
      </div>
    );
  }

  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
  ];

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20;

  let currentAngle = -90; // Start from top

  const segments = data.map((segment, index) => {
    const angle = (segment.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      "Z",
    ].join(" ");

    currentAngle += angle;

    return {
      path: pathData,
      color: colors[index % colors.length],
      ...segment,
    };
  });

  return (
    <div className="flex flex-col items-center w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="mb-4 max-w-sm"
        preserveAspectRatio="xMidYMid meet"
      >
        {segments.map((segment, index) => (
          <g key={index}>
            <path
              d={segment.path}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            />
          </g>
        ))}

        {/* Center circle for donut effect */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius * 0.4}
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        {/* Center text */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          className="text-lg font-bold fill-gray-900"
        >
          {data.reduce((sum, item) => sum + item.ticketCount, 0)}
        </text>
        <text
          x={centerX}
          y={centerY + 10}
          textAnchor="middle"
          className="text-sm fill-gray-600"
        >
          Total Tickets
        </text>
      </svg>

      {/* Legend */}
      <div className="grid grid-cols-1 gap-2 max-w-xs w-full">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div
              className={`w-4 h-4 rounded-sm flex-shrink-0 bg-${
                [
                  "blue",
                  "green",
                  "yellow",
                  "red",
                  "purple",
                  "cyan",
                  "lime",
                  "orange",
                  "pink",
                  "indigo",
                ][index % 10]
              }-500`}
            ></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {segment.serviceName}
              </div>
              <div className="text-xs text-gray-500">
                {segment.ticketCount} tickets ({segment.percentage}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const VolumeStats: React.FC<{ data: AnalyticsData }> = ({ data }) => {
  // Safe number helper
  const safeNumber = (value: number | undefined | null): number => {
    if (value === null || value === undefined || isNaN(value)) {
      return 0;
    }
    return value;
  };

  const totalTickets = safeNumber(data.ticketsIssued);
  const servedTickets = safeNumber(data.ticketsServed);
  const waitingTickets = safeNumber(data.currentWaiting);
  const pendingTickets = Math.max(
    0,
    totalTickets - servedTickets - waitingTickets
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-900">
              {totalTickets}
            </div>
            <div className="text-sm text-blue-700">Tickets Issued</div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-500 rounded-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-green-900">
              {servedTickets}
            </div>
            <div className="text-sm text-green-700">Tickets Served</div>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-yellow-500 rounded-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-900">
              {waitingTickets}
            </div>
            <div className="text-sm text-yellow-700">Currently Waiting</div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-500 rounded-lg">
            <PieChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {pendingTickets}
            </div>
            <div className="text-sm text-gray-700">Other Status</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VolumeSection: React.FC<VolumeSectionProps> = ({
  data,
  loading,
}) => {
  return (
    <div className="mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Volume & Throughput
        </h2>
        <p className="text-gray-600">
          Analyze ticket distribution and service usage
        </p>
      </div>

      <div className="space-y-6">
        {/* Service Distribution - Full Width */}
        <div className="analytics-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PieChart className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Service Distribution
              </h3>
              <p className="text-sm text-gray-600">
                Breakdown of tickets by service type
              </p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          ) : (
            <div className="flex justify-center">
              <SimplePieChart
                data={data?.serviceDistribution || []}
                width={400}
                height={300}
              />
            </div>
          )}
        </div>

        {/* Volume Statistics */}
        <div className="analytics-card p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Ticket Volume
              </h3>
              <p className="text-sm text-gray-600">
                Current ticket status breakdown
              </p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ) : data ? (
            <VolumeStats data={data} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No volume data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Throughput Summary */}
      {data && !loading && (
        <div className="mt-6 analytics-card-stats p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Throughput Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {data.completionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Completion Rate</div>
              <div className="text-xs text-gray-500 mt-1">
                Tickets completed vs issued
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {data.serviceDistribution?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Active Services</div>
              <div className="text-xs text-gray-500 mt-1">
                Services with tickets
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {data.avgServiceTime &&
                !isNaN(data.avgServiceTime) &&
                data.avgServiceTime > 0
                  ? Math.round((60 / data.avgServiceTime) * 10) / 10
                  : 0}
              </div>
              <div className="text-sm text-gray-600">Tickets/Hour</div>
              <div className="text-xs text-gray-500 mt-1">
                Average processing rate
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">
                {data.currentWaiting &&
                !isNaN(data.currentWaiting) &&
                data.avgWaitTime &&
                !isNaN(data.avgWaitTime) &&
                data.currentWaiting > 0
                  ? Math.round(
                      ((data.currentWaiting * data.avgWaitTime) / 60) * 10
                    ) / 10
                  : 0}
                h
              </div>
              <div className="text-sm text-gray-600">Est. Clear Time</div>
              <div className="text-xs text-gray-500 mt-1">
                Time to clear current queue
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

