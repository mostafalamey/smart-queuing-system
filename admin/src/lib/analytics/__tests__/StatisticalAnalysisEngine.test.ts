import { StatisticalAnalysisEngine } from "../StatisticalAnalysisEngine";

describe("StatisticalAnalysisEngine", () => {
  describe("calculateMovingAverage", () => {
    it("should calculate moving average correctly", () => {
      const data = [1, 2, 3, 4, 5, 6];
      const window = 3;
      const result = StatisticalAnalysisEngine.calculateMovingAverage(
        data,
        window
      );

      expect(result).toEqual([2, 3, 4, 5]); // (1+2+3)/3=2, (2+3+4)/3=3, etc.
    });

    it("should return empty array when data is smaller than window", () => {
      const data = [1, 2];
      const window = 3;
      const result = StatisticalAnalysisEngine.calculateMovingAverage(
        data,
        window
      );

      expect(result).toEqual([]);
    });
  });

  describe("linearRegression", () => {
    it("should calculate linear regression correctly", () => {
      const data = [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
        { x: 4, y: 8 },
      ];

      const result = StatisticalAnalysisEngine.linearRegression(data);

      expect(result.slope).toBeCloseTo(2, 1);
      expect(result.intercept).toBeCloseTo(0, 1);
      expect(result.rSquared).toBeCloseTo(1, 2);
      expect(result.prediction(5)).toBeCloseTo(10, 1);
    });

    it("should throw error with insufficient data", () => {
      const data = [{ x: 1, y: 2 }];

      expect(() => {
        StatisticalAnalysisEngine.linearRegression(data);
      }).toThrow("Insufficient data points for regression analysis");
    });
  });

  describe("detectOutliers", () => {
    it("should detect outliers using IQR method", () => {
      const data = [1, 2, 2, 3, 3, 3, 4, 4, 5, 100]; // 100 is an outlier
      const result = StatisticalAnalysisEngine.detectOutliers(data, "iqr");

      expect(result).toHaveLength(10);
      expect(result[9].isOutlier).toBe(true); // Last element (100) should be outlier
      expect(result[0].isOutlier).toBe(false); // First element should not be outlier
    });

    it("should detect outliers using Z-score method", () => {
      const data = [1, 2, 2, 3, 3, 3, 4, 4, 5, 100]; // 100 is an outlier
      const result = StatisticalAnalysisEngine.detectOutliers(data, "zscore");

      expect(result).toHaveLength(10);
      expect(result[9].isOutlier).toBe(true); // Last element (100) should be outlier
      expect(result[9].score).toBeGreaterThan(2); // Z-score should be > 2
    });
  });

  describe("calculateCorrelation", () => {
    it("should calculate perfect positive correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];

      const result = StatisticalAnalysisEngine.calculateCorrelation(x, y);

      expect(result.coefficient).toBeCloseTo(1, 2);
      expect(result.strength).toBe("strong");
    });

    it("should calculate perfect negative correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];

      const result = StatisticalAnalysisEngine.calculateCorrelation(x, y);

      expect(result.coefficient).toBeCloseTo(-1, 2);
      expect(result.strength).toBe("strong");
    });

    it("should handle no correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [1, 1, 1, 1, 1]; // Constant values

      const result = StatisticalAnalysisEngine.calculateCorrelation(x, y);

      expect(result.coefficient).toBeCloseTo(0, 2);
      expect(result.strength).toBe("weak");
    });

    it("should throw error with mismatched array lengths", () => {
      const x = [1, 2, 3];
      const y = [1, 2];

      expect(() => {
        StatisticalAnalysisEngine.calculateCorrelation(x, y);
      }).toThrow("Arrays must have the same length and at least 2 elements");
    });
  });
});
