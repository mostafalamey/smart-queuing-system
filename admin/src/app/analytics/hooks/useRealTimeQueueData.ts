/**
 * Real-Time Queue Data Hook
 * Fetches current active tickets and real-time metrics
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

interface CustomRealTimeMetrics {
  totalActiveTickets: number;
  waitingCount: number;
  servingCount: number;
  avgWaitTime: number;
  longestWaitTime: number;
  departmentQueues: Record<string, number>;
  lastUpdated: Date;
}

interface ActiveTicket {
  id: string;
  ticket_number: string;
  department_id: string;
  status: string;
  created_at: string;
  called_at: string | null;
  customer_phone: string | null;
  priority: number;
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

export const useRealTimeQueueData = (refreshInterval: number = 5000) => {
  const { userProfile } = useAuth();
  const [activeTickets, setActiveTickets] = useState<ActiveTicket[]>([]);
  const [metrics, setMetrics] = useState<CustomRealTimeMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchRealTimeData = useCallback(async () => {
    if (!userProfile?.organization_id) {
      setError("No organization ID available");
      return;
    }

    try {
      setError(null);

      // Fetch current active tickets
      const { data: tickets, error: fetchError } = await supabase
        .from("tickets")
        .select(
          `
          id,
          ticket_number,
          department_id,
          status,
          created_at,
          called_at,
          customer_phone,
          priority,
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
        .in("status", ["waiting", "called", "serving"])
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error("Error fetching active tickets:", fetchError);
        throw fetchError;
      }

      const activeTicketsData = (tickets || []) as ActiveTicket[];
      setActiveTickets(activeTicketsData);

      // Calculate real-time metrics
      const currentTime = new Date();
      const waitingTickets = activeTicketsData.filter(
        (t) => t.status === "waiting"
      );
      const servingTickets = activeTicketsData.filter(
        (t) => t.status === "called" || t.status === "serving"
      );

      // Calculate average wait time for waiting tickets
      const avgCurrentWaitTime =
        waitingTickets.length > 0
          ? waitingTickets.reduce((sum, ticket) => {
              const waitMinutes = Math.floor(
                (currentTime.getTime() -
                  new Date(ticket.created_at).getTime()) /
                  (1000 * 60)
              );
              return sum + waitMinutes;
            }, 0) / waitingTickets.length
          : 0;

      // Get queue lengths by department
      const departmentQueues = new Map<string, number>();
      waitingTickets.forEach((ticket) => {
        const deptName = ticket.department?.name || "Unknown";
        departmentQueues.set(
          deptName,
          (departmentQueues.get(deptName) || 0) + 1
        );
      });

      const realTimeMetrics: CustomRealTimeMetrics = {
        totalActiveTickets: activeTicketsData.length,
        waitingCount: waitingTickets.length,
        servingCount: servingTickets.length,
        avgWaitTime: Math.round(avgCurrentWaitTime * 10) / 10,
        longestWaitTime:
          waitingTickets.length > 0
            ? Math.max(
                ...waitingTickets.map((t) =>
                  Math.floor(
                    (currentTime.getTime() - new Date(t.created_at).getTime()) /
                      (1000 * 60)
                  )
                )
              )
            : 0,
        departmentQueues: Object.fromEntries(departmentQueues),
        lastUpdated: currentTime,
      };

      setMetrics(realTimeMetrics);
      setLastUpdate(currentTime);
      setLoading(false);
    } catch (err) {
      console.error("Error in fetchRealTimeData:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setLoading(false);
    }
  }, [userProfile?.organization_id]);

  // Set up polling for real-time updates
  useEffect(() => {
    // Initial fetch
    fetchRealTimeData();

    // Set up interval for regular updates
    const interval = setInterval(fetchRealTimeData, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [fetchRealTimeData, refreshInterval]);

  // Set up real-time subscription for immediate updates
  useEffect(() => {
    if (!userProfile?.organization_id) return;

    const subscription = supabase
      .channel(`tickets_${userProfile.organization_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        (payload) => {
          // Refresh data when tickets change
          fetchRealTimeData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userProfile?.organization_id, fetchRealTimeData]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchRealTimeData();
  }, [fetchRealTimeData]);

  return {
    activeTickets,
    metrics,
    loading,
    error,
    lastUpdate,
    refresh,
  };
};
