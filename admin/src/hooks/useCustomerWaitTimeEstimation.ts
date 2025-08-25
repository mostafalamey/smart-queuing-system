import { useState, useCallback } from "react";
import { HistoricalAnalyticsService } from "@/lib/historicalAnalyticsService";
import { logger } from "@/lib/logger";

export interface WaitTimeEstimation {
  estimatedWaitTime: number; // in minutes
  confidence: "high" | "medium" | "low";
  queuePosition?: number;
  factorsConsidered: string[];
  lastUpdated: Date;
}

export interface QueueInfo {
  currentWaiting: number;
  averageServiceTime: number;
  departmentName: string;
  serviceName?: string;
}

export const useCustomerWaitTimeEstimation = () => {
  const [estimation, setEstimation] = useState<WaitTimeEstimation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate wait time estimation for a customer
   */
  const calculateWaitTime = useCallback(
    async (
      departmentId: string,
      serviceId?: string,
      position?: number
    ): Promise<WaitTimeEstimation | null> => {
      setLoading(true);
      setError(null);

      try {
        // Get wait time estimation from historical analytics service
        const estimationData =
          await HistoricalAnalyticsService.getCustomerWaitTimeEstimation(
            departmentId,
            serviceId,
            position
          );

        const waitTimeEstimation: WaitTimeEstimation = {
          estimatedWaitTime: estimationData.value,
          confidence: estimationData.confidence,
          queuePosition: position,
          factorsConsidered: estimationData.factorsConsidered,
          lastUpdated: new Date(),
        };

        setEstimation(waitTimeEstimation);
        return waitTimeEstimation;
      } catch (error) {
        logger.error("Error calculating wait time estimation:", error);
        setError("Unable to calculate wait time estimation");

        // Provide fallback estimation
        const fallbackEstimation: WaitTimeEstimation = {
          estimatedWaitTime: 15,
          confidence: "low",
          queuePosition: position,
          factorsConsidered: [
            "Using default estimate due to service unavailability",
          ],
          lastUpdated: new Date(),
        };

        setEstimation(fallbackEstimation);
        return fallbackEstimation;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get formatted wait time string for display
   */
  const getFormattedWaitTime = useCallback(
    (estimation: WaitTimeEstimation | null): string => {
      if (!estimation) return "Calculating...";

      const minutes = estimation.estimatedWaitTime;

      if (minutes < 1) return "Less than 1 minute";
      if (minutes === 1) return "1 minute";
      if (minutes < 60) return `${Math.round(minutes)} minutes`;

      const hours = Math.floor(minutes / 60);
      const remainingMinutes = Math.round(minutes % 60);

      if (remainingMinutes === 0) {
        return hours === 1 ? "1 hour" : `${hours} hours`;
      }

      return `${hours}h ${remainingMinutes}m`;
    },
    []
  );

  /**
   * Get confidence level description
   */
  const getConfidenceDescription = useCallback(
    (confidence: "high" | "medium" | "low"): string => {
      switch (confidence) {
        case "high":
          return "Very accurate estimate based on recent patterns";
        case "medium":
          return "Good estimate based on available data";
        case "low":
          return "Approximate estimate with limited data";
        default:
          return "Estimate based on available information";
      }
    },
    []
  );

  /**
   * Get confidence color for UI styling
   */
  const getConfidenceColor = useCallback(
    (confidence: "high" | "medium" | "low"): string => {
      switch (confidence) {
        case "high":
          return "text-green-600";
        case "medium":
          return "text-yellow-600";
        case "low":
          return "text-red-600";
        default:
          return "text-gray-600";
      }
    },
    []
  );

  /**
   * Refresh the estimation
   */
  const refreshEstimation = useCallback(
    async (departmentId: string, serviceId?: string, position?: number) => {
      return await calculateWaitTime(departmentId, serviceId, position);
    },
    [calculateWaitTime]
  );

  return {
    // State
    estimation,
    loading,
    error,

    // Actions
    calculateWaitTime,
    refreshEstimation,

    // Utilities
    getFormattedWaitTime,
    getConfidenceDescription,
    getConfidenceColor,
  };
};
