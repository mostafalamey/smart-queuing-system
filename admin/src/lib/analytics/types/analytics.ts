// Core Analytics Types
export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SeasonalDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  prediction: (x: number) => number;
}

export interface OutlierResult {
  index: number;
  value: number;
  isOutlier: boolean;
  score: number;
}

export interface CorrelationResult {
  coefficient: number;
  significance: number;
  strength: "weak" | "moderate" | "strong";
}

export interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  organizationId: string;
  branchId?: string;
  departmentId?: string;
  metrics: string[];
}

export interface TicketData {
  id: string;
  organizationId: string;
  branchId: string;
  departmentId: string;
  serviceId?: string;
  number: string;
  status: "waiting" | "serving" | "completed" | "cancelled";
  createdAt: Date;
  calledAt?: Date;
  completedAt?: Date;
  waitTime?: number;
  serviceTime?: number;
}

export interface ProcessedAnalyticsData {
  trends: TrendAnalysis[];
  predictions: PredictionData[];
  insights: BusinessInsight[];
  anomalies: AnomalyData[];
}

export interface TrendAnalysis {
  metric: string;
  direction: "up" | "down" | "stable";
  percentage: number;
  confidence: number;
  timeframe: string;
}

export interface PredictionData {
  timestamp: Date;
  predicted: number;
  actual?: number;
  confidence: {
    lower: number;
    upper: number;
  };
}

export interface BusinessInsight {
  id: string;
  type: "efficiency" | "staffing" | "capacity" | "satisfaction";
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  impact: string;
  actionable: boolean;
  createdAt: Date;
}

export interface AnomalyData {
  timestamp: Date;
  metric: string;
  value: number;
  expected: number;
  severity: "low" | "medium" | "high";
  description: string;
}

export interface RealTimeMetrics {
  activeQueues: number;
  avgWaitTime: number;
  satisfactionScore: number;
  efficiency: number;
  queueTrend: "up" | "down" | "stable";
  waitTimeTrend: "up" | "down" | "stable";
  satisfactionTrend: "up" | "down" | "stable";
  efficiencyTrend: "up" | "down" | "stable";
  lastUpdated: Date;
}

export interface LiveMetrics {
  timestamp: Date;
  totalTickets: number;
  waitingTickets: number;
  servingTickets: number;
  completedTickets: number;
  averageWaitTime: number;
  averageServiceTime: number;
  efficiency: number;
}
