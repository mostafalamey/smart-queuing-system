/**
 * Real Historical Ticket Data Hook
 * Fetches historical data from tickets_archive table for analytics
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

export interface HistoricalTicket {
  id: string;
  ticket_number: string;
  department_id: string;
  status: string;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
  archived_at: string;
  customer_phone: string | null;
  priority: number;
  estimated_service_time: number | null;
  department?: {
    id: string;
    name: string;
    branch?: {
      id: string;
      name: string;
      organization_id: string;
    };
  };
}

interface ProcessedHistoricalData {
  tickets: HistoricalTicket[];
  totalCount: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  dataQuality: {
    totalTickets: number;
    ticketsWithCalledTime: number;
    ticketsWithCompletedTime: number;
    calledPercentage: number;
    completedPercentage: number;
  };
}

interface UseHistoricalTicketDataOptions {
  timeRange?: "24h" | "7d" | "30d" | "90d" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  departmentId?: string;
  includeIncompleteTickets?: boolean;
  limit?: number;
}

export const useHistoricalTicketData = (
  options: UseHistoricalTicketDataOptions = {}
) => {
  const { userProfile } = useAuth();
  const [data, setData] = useState<ProcessedHistoricalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    timeRange = "7d",
    customStartDate,
    customEndDate,
    departmentId,
    includeIncompleteTickets = false,
    limit = 10000,
  } = options;

  // Calculate date range based on timeRange
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    if (timeRange === "custom" && customStartDate && customEndDate) {
      return {
        start: new Date(customStartDate),
        end: new Date(customEndDate),
      };
    }

    switch (timeRange) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Changed to 30 days to catch Aug data
        break;
      case "30d":
        startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // Changed to 60 days
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { start: startDate, end: now };
  }, [timeRange, customStartDate, customEndDate]);

  const fetchHistoricalData = useCallback(async () => {
    if (!userProfile?.organization_id) {
      setError("No organization ID available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build the query
      let query = supabase
        .from("tickets_archive")
        .select(
          `
          id,
          ticket_number,
          department_id,
          status,
          created_at,
          called_at,
          completed_at,
          archived_at,
          customer_phone,
          priority,
          estimated_service_time,
          departments!inner(
            id,
            name,
            branches!inner(
              id,
              name,
              organization_id
            )
          )
        `
        )
        .eq("departments.branches.organization_id", userProfile.organization_id)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString())
        .order("created_at", { ascending: false });
      // Add department filter if specified
      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }

      // Filter out incomplete tickets if requested
      if (!includeIncompleteTickets) {
        query = query.not("called_at", "is", null);
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data: tickets, error: fetchError } = await query;

      if (fetchError) {
        console.error("❌ Supabase query error:", fetchError);
        throw fetchError;
      }

      if (!tickets) {
        setData(null);
        return;
      }

      // Calculate data quality metrics
      const totalTickets = tickets.length;
      const ticketsWithCalledTime = tickets.filter(
        (t) => t.called_at !== null
      ).length;
      const ticketsWithCompletedTime = tickets.filter(
        (t) => t.completed_at !== null
      ).length;

      // Process the data
      const processedData: ProcessedHistoricalData = {
        tickets: tickets as HistoricalTicket[],
        totalCount: totalTickets,
        dateRange: {
          earliest:
            tickets.length > 0 ? tickets[tickets.length - 1].created_at : "",
          latest: tickets.length > 0 ? tickets[0].created_at : "",
        },
        dataQuality: {
          totalTickets,
          ticketsWithCalledTime,
          ticketsWithCompletedTime,
          calledPercentage:
            totalTickets > 0
              ? Math.round((ticketsWithCalledTime / totalTickets) * 100)
              : 0,
          completedPercentage:
            totalTickets > 0
              ? Math.round((ticketsWithCompletedTime / totalTickets) * 100)
              : 0,
        },
      };

      setData(processedData);
    } catch (err) {
      console.error("Error in fetchHistoricalData:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [
    userProfile?.organization_id,
    dateRange,
    departmentId,
    includeIncompleteTickets,
    limit,
  ]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  return {
    data,
    loading,
    error,
    refresh,
    dateRange: {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString(),
    },
  };
};
