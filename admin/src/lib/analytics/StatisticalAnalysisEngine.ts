import {
  TimeSeriesPoint,
  Point,
  SeasonalDecomposition,
  RegressionResult,
  OutlierResult,
  CorrelationResult,
} from "./types/analytics";

/**
 * Statistical Analysis Engine for Advanced Analytics
 * Provides mathematical models and statistical functions
 * Following best practice: < 200 lines, pure functions
 */
export class StatisticalAnalysisEngine {
  /**
   * Calculate moving average for trend analysis
   * @param data - Array of numbers to analyze
   * @param window - Window size for moving average
   * @returns Array of moving averages
   */
  static calculateMovingAverage(data: number[], window: number): number[] {
    if (data.length < window) return [];

    const result: number[] = [];
    for (let i = window - 1; i < data.length; i++) {
      const sum = data
        .slice(i - window + 1, i + 1)
        .reduce((acc, val) => acc + val, 0);
      result.push(sum / window);
    }

    return result;
  }

  /**
   * Decompose time series into trend, seasonal, and residual components
   * Simplified implementation for real-time performance
   */
  static decomposeTimeSeries(data: TimeSeriesPoint[]): SeasonalDecomposition {
    if (data.length < 12) {
      // Not enough data for seasonal decomposition
      return {
        trend: data.map((d) => d.value),
        seasonal: data.map(() => 0),
        residual: data.map(() => 0),
      };
    }

    const values = data.map((d) => d.value);

    // Calculate trend using moving average (simplified)
    const trendWindow = Math.min(12, Math.floor(data.length / 4));
    const trend = this.calculateMovingAverage(values, trendWindow);

    // Pad trend array to match original length
    const paddedTrend = this.padArray(trend, values.length);

    // Calculate seasonal component (simplified)
    const seasonal = this.calculateSeasonalComponent(values, paddedTrend);

    // Calculate residual
    const residual = values.map((val, i) => val - paddedTrend[i] - seasonal[i]);

    return { trend: paddedTrend, seasonal, residual };
  }

  /**
   * Perform linear regression analysis
   */
  static linearRegression(data: Point[]): RegressionResult {
    const n = data.length;
    if (n < 2) {
      throw new Error("Insufficient data points for regression analysis");
    }

    const sumX = data.reduce((sum, point) => sum + point.x, 0);
    const sumY = data.reduce((sum, point) => sum + point.y, 0);
    const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);
    const sumYY = data.reduce((sum, point) => sum + point.y * point.y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const meanY = sumY / n;
    const totalSumSquares = data.reduce(
      (sum, point) => sum + Math.pow(point.y - meanY, 2),
      0
    );
    const residualSumSquares = data.reduce((sum, point) => {
      const predicted = slope * point.x + intercept;
      return sum + Math.pow(point.y - predicted, 2);
    }, 0);

    const rSquared = 1 - residualSumSquares / totalSumSquares;

    return {
      slope,
      intercept,
      rSquared,
      prediction: (x: number) => slope * x + intercept,
    };
  }

  /**
   * Detect outliers using IQR or Z-score methods
   */
  static detectOutliers(
    data: number[],
    method: "iqr" | "zscore" = "iqr"
  ): OutlierResult[] {
    if (data.length < 4)
      return data.map((val, i) => ({
        index: i,
        value: val,
        isOutlier: false,
        score: 0,
      }));

    if (method === "iqr") {
      return this.detectOutliersIQR(data);
    } else {
      return this.detectOutliersZScore(data);
    }
  }

  /**
   * Calculate correlation coefficient between two variables
   */
  static calculateCorrelation(x: number[], y: number[]): CorrelationResult {
    if (x.length !== y.length || x.length < 2) {
      throw new Error(
        "Arrays must have the same length and at least 2 elements"
      );
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
    );

    const coefficient = denominator === 0 ? 0 : numerator / denominator;

    // Calculate significance (simplified)
    const tStat =
      Math.abs(coefficient) *
      Math.sqrt((n - 2) / (1 - coefficient * coefficient));
    const significance = this.calculateTStatSignificance(tStat, n - 2);

    // Determine strength
    const absCoeff = Math.abs(coefficient);
    let strength: "weak" | "moderate" | "strong" = "weak";
    if (absCoeff >= 0.7) strength = "strong";
    else if (absCoeff >= 0.4) strength = "moderate";

    return { coefficient, significance, strength };
  }

  // Private helper methods
  private static padArray(arr: number[], targetLength: number): number[] {
    if (arr.length >= targetLength) return arr.slice(0, targetLength);

    const padLength = targetLength - arr.length;
    const frontPad = Math.floor(padLength / 2);
    const backPad = padLength - frontPad;

    const result = [
      ...Array(frontPad).fill(arr[0]),
      ...arr,
      ...Array(backPad).fill(arr[arr.length - 1]),
    ];
    return result.slice(0, targetLength);
  }

  private static calculateSeasonalComponent(
    values: number[],
    trend: number[]
  ): number[] {
    // Simplified seasonal calculation - assumes 12-period seasonality
    const seasonal = new Array(values.length).fill(0);
    const seasonLength = 12;

    for (let i = 0; i < values.length; i++) {
      const seasonIndex = i % seasonLength;
      // Simple seasonal factor calculation
      seasonal[i] = (values[i] - trend[i]) * 0.1; // Dampened seasonal effect
    }

    return seasonal;
  }

  private static detectOutliersIQR(data: number[]): OutlierResult[] {
    const sorted = [...data].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length / 4);
    const q3Index = Math.floor((3 * sorted.length) / 4);

    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return data.map((value, index) => ({
      index,
      value,
      isOutlier: value < lowerBound || value > upperBound,
      score: Math.abs(value - (q1 + q3) / 2) / iqr,
    }));
  }

  private static detectOutliersZScore(data: number[]): OutlierResult[] {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return data.map((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      return {
        index,
        value,
        isOutlier: zScore > 2, // 2 standard deviations
        score: zScore,
      };
    });
  }

  private static calculateTStatSignificance(
    tStat: number,
    degreesOfFreedom: number
  ): number {
    // Simplified significance calculation
    // In practice, you'd use a t-distribution table or library
    if (tStat > 2.58) return 0.01; // 99% confidence
    if (tStat > 1.96) return 0.05; // 95% confidence
    if (tStat > 1.64) return 0.1; // 90% confidence
    return 0.2; // Low significance
  }
}
