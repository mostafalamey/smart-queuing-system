import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  [key: string]: any;
}

/**
 * Hook to monitor real-time member status changes and handle automatic logout
 * when a user is deactivated or deleted by an admin
 */
export const useMemberStatusMonitor = (
  user: User | null,
  userProfile: UserProfile | null,
  signOut: () => Promise<void>
) => {
  const subscriptionRef = useRef<any>(null);
  const hasShownLogoutMessage = useRef(false);

  useEffect(() => {
    // Only set up monitoring if user is logged in and we have profile data
    if (!user || !userProfile?.id) {
      return;
    }

    const setupMemberStatusMonitoring = () => {
      try {
        // Clean up existing subscription
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
        }

        logger.info("Setting up member status monitoring for user:", user.id);

        // Subscribe to changes on the members table for this specific user
        subscriptionRef.current = supabase
          .channel(`member-status-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "members",
              filter: `auth_user_id=eq.${user.id}`,
            },
            async (payload) => {
              logger.info("Member status change detected:", payload);

              // Handle different types of changes
              if (payload.eventType === "DELETE") {
                // Member was permanently deleted
                logger.warn("Member record deleted - logging out user");

                if (!hasShownLogoutMessage.current) {
                  hasShownLogoutMessage.current = true;

                  // Show notification and sign out after delay to ensure message is seen
                  showLogoutNotification(
                    "Your account has been removed from the organization. You will be logged out."
                  );
                }
                return;
              }

              if (payload.eventType === "UPDATE") {
                const updatedMember = payload.new as any;

                // Check if member was deactivated
                if (updatedMember.is_active === false) {
                  logger.warn("Member deactivated - logging out user");

                  if (!hasShownLogoutMessage.current) {
                    hasShownLogoutMessage.current = true;

                    // Show notification and sign out
                    showLogoutNotification(
                      "Your account has been deactivated by an administrator. You will be logged out."
                    );
                  }
                  return;
                }

                // Check if organization_id was removed (old deletion method)
                if (updatedMember.organization_id === null) {
                  logger.warn(
                    "Member removed from organization - logging out user"
                  );

                  if (!hasShownLogoutMessage.current) {
                    hasShownLogoutMessage.current = true;

                    // Show notification and sign out
                    showLogoutNotification(
                      "You have been removed from the organization. You will be logged out."
                    );
                  }
                  return;
                }
              }
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              logger.info("Member status monitoring subscription active");
            } else if (status === "CHANNEL_ERROR") {
              logger.error("Member status monitoring subscription error");

              // Retry after 5 seconds
              setTimeout(() => {
                if (user && userProfile?.id) {
                  setupMemberStatusMonitoring();
                }
              }, 5000);
            }
          });
      } catch (error) {
        logger.error("Error setting up member status monitoring:", error);
      }
    };

    // Helper function to show logout notification and handle sign out
    const showLogoutNotification = async (message: string) => {
      // Create a prominent notification
      const notificationDiv = document.createElement("div");
      notificationDiv.className =
        "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50";
      notificationDiv.innerHTML = `
        <div class="bg-white p-8 rounded-lg shadow-2xl max-w-md mx-4 text-center border-l-4 border-red-500">
          <div class="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Account Access Removed</h3>
          <p class="text-gray-600 mb-4">${message}</p>
          <div class="text-sm text-gray-500">You will be redirected to the login page in 3 seconds...</div>
        </div>
      `;

      document.body.appendChild(notificationDiv);

      // Sign out after 3 seconds
      setTimeout(async () => {
        document.body.removeChild(notificationDiv);
        await signOut();
      }, 3000);
    };

    // Set up the subscription
    setupMemberStatusMonitoring();

    // Handle page visibility changes to reconnect if needed
    const handleVisibilityChange = () => {
      if (!document.hidden && user && userProfile?.id) {
        // Page became visible, ensure subscription is active
        if (!subscriptionRef.current) {
          setupMemberStatusMonitoring();
        }
      }
    };

    // Handle online/offline events
    const handleOnline = () => {
      if (user && userProfile?.id && !subscriptionRef.current) {
        setupMemberStatusMonitoring();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    // Cleanup function
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);

      if (subscriptionRef.current) {
        logger.info("Cleaning up member status monitoring subscription");
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }

      // Reset the logout message flag
      hasShownLogoutMessage.current = false;
    };
  }, [user?.id, userProfile?.id, signOut]);

  return {
    isMonitoring: !!subscriptionRef.current,
  };
};
