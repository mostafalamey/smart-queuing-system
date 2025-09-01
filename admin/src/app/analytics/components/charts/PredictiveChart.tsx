import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { PredictionData } from "@/lib/analytics/types/analytics";

interface PredictiveChartProps {
  historicalData: Array<{
    timestamp: string;
    actual: number;
    label?: string;
  }>;
  predictions: PredictionData[];
  title?: string;
  loading?: boolean;
  height?: number;
}

/**
 * Enhanced Predictive Chart Component
 * Displays historical data with future predictions and confidence intervals
 * Following best practice: < 200 lines, focused on visualization
 */
export const PredictiveChart: React.FC<PredictiveChartProps> = ({
  historicalData,
  predictions,
  title = "Queue Predictions",
  loading = false,
  height = 320,
}) => {
  // Combine historical and prediction data
  const combinedData = React.useMemo(() => {
    const historical = historicalData.map((item) => ({
      timestamp: item.timestamp,
      actual: item.actual,
      predicted: null,
      confidenceUpper: null,
      confidenceLower: null,
      isPrediction: false,
    }));

    const predicted = predictions.map((pred) => ({
      timestamp: pred.timestamp.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      actual: pred.actual || null,
      predicted: pred.predicted,
      confidenceUpper: pred.confidence.upper,
      confidenceLower: pred.confidence.lower,
      isPrediction: true,
    }));

    return [...historical, ...predicted];
  }, [historicalData, predictions]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
            <div className="h-5 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!combinedData.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-6">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center justify-center h-80 text-gray-500">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No data available for predictions</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-0.5 bg-blue-500"></div>
            <span className="text-gray-600">Historical</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-0.5 bg-orange-500 border-dashed border border-orange-500"></div>
            <span className="text-gray-600">Predicted</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-2 bg-orange-100 border border-orange-200 rounded-sm"></div>
            <span className="text-gray-600">Confidence</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={combinedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={{ stroke: "#cbd5e1" }}
              axisLine={{ stroke: "#e2e8f0" }}
            />

            <YAxis
              tick={{ fontSize: 12, fill: "#64748b" }}
              tickLine={{ stroke: "#cbd5e1" }}
              axisLine={{ stroke: "#e2e8f0" }}
              label={{
                value: "Queue Length",
                angle: -90,
                position: "insideLeft",
              }}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                fontSize: "14px",
              }}
              formatter={(value, name) => [
                typeof value === "number"
                  ? Math.round(value * 100) / 100
                  : value,
                name === "actual"
                  ? "Historical"
                  : name === "predicted"
                  ? "Predicted"
                  : name,
              ]}
              labelFormatter={(label) => `Time: ${label}`}
            />

            {/* Confidence interval area */}
            <Area
              type="monotone"
              dataKey="confidenceUpper"
              stroke="none"
              fill="rgba(251, 146, 60, 0.1)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="confidenceLower"
              stroke="none"
              fill="rgba(255, 255, 255, 1)"
              fillOpacity={1}
            />

            {/* Historical data line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              connectNulls={false}
              name="Historical Data"
            />

            {/* Prediction line */}
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="8 4"
              dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
              connectNulls={false}
              name="Predictions"
            />

            {/* Reference line to separate historical from predictions */}
            <ReferenceLine
              x={historicalData[historicalData.length - 1]?.timestamp}
              stroke="#6b7280"
              strokeDasharray="2 2"
              strokeOpacity={0.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Prediction Summary */}
      {predictions.length > 0 && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-800">
                Next Hour Prediction
              </h4>
              <p className="text-sm text-orange-700 mt-1">
                Expected queue length:{" "}
                <span className="font-semibold">
                  {Math.round(predictions[0].predicted)}
                </span>{" "}
                customers
                <span className="text-orange-600 ml-2">
                  (Range: {Math.round(predictions[0].confidence.lower)} -{" "}
                  {Math.round(predictions[0].confidence.upper)})
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

