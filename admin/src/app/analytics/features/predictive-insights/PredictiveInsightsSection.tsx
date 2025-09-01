import React, { useState } from "react";
import {
  Brain,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { EnhancedAnalyticsData } from "../../hooks/useEnhancedAnalyticsData";

interface PredictiveInsightsSectionProps {
  analyticsData: EnhancedAnalyticsData | null;
  loading: boolean;
}

export const PredictiveInsightsSection: React.FC<
  PredictiveInsightsSectionProps
> = ({ analyticsData, loading }) => {
  const [selectedInsight, setSelectedInsight] = useState<
    "waitTime" | "peakHours" | "volume" | "staffing"
  >("waitTime");

  if (loading) {
    return (
      <div className="analytics-card p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const predictiveInsights = analyticsData?.predictiveInsights;

  if (!predictiveInsights) {
    return (
      <div className="analytics-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-800">
            Predictive Insights
          </h2>
        </div>
        <div className="text-center py-12 text-gray-500">
          <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Insufficient data for predictions</p>
          <p className="text-sm">
            Predictive insights will be available once more historical data is
            collected
          </p>
        </div>
      </div>
    );
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "text-green-600 bg-green-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case "high":
        return CheckCircle;
      case "medium":
        return AlertTriangle;
      case "low":
        return AlertTriangle;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="analytics-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-800">
            Predictive Insights
          </h2>
        </div>

        <div className="text-sm text-gray-500">
          Powered by historical analytics
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {/* Wait Time Estimation */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">
              Wait Time Estimation
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-blue-600">
                {predictiveInsights.estimatedWaitTime.value} min
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(
                  predictiveInsights.estimatedWaitTime.confidence
                )}`}
              >
                {predictiveInsights.estimatedWaitTime.confidence.toUpperCase()}{" "}
                CONFIDENCE
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-blue-800 font-medium">
                Analysis Factors:
              </p>
              {predictiveInsights.estimatedWaitTime.factorsConsidered.map(
                (factor, index) => (
                  <p key={index} className="text-sm text-blue-700">
                    • {factor}
                  </p>
                )
              )}
            </div>
          </div>
        </div>

        {/* Peak Hours Prediction */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">
              Peak Hours Prediction
            </h3>
          </div>

          <div className="space-y-3">
            {predictiveInsights.peakHoursPrediction
              .slice(0, 3)
              .map((prediction, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-800">
                      {prediction.hour}:00 - {prediction.hour + 1}:00
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-700">
                      {prediction.expectedVolume} tickets
                    </span>
                    <div className="w-16 bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(prediction.confidence, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Volume Forecast */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-900">
              Volume Forecast
            </h3>
          </div>

          <div className="space-y-4">
            {predictiveInsights.volumeForecast.map((forecast, index) => (
              <div
                key={index}
                className="border-b border-purple-200 pb-3 last:border-b-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-800 capitalize">
                    {forecast.period.replace("_", " ")}
                  </span>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      forecast.trend === "increasing"
                        ? "bg-green-200 text-green-800"
                        : forecast.trend === "decreasing"
                        ? "bg-red-200 text-red-800"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {forecast.trend.toUpperCase()}
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {forecast.expectedTickets} tickets
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staffing Recommendations */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-orange-900">
              Staffing Recommendations
            </h3>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-orange-800 mb-3">
              Optimal staffing levels for peak hours:
            </div>

            {predictiveInsights.recommendedStaffing
              .filter((rec) => rec.recommendedStaff > 1)
              .slice(0, 4)
              .map((recommendation, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-orange-200 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-orange-800">
                      {recommendation.hour}:00
                    </span>
                    <span className="text-xs text-orange-600">
                      {recommendation.recommendedStaff} staff
                    </span>
                  </div>
                  <div
                    className="text-xs text-orange-700 max-w-32 truncate"
                    title={recommendation.reasoning}
                  >
                    {recommendation.reasoning}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Key Insights Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
        <h4 className="text-sm font-semibold text-indigo-900 mb-2">
          Key Predictive Insights
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-indigo-800">
              Next peak: {predictiveInsights.peakHoursPrediction[0]?.hour}:00
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="text-indigo-800">
              Volume trend: {predictiveInsights.volumeForecast[0]?.trend}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            <span className="text-indigo-800">
              Avg wait: {predictiveInsights.estimatedWaitTime.value} min
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

