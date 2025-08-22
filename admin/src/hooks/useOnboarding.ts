import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

interface UseOnboardingResult {
  needsOnboarding: boolean;
  loading: boolean;
  markOnboardingComplete: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
}

export const useOnboarding = (userProfile: any): UseOnboardingResult => {
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, [userProfile]);

  const checkOnboardingStatus = async () => {
    if (!userProfile?.auth_user_id) {
      setLoading(false);
      return;
    }

    try {
      // Check if user has completed onboarding
      const { data, error } = await supabase
        .from("members")
        .select("onboarding_completed, onboarding_skipped, created_at")
        .eq("auth_user_id", userProfile.auth_user_id)
        .single();

      if (error) {
        logger.error("Error checking onboarding status:", error);
        setLoading(false);
        return;
      }

      // Show onboarding if:
      // 1. onboarding_completed is null or false
      // 2. onboarding_skipped is null or false
      // 3. User was created recently (within last 7 days)
      const isNewUser =
        data?.created_at &&
        new Date(data.created_at) >
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const hasCompletedOnboarding = data?.onboarding_completed === true;
      const hasSkippedOnboarding = data?.onboarding_skipped === true;

      setNeedsOnboarding(
        isNewUser && !hasCompletedOnboarding && !hasSkippedOnboarding
      );

      logger.info("Onboarding status checked:", {
        isNewUser,
        hasCompletedOnboarding,
        hasSkippedOnboarding,
        needsOnboarding:
          isNewUser && !hasCompletedOnboarding && !hasSkippedOnboarding,
      });
    } catch (error) {
      logger.error("Error in checkOnboardingStatus:", error);
    } finally {
      setLoading(false);
    }
  };

  const markOnboardingComplete = async () => {
    if (!userProfile?.auth_user_id) return;

    try {
      const { error } = await supabase
        .from("members")
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("auth_user_id", userProfile.auth_user_id);

      if (error) throw error;

      setNeedsOnboarding(false);
      logger.info("Onboarding marked as complete");
    } catch (error) {
      logger.error("Error marking onboarding complete:", error);
    }
  };

  const skipOnboarding = async () => {
    if (!userProfile?.auth_user_id) return;

    try {
      const { error } = await supabase
        .from("members")
        .update({
          onboarding_completed: true,
          onboarding_skipped: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("auth_user_id", userProfile.auth_user_id);

      if (error) throw error;

      setNeedsOnboarding(false);
      logger.info("Onboarding skipped");
    } catch (error) {
      logger.error("Error skipping onboarding:", error);
    }
  };

  return {
    needsOnboarding,
    loading,
    markOnboardingComplete,
    skipOnboarding,
  };
};
