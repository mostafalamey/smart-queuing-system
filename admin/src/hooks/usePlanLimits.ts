import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { useAuth } from "@/lib/AuthContext";

export interface PlanLimits {
  id: string;
  name: string;
  plan: "starter" | "growth" | "business" | "enterprise";
  max_branches: number;
  max_departments: number;
  max_services: number;
  max_staff: number;
  ticket_cap: number;
  current_branches: number;
  current_departments: number;
  current_services: number;
  current_staff: number;
  remaining_branches: number;
  remaining_departments: number;
  remaining_services: number;
  remaining_staff: number;
  plan_updated_at: string;
}

export interface PlanLimitCheck {
  canCreateBranch: boolean;
  canCreateDepartment: boolean;
  canCreateService: boolean;
  canCreateStaff: boolean;
  upgradeMessage?: string;
}

const PLAN_NAMES = {
  starter: "Starter",
  growth: "Growth",
  business: "Business",
  enterprise: "Enterprise",
};

const PLAN_UPGRADE_PATHS = {
  starter: "Growth",
  growth: "Business",
  business: "Enterprise",
  enterprise: null,
};

export const usePlanLimits = () => {
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();

  const fetchPlanLimits = useCallback(async () => {
    if (!userProfile?.organization_id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from("organization_plan_info")
        .select("*")
        .eq("id", userProfile.organization_id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setPlanLimits(data);
    } catch (err: any) {
      logger.error("Error fetching plan limits:", err);
      setError(err.message || "Failed to fetch plan limits");
    } finally {
      setLoading(false);
    }
  }, [userProfile?.organization_id]);

  useEffect(() => {
    fetchPlanLimits();
  }, [fetchPlanLimits]);

  const checkLimits = useCallback((): PlanLimitCheck => {
    if (!planLimits) {
      return {
        canCreateBranch: false,
        canCreateDepartment: false,
        canCreateService: false,
        canCreateStaff: false,
        upgradeMessage: "Plan limits not loaded",
      };
    }

    const canCreateBranch =
      planLimits.max_branches === -1 ||
      planLimits.current_branches < planLimits.max_branches;

    const canCreateDepartment =
      planLimits.max_departments === -1 ||
      planLimits.current_departments < planLimits.max_departments;

    const canCreateService =
      planLimits.max_services === -1 ||
      planLimits.current_services < planLimits.max_services;

    const canCreateStaff =
      planLimits.max_staff === -1 ||
      planLimits.current_staff < planLimits.max_staff;

    const nextPlan = PLAN_UPGRADE_PATHS[planLimits.plan];
    const upgradeMessage = nextPlan
      ? `Upgrade to ${nextPlan} plan for more resources.`
      : "You are on the highest plan.";

    return {
      canCreateBranch,
      canCreateDepartment,
      canCreateService,
      canCreateStaff,
      upgradeMessage,
    };
  }, [planLimits]);

  const getLimitMessage = useCallback(
    (type: "branch" | "department" | "service" | "staff") => {
      if (!planLimits) return "";

      const limits = checkLimits();
      const nextPlan = PLAN_UPGRADE_PATHS[planLimits.plan];

      switch (type) {
        case "branch":
          if (!limits.canCreateBranch) {
            const limit = planLimits.max_branches;
            return nextPlan
              ? `You've reached your ${
                  PLAN_NAMES[planLimits.plan]
                } plan's branch limit (${limit}). ${limits.upgradeMessage}`
              : `You've reached the maximum branch limit (${limit}).`;
          }
          return "";

        case "department":
          if (!limits.canCreateDepartment) {
            const limit = planLimits.max_departments;
            return nextPlan
              ? `You've reached your ${
                  PLAN_NAMES[planLimits.plan]
                } plan's department limit (${limit}). ${limits.upgradeMessage}`
              : `You've reached the maximum department limit (${limit}).`;
          }
          return "";

        case "service":
          if (!limits.canCreateService) {
            const limit = planLimits.max_services;
            return nextPlan
              ? `You've reached your ${
                  PLAN_NAMES[planLimits.plan]
                } plan's service limit (${limit}). ${limits.upgradeMessage}`
              : `You've reached the maximum service limit (${limit}).`;
          }
          return "";

        case "staff":
          if (!limits.canCreateStaff) {
            const limit = planLimits.max_staff;
            return nextPlan
              ? `You've reached your ${
                  PLAN_NAMES[planLimits.plan]
                } plan's staff limit (${limit}). ${limits.upgradeMessage}`
              : `You've reached the maximum staff limit (${limit}).`;
          }
          return "";

        default:
          return "";
      }
    },
    [planLimits, checkLimits]
  );

  const refreshLimits = useCallback(() => {
    fetchPlanLimits();
  }, [fetchPlanLimits]);

  const getUsagePercentage = useCallback(
    (type: "branch" | "department" | "service" | "staff") => {
      if (!planLimits) return 0;

      switch (type) {
        case "branch":
          if (planLimits.max_branches === -1) return 0; // Unlimited
          return (planLimits.current_branches / planLimits.max_branches) * 100;

        case "department":
          if (planLimits.max_departments === -1) return 0;
          return (
            (planLimits.current_departments / planLimits.max_departments) * 100
          );

        case "service":
          if (planLimits.max_services === -1) return 0;
          return (planLimits.current_services / planLimits.max_services) * 100;

        case "staff":
          if (planLimits.max_staff === -1) return 0;
          return (planLimits.current_staff / planLimits.max_staff) * 100;

        default:
          return 0;
      }
    },
    [planLimits]
  );

  return {
    planLimits,
    loading,
    error,
    checkLimits,
    getLimitMessage,
    refreshLimits,
    getUsagePercentage,
    isUnlimited: (type: "branch" | "department" | "service" | "staff") => {
      if (!planLimits) return false;
      switch (type) {
        case "branch":
          return planLimits.max_branches === -1;
        case "department":
          return planLimits.max_departments === -1;
        case "service":
          return planLimits.max_services === -1;
        case "staff":
          return planLimits.max_staff === -1;
        default:
          return false;
      }
    },
  };
};
