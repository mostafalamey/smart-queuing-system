import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useAppToast } from "@/hooks/useAppToast";
import { Department, Service, QueueData, Branch, Organization } from "./types";

export const useDashboardData = () => {
  const { userProfile, user } = useAuth();
  const {
    userRole,
    canSelectBranch,
    canSelectDepartment,
    shouldAutoSelectBranch,
    shouldAutoSelectDepartment,
    assignedBranchId,
    assignedDepartmentIds,
    canResetQueue,
  } = useRolePermissions();

  const { showSuccess, showError, showWarning, showInfo } = useAppToast();

  // State
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastCleanupTime, setLastCleanupTime] = useState<Date | null>(null);

  // Refs to prevent multiple simultaneous operations
  const isFetchingRef = useRef(false);
  const subscriptionsRef = useRef<any>({ tickets: null, queueSettings: null });
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function declarations with useCallback
  const fetchBranches = useCallback(async () => {
    if (!userProfile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("organization_id", userProfile.organization_id);

      if (error) throw error;
      setBranches(data || []);
      if (data && data.length > 0) {
        setSelectedBranch(data[0].id);
      }
    } catch (error) {
      logger.error("Error fetching branches:", error);
      setConnectionError(true);
    }
  }, [userProfile?.organization_id]);

  const fetchOrganization = useCallback(async () => {
    if (!userProfile?.organization_id) return;

    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, logo_url, primary_color")
        .eq("id", userProfile.organization_id)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      logger.error("Error fetching organization:", error);
    }
  }, [userProfile?.organization_id]);

  const fetchDepartments = useCallback(async () => {
    if (!selectedBranch) return;

    try {
      const { data } = await supabase
        .from("departments")
        .select(
          `
          *,
          branches:branch_id (
            id,
            name
          )
        `
        )
        .eq("branch_id", selectedBranch);

      setDepartments(data || []);
      if (data && data.length > 0) {
        setSelectedDepartment(data[0].id);
      }
    } catch (error) {
      logger.error("Error fetching departments:", error);
      setDepartments([]);
      setConnectionError(true);
    }
  }, [selectedBranch]);

  const fetchServices = useCallback(async () => {
    if (!selectedDepartment) return;

    try {
      const { data } = await supabase
        .from("services")
        .select(
          `
          *,
          department:department_id (
            id,
            name,
            branches:branch_id (
              id,
              name
            )
          )
        `
        )
        .eq("department_id", selectedDepartment)
        .eq("is_active", true)
        .order("name");

      setServices(data || []);
      if (data && data.length > 0) {
        setSelectedService(data[0].id);
      } else {
        setSelectedService("");
      }
    } catch (error) {
      logger.error("Error fetching services:", error);
      setServices([]);
    }
  }, [selectedDepartment]);

  const fetchQueueData = useCallback(async () => {
    if (!selectedDepartment || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);

    try {
      // Get department info
      const { data: department } = await supabase
        .from("departments")
        .select(
          `
          *,
          branches:branch_id (
            id,
            name
          )
        `
        )
        .eq("id", selectedDepartment)
        .single();

      // Get service info if a specific service is selected
      let selectedServiceData = null;
      if (selectedService) {
        const { data: serviceData } = await supabase
          .from("services")
          .select("*")
          .eq("id", selectedService)
          .single();
        selectedServiceData = serviceData;
      }

      // Build ticket queries based on whether a service is selected
      // Get waiting count - create fresh query
      let waitingQuery = supabase
        .from("tickets")
        .select("*", { count: "exact" });
      if (selectedService) {
        waitingQuery = waitingQuery.eq("service_id", selectedService);
      } else {
        waitingQuery = waitingQuery
          .eq("department_id", selectedDepartment)
          .is("service_id", null);
      }
      const { count } = await waitingQuery.eq("status", "waiting");

      // Get currently serving ticket - create fresh query
      let servingQuery = supabase.from("tickets").select("ticket_number");
      if (selectedService) {
        servingQuery = servingQuery.eq("service_id", selectedService);
      } else {
        servingQuery = servingQuery
          .eq("department_id", selectedDepartment)
          .is("service_id", null);
      }
      const { data: servingTickets } = await servingQuery
        .eq("status", "serving")
        .order("updated_at", { ascending: false })
        .limit(1);

      // Get last ticket number - create fresh query
      let lastTicketQuery = supabase.from("tickets").select("ticket_number");
      if (selectedService) {
        lastTicketQuery = lastTicketQuery.eq("service_id", selectedService);
      } else {
        lastTicketQuery = lastTicketQuery
          .eq("department_id", selectedDepartment)
          .is("service_id", null);
      }
      const { data: lastTickets } = await lastTicketQuery
        .order("created_at", { ascending: false })
        .limit(1);

      setQueueData({
        department,
        service: selectedServiceData,
        currentServing: servingTickets?.[0]?.ticket_number || null,
        waitingCount: count || 0,
        lastTicketNumber: lastTickets?.[0]?.ticket_number || null,
      });
    } catch (error) {
      logger.error("Error fetching queue data:", error);
      setQueueData(null);
      setConnectionError(true);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [selectedDepartment, selectedService]);

  const handleRefresh = useCallback(() => {
    fetchQueueData();
    if (connectionError) {
      fetchBranches();
    }

    // Show refresh toast
    showInfo(
      "Data Refreshed",
      "Queue information has been updated with the latest data."
    );
  }, [fetchQueueData, connectionError, fetchBranches, showInfo]);

  // Effects
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userProfile?.organization_id) {
      fetchBranches();
      fetchOrganization();
    }
  }, [userProfile, fetchBranches, fetchOrganization]);

  // Auto-select branch for employees/managers who are assigned to specific branches
  useEffect(() => {
    if (
      shouldAutoSelectBranch &&
      assignedBranchId &&
      branches.length > 0 &&
      !selectedBranch
    ) {
      const assignedBranch = branches.find(
        (branch) => branch.id === assignedBranchId
      );
      if (assignedBranch) {
        logger.info("Auto-selecting assigned branch:", assignedBranch.name);
        setSelectedBranch(assignedBranchId);
      }
    }
  }, [shouldAutoSelectBranch, assignedBranchId, branches, selectedBranch]);

  // Auto-select department for employees who are assigned to specific departments
  useEffect(() => {
    if (
      shouldAutoSelectDepartment &&
      assignedDepartmentIds?.length &&
      departments.length > 0
    ) {
      // For employees, select the first assigned department (override any existing selection)
      const firstAssignedDeptId = assignedDepartmentIds[0];
      const assignedDepartment = departments.find(
        (dept) => dept.id === firstAssignedDeptId
      );

      // Only auto-select if the current selection doesn't match the assigned department
      if (selectedDepartment !== firstAssignedDeptId) {
        if (assignedDepartment) {
          logger.info(
            "Auto-selecting assigned department:",
            assignedDepartment.name
          );
          setSelectedDepartment(firstAssignedDeptId);
        } else {
          logger.error(
            "Assigned department not found in available departments!"
          );
        }
      }
    }
  }, [
    shouldAutoSelectDepartment,
    assignedDepartmentIds,
    departments,
    selectedDepartment,
  ]);

  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments();
    }
  }, [selectedBranch, fetchDepartments]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchServices();
    }
  }, [selectedDepartment, fetchServices]);

  useEffect(() => {
    if (selectedDepartment) {
      fetchQueueData();
    }
  }, [selectedDepartment, selectedService, fetchQueueData]);

  return {
    // State
    selectedBranch,
    setSelectedBranch,
    selectedDepartment,
    setSelectedDepartment,
    selectedService,
    setSelectedService,
    branches,
    departments,
    services,
    organization,
    queueData,
    loading,
    connectionError,
    mounted,
    lastCleanupTime,
    setLastCleanupTime,

    // Functions
    fetchQueueData,
    handleRefresh,

    // Refs (for subscriptions and operations)
    isFetchingRef,
    subscriptionsRef,
    retryTimeoutRef,

    // Toast functions
    showSuccess,
    showError,
    showWarning,
    showInfo,

    // Auth
    userProfile,
    user,

    // Role-based permissions
    userRole,
    canSelectBranch,
    canSelectDepartment,
    shouldAutoSelectBranch,
    shouldAutoSelectDepartment,
    canResetQueue,
    assignedDepartmentIds,

    // Helper functions
    getAssignedDepartmentName: () => {
      if (
        assignedDepartmentIds &&
        assignedDepartmentIds.length > 0 &&
        departments.length > 0
      ) {
        const assignedDept = departments.find(
          (dept) => dept.id === assignedDepartmentIds[0]
        );
        return assignedDept?.name;
      }
      return null;
    },
  };
};
