import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { AnalyticsData, Branch, Department, TimeRange } from "../types";

export const useAnalyticsData = () => {
  const { userProfile } = useAuth();
  const { assignedBranchId } = useRolePermissions();

  // State
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Calculate date range based on timeRange
  const getDateRange = useCallback(() => {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

    switch (timeRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setDate(now.getDate() - 30);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, [timeRange]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    if (!userProfile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, organization_id")
        .eq("organization_id", userProfile.organization_id)
        .order("name");

      if (error) throw error;
      setBranches(data || []);

      // Auto-select branch for managers
      if (assignedBranchId && data) {
        const assignedBranch = data.find((b) => b.id === assignedBranchId);
        if (assignedBranch) {
          setSelectedBranch(assignedBranchId);
        }
      } else if (data && data.length === 1) {
        setSelectedBranch(data[0].id);
      }
    } catch (error) {
      logger.error("Error fetching branches:", error);
      setError("Failed to load branches");
    }
  }, [userProfile?.organization_id, assignedBranchId]);

  // Fetch departments based on selected branch
  const fetchDepartments = useCallback(async () => {
    if (!selectedBranch) return;

    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name, branch_id")
        .eq("branch_id", selectedBranch)
        .order("name");

      if (error) throw error;
      setDepartments(data || []);

      // Auto-select first department if only one exists
      if (data && data.length === 1) {
        setSelectedDepartment(data[0].id);
      } else {
        setSelectedDepartment("");
      }
    } catch (error) {
      logger.error("Error fetching departments:", error);
      setError("Failed to load departments");
    }
  }, [selectedBranch]);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!selectedBranch) return;

    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange();

      // Build base query with date range and branch filter
      let ticketsQuery = supabase
        .from("tickets")
        .select(
          `
          id,
          ticket_number,
          status,
          created_at,
          called_at,
          completed_at,
          department_id,
          service_id,
          departments!inner(id, name, branch_id),
          services(id, name, estimated_time)
        `
        )
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .eq("departments.branch_id", selectedBranch);

      // Add department filter if selected
      if (selectedDepartment) {
        ticketsQuery = ticketsQuery.eq("department_id", selectedDepartment);
      }

      const { data: tickets, error: ticketsError } = await ticketsQuery;

      if (ticketsError) throw ticketsError;

      // Process the data
      const processedData = processTicketsData(tickets || []);
      setAnalyticsData(processedData);
    } catch (error) {
      logger.error("Error fetching analytics data:", error);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedDepartment, getDateRange]);

  // Process tickets data into analytics format
  const processTicketsData = (tickets: any[]): AnalyticsData => {
    const totalTickets = tickets.length;
    const servedTickets = tickets.filter((t) => t.status === "completed");
    const waitingTickets = tickets.filter((t) => t.status === "waiting");
    const calledTickets = tickets.filter(
      (t) => t.status === "serving" || t.status === "completed"
    );

    // Calculate wait times (created_at to called_at)
    const waitTimes = calledTickets
      .filter((t) => t.called_at)
      .map((t) => {
        const created = new Date(t.created_at);
        const called = new Date(t.called_at);
        return (called.getTime() - created.getTime()) / (1000 * 60); // minutes
      });

    // Calculate service times (called_at to completed_at)
    const serviceTimes = servedTickets
      .filter((t) => t.called_at && t.completed_at)
      .map((t) => {
        const called = new Date(t.called_at);
        const completed = new Date(t.completed_at);
        return (completed.getTime() - called.getTime()) / (1000 * 60); // minutes
      });

    // Calculate averages
    const avgWaitTime =
      waitTimes.length > 0
        ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length
        : 0;

    const avgServiceTime =
      serviceTimes.length > 0
        ? serviceTimes.reduce((sum, time) => sum + time, 0) /
          serviceTimes.length
        : 0;

    const completionRate =
      totalTickets > 0 ? (servedTickets.length / totalTickets) * 100 : 0;

    // Generate wait time trend (simplified - daily averages)
    const waitTimeTrend = generateWaitTimeTrend(tickets);

    // Department performance
    const departmentPerformance = generateDepartmentPerformance(tickets);

    // Service distribution
    const serviceDistribution = generateServiceDistribution(tickets);

    return {
      avgWaitTime: Math.round(avgWaitTime * 10) / 10,
      avgServiceTime: Math.round(avgServiceTime * 10) / 10,
      ticketsIssued: totalTickets,
      ticketsServed: servedTickets.length,
      noShowRate: 0, // TODO: Calculate based on tickets that were called but never served
      completionRate: Math.round(completionRate * 10) / 10,
      currentWaiting: waitingTickets.length,
      waitTimeTrend,
      peakHours: [], // TODO: Implement peak hours analysis
      departmentPerformance,
      serviceDistribution,
      notificationStats: {
        sent: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
      },
    };
  };

  // Helper functions
  const generateWaitTimeTrend = (tickets: any[]) => {
    // Group tickets by date and calculate daily averages
    const dailyData: { [key: string]: { times: number[]; count: number } } = {};

    tickets.forEach((ticket) => {
      if (ticket.called_at) {
        const date = new Date(ticket.created_at).toISOString().split("T")[0];
        const waitTime =
          (new Date(ticket.called_at).getTime() -
            new Date(ticket.created_at).getTime()) /
          (1000 * 60);

        if (!dailyData[date]) {
          dailyData[date] = { times: [], count: 0 };
        }
        dailyData[date].times.push(waitTime);
        dailyData[date].count++;
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        avgWaitTime:
          data.times.reduce((sum, time) => sum + time, 0) / data.times.length,
        ticketCount: data.count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const generateDepartmentPerformance = (tickets: any[]) => {
    const deptData: { [key: string]: any } = {};

    tickets.forEach((ticket) => {
      const deptId = ticket.department_id;
      const deptName = ticket.departments?.name || "Unknown";

      if (!deptData[deptId]) {
        deptData[deptId] = {
          departmentId: deptId,
          departmentName: deptName,
          waitTimes: [],
          serviceTimes: [],
          totalTickets: 0,
          servedTickets: 0,
          waitingTickets: 0,
        };
      }

      deptData[deptId].totalTickets++;

      if (ticket.status === "waiting") {
        deptData[deptId].waitingTickets++;
      }

      if (ticket.status === "completed") {
        deptData[deptId].servedTickets++;
      }

      if (ticket.called_at) {
        const waitTime =
          (new Date(ticket.called_at).getTime() -
            new Date(ticket.created_at).getTime()) /
          (1000 * 60);
        deptData[deptId].waitTimes.push(waitTime);
      }

      if (ticket.called_at && ticket.completed_at) {
        const serviceTime =
          (new Date(ticket.completed_at).getTime() -
            new Date(ticket.called_at).getTime()) /
          (1000 * 60);
        deptData[deptId].serviceTimes.push(serviceTime);
      }
    });

    return Object.values(deptData).map((dept: any) => ({
      departmentId: dept.departmentId,
      departmentName: dept.departmentName,
      avgWaitTime:
        dept.waitTimes.length > 0
          ? Math.round(
              (dept.waitTimes.reduce(
                (sum: number, time: number) => sum + time,
                0
              ) /
                dept.waitTimes.length) *
                10
            ) / 10
          : 0,
      avgServiceTime:
        dept.serviceTimes.length > 0
          ? Math.round(
              (dept.serviceTimes.reduce(
                (sum: number, time: number) => sum + time,
                0
              ) /
                dept.serviceTimes.length) *
                10
            ) / 10
          : 0,
      ticketsServed: dept.servedTickets,
      waitingCount: dept.waitingTickets,
    }));
  };

  const generateServiceDistribution = (tickets: any[]) => {
    const serviceData: { [key: string]: { name: string; count: number } } = {};

    tickets.forEach((ticket) => {
      const serviceName = ticket.services?.name || "General Service";

      if (!serviceData[serviceName]) {
        serviceData[serviceName] = { name: serviceName, count: 0 };
      }
      serviceData[serviceName].count++;
    });

    const total = tickets.length;
    return Object.values(serviceData).map((service) => ({
      serviceName: service.name,
      ticketCount: service.count,
      percentage:
        total > 0 ? Math.round((service.count / total) * 100 * 10) / 10 : 0,
    }));
  };

  // Refresh data function
  const refreshData = useCallback(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Effects
  useEffect(() => {
    if (userProfile?.organization_id) {
      fetchBranches();
    }
  }, [fetchBranches]);

  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments();
    }
  }, [fetchDepartments]);

  useEffect(() => {
    if (selectedBranch) {
      fetchAnalyticsData();
    }
  }, [fetchAnalyticsData]);

  return {
    // State
    selectedBranch,
    setSelectedBranch,
    selectedDepartment,
    setSelectedDepartment,
    timeRange,
    setTimeRange,
    analyticsData,
    loading,
    error,
    branches,
    departments,

    // Actions
    refreshData,
  };
};
