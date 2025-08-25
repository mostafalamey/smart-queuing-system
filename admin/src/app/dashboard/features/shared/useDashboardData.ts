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
  const [currentTicketHandled, setCurrentTicketHandled] = useState(false);

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

      // Smart department selection based on user assignments
      if (data && data.length > 0) {
        if (assignedDepartmentIds && assignedDepartmentIds.length > 0) {
          // For users with specific department assignments, select the first assigned department
          const firstAssignedDept = data.find((dept) =>
            assignedDepartmentIds.includes(dept.id)
          );
          if (firstAssignedDept) {
            logger.info(
              "Auto-selecting assigned department:",
              firstAssignedDept.name
            );
            setSelectedDepartment(firstAssignedDept.id);
          } else {
            logger.error(
              "None of assigned departments found in branch departments!"
            );
          }
        } else {
          // For users without specific assignments (admins/managers), select first available
          setSelectedDepartment(data[0].id);
        }
      }
    } catch (error) {
      logger.error("Error fetching departments:", error);
      setDepartments([]);
      setConnectionError(true);
    }
  }, [selectedBranch, assignedDepartmentIds]);

  const fetchServices = useCallback(async () => {
    if (!selectedDepartment) return;

    // For employees with specific department assignments, ensure we're only fetching
    // services for departments they're assigned to
    if (assignedDepartmentIds && assignedDepartmentIds.length > 0) {
      if (!assignedDepartmentIds.includes(selectedDepartment)) {
        logger.warn(
          "Attempting to fetch services for non-assigned department",
          {
            selectedDepartment,
            assignedDepartmentIds,
          }
        );
        return;
      }
    }

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
  }, [selectedDepartment, assignedDepartmentIds]);

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

      // Reset ticket handled status when a new ticket starts being served or no ticket is being served
      const newCurrentServing = servingTickets?.[0]?.ticket_number || null;
      const previousCurrentServing = queueData?.currentServing || null;
      if (newCurrentServing !== previousCurrentServing) {
        setCurrentTicketHandled(false);
      }
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

  const markCurrentTicketAsHandled = useCallback(() => {
    setCurrentTicketHandled(true);
  }, []);

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

  // Fallback auto-select department if initial selection was incorrect
  useEffect(() => {
    if (
      shouldAutoSelectDepartment &&
      assignedDepartmentIds?.length &&
      departments.length > 0 &&
      selectedDepartment
    ) {
      // Check if current selection is valid for this user
      if (!assignedDepartmentIds.includes(selectedDepartment)) {
        logger.warn(
          "Current department selection not in user assignments, correcting...",
          {
            currentSelection: selectedDepartment,
            assignedDepartments: assignedDepartmentIds,
          }
        );

        const firstAssignedDeptId = assignedDepartmentIds[0];
        const assignedDepartment = departments.find(
          (dept) => dept.id === firstAssignedDeptId
        );

        if (assignedDepartment) {
          logger.info(
            "Correcting department selection to assigned department:",
            assignedDepartment.name
          );
          setSelectedDepartment(firstAssignedDeptId);
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
    currentTicketHandled,

    // Functions
    fetchQueueData,
    handleRefresh,
    markCurrentTicketAsHandled,

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
