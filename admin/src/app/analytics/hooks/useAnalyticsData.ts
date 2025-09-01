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

      // Add department filter if selected and valid
      if (
        selectedDepartment &&
        selectedDepartment !== "" &&
        selectedDepartment !== "undefined"
      ) {
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

    // Calculate wait times (created_at to called_at) with validation
    const waitTimes = calledTickets
      .filter((t) => t.called_at && t.created_at)
      .map((t) => {
        try {
          const created = new Date(t.created_at);
          const called = new Date(t.called_at);
          const waitTime = (called.getTime() - created.getTime()) / (1000 * 60); // minutes
          return isNaN(waitTime) || waitTime < 0 ? 0 : waitTime;
        } catch {
          return 0;
        }
      })
      .filter((time) => time >= 0); // Remove negative wait times

    // Calculate service times (called_at to completed_at) with validation
    const serviceTimes = servedTickets
      .filter((t) => t.called_at && t.completed_at)
      .map((t) => {
        try {
          const called = new Date(t.called_at);
          const completed = new Date(t.completed_at);
          const serviceTime =
            (completed.getTime() - called.getTime()) / (1000 * 60); // minutes
          return isNaN(serviceTime) || serviceTime < 0 ? 0 : serviceTime;
        } catch {
          return 0;
        }
      })
      .filter((time) => time >= 0); // Remove negative service times

    // Calculate averages with NaN protection
    const avgWaitTime =
      waitTimes.length > 0
        ? waitTimes.reduce((sum, time) => sum + (isNaN(time) ? 0 : time), 0) /
          waitTimes.length
        : 0;

    const avgServiceTime =
      serviceTimes.length > 0
        ? serviceTimes.reduce(
            (sum, time) => sum + (isNaN(time) ? 0 : time),
            0
          ) / serviceTimes.length
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
      avgWaitTime: isNaN(avgWaitTime) ? 0 : Math.round(avgWaitTime * 10) / 10,
      avgServiceTime: isNaN(avgServiceTime)
        ? 0
        : Math.round(avgServiceTime * 10) / 10,
      ticketsIssued: totalTickets || 0,
      ticketsServed: servedTickets.length || 0,
      noShowRate: 0, // TODO: Calculate based on tickets that were called but never served
      completionRate: isNaN(completionRate)
        ? 0
        : Math.round(completionRate * 10) / 10,
      currentWaiting: waitingTickets.length || 0,
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
      if (ticket.called_at && ticket.created_at) {
        try {
          const date = new Date(ticket.created_at).toISOString().split("T")[0];
          const waitTime =
            (new Date(ticket.called_at).getTime() -
              new Date(ticket.created_at).getTime()) /
            (1000 * 60);

          // Only add valid wait times
          if (!isNaN(waitTime) && waitTime >= 0) {
            if (!dailyData[date]) {
              dailyData[date] = { times: [], count: 0 };
            }
            dailyData[date].times.push(waitTime);
            dailyData[date].count++;
          }
        } catch (error) {
          // Skip invalid dates
        }
      }
    });

    return Object.entries(dailyData)
      .map(([date, data]) => {
        const avgWaitTime =
          data.times.length > 0
            ? data.times.reduce((sum, time) => sum + time, 0) /
              data.times.length
            : 0;

        return {
          date,
          avgWaitTime: isNaN(avgWaitTime)
            ? 0
            : Math.round(avgWaitTime * 10) / 10,
          ticketCount: data.count,
        };
      })
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

      if (ticket.called_at && ticket.created_at) {
        try {
          const waitTime =
            (new Date(ticket.called_at).getTime() -
              new Date(ticket.created_at).getTime()) /
            (1000 * 60);
          if (!isNaN(waitTime) && waitTime >= 0) {
            deptData[deptId].waitTimes.push(waitTime);
          }
        } catch {
          // Skip invalid dates
        }
      }

      if (ticket.called_at && ticket.completed_at) {
        try {
          const serviceTime =
            (new Date(ticket.completed_at).getTime() -
              new Date(ticket.called_at).getTime()) /
            (1000 * 60);
          if (!isNaN(serviceTime) && serviceTime >= 0) {
            deptData[deptId].serviceTimes.push(serviceTime);
          }
        } catch {
          // Skip invalid dates
        }
      }
    });

    return Object.values(deptData).map((dept: any) => {
      const avgWaitTime =
        dept.waitTimes.length > 0
          ? dept.waitTimes.reduce(
              (sum: number, time: number) => sum + time,
              0
            ) / dept.waitTimes.length
          : 0;

      const avgServiceTime =
        dept.serviceTimes.length > 0
          ? dept.serviceTimes.reduce(
              (sum: number, time: number) => sum + time,
              0
            ) / dept.serviceTimes.length
          : 0;

      return {
        departmentId: dept.departmentId,
        departmentName: dept.departmentName,
        avgWaitTime: isNaN(avgWaitTime) ? 0 : Math.round(avgWaitTime * 10) / 10,
        avgServiceTime: isNaN(avgServiceTime)
          ? 0
          : Math.round(avgServiceTime * 10) / 10,
        ticketsServed: dept.servedTickets,
        waitingCount: dept.waitingTickets,
      };
    });
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

