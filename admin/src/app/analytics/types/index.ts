export interface AnalyticsData {
  // KPI Metrics
  avgWaitTime: number; // in minutes
  avgServiceTime: number; // in minutes
  ticketsIssued: number;
  ticketsServed: number;
  noShowRate: number; // percentage
  completionRate: number; // percentage
  currentWaiting: number;

  // Time series data for charts
  waitTimeTrend: {
    date: string;
    avgWaitTime: number;
    ticketCount: number;
  }[];

  peakHours: {
    hour: number;
    day: string;
    ticketCount: number;
  }[];

  departmentPerformance: {
    departmentId: string;
    departmentName: string;
    avgWaitTime: number;
    avgServiceTime: number;
    ticketsServed: number;
    waitingCount: number;
  }[];

  serviceDistribution: {
    serviceName: string;
    ticketCount: number;
    percentage: number;
  }[];

  // Notification effectiveness
  notificationStats: {
    sent: number;
    successful: number;
    failed: number;
    successRate: number;
  };
}

export interface Branch {
  id: string;
  name: string;
  organization_id: string;
}

export interface Department {
  id: string;
  name: string;
  branch_id: string;
}

export interface Service {
  id: string;
  name: string;
  department_id: string;
  estimated_time: number;
}

export type TimeRange = "today" | "week" | "month" | "custom";

export interface AnalyticsFilters {
  timeRange: TimeRange;
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  departmentId?: string;
}

