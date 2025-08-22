"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";
import { logger } from "./logger";
import { Database } from "./database.types";
import { SessionRecovery } from "./sessionRecovery";
import { CacheDetection } from "./cacheDetection";
import { AuthLoadingOverlay } from "../components/AuthLoadingOverlay";
import { useMemberStatusMonitor } from "../hooks/useMemberStatusMonitor";

// Helper function to parse PostgreSQL array format to JavaScript array
const parseDepartmentIds = (
  departmentIdsString: string | string[] | null
): string[] | null => {
  if (!departmentIdsString) return null;

  // If it's already an array, return it as-is
  if (Array.isArray(departmentIdsString)) {
    return departmentIdsString;
  }

  // Handle PostgreSQL array format: {id1,id2,id3} -> ["id1", "id2", "id3"]
  if (
    departmentIdsString.startsWith("{") &&
    departmentIdsString.endsWith("}")
  ) {
    const content = departmentIdsString.slice(1, -1); // Remove { }
    return content ? content.split(",").map((id) => id.trim()) : [];
  }

  // Handle comma-separated format: "id1,id2,id3" -> ["id1", "id2", "id3"]
  if (departmentIdsString.includes(",")) {
    return departmentIdsString.split(",").map((id) => id.trim());
  }

  // Handle single ID: "id1" -> ["id1"]
  return departmentIdsString ? [departmentIdsString.trim()] : [];
};

type UserProfile = Database["public"]["Tables"]["members"]["Row"] & {
  organization: Database["public"]["Tables"]["organizations"]["Row"] | null;
  department_ids: string[] | null; // Override to use parsed array format
};

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (
    email: string,
    password: string,
    organizationData: any
  ) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOverlayVisible, setAuthOverlayVisible] = useState(true);
  const [overlayStartTime] = useState(() => Date.now()); // Track when overlay started
  const [sessionRecovery] = useState(() => SessionRecovery.getInstance());
  const [isSigningOut, setIsSigningOut] = useState(false); // Prevent multiple simultaneous sign-outs

  // Helper function to hide overlay with minimum display time
  const hideAuthOverlay = (immediate = false) => {
    if (immediate) {
      setAuthOverlayVisible(false);
      return;
    }

    const minDisplayTime = 1500; // Minimum 1.5 seconds display
    const elapsed = Date.now() - overlayStartTime;
    const remainingTime = Math.max(0, minDisplayTime - elapsed);

    setTimeout(() => {
      setAuthOverlayVisible(false);
    }, remainingTime);
  };

  // Function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      // Increased timeout to 10s for production reliability
      const profilePromise = supabase
        .from("members")
        .select(
          `
          *,
          organization:organizations(*)
        `
        )
        .eq("auth_user_id", userId)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 3000)
      );

      const { data, error } = (await Promise.race([
        profilePromise,
        timeoutPromise,
      ])) as any;

      if (error) {
        logger.error("Profile fetch error:", error);
        throw error;
      }

      // Parse department_ids from PostgreSQL array format to JavaScript array
      const parsedProfile = {
        ...data,
        department_ids: parseDepartmentIds(data.department_ids),
      };

      setUserProfile(parsedProfile);
    } catch (error) {
      logger.error("Failed to fetch user profile:", error);
      // Set minimal profile fallback for functionality
      setUserProfile({
        id: userId,
        email: user?.email || "Unknown",
        role: "member",
        organization: null,
      } as any);
    }
  };

  // Function to refresh user profile data
  const refreshUser = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    let initializationAttempted = false;
    const maxRetries = 3;

    // Safety timeout to prevent overlay from staying visible forever
    const safetyTimeout = setTimeout(() => {
      if (authOverlayVisible && mounted) {
        hideAuthOverlay(true);
        setLoading(false);
      }
    }, 3000); // 3 second safety net

    const initializeAuth = async () => {
      // Prevent multiple simultaneous initialization attempts
      if (initializationAttempted && retryCount === 0) {
        return;
      }

      initializationAttempted = true;

      try {
        // Check cache status first
        const cacheStatus = CacheDetection.getCacheStatus();

        // If cache was cleared, handle it gracefully
        if (cacheStatus.isCacheCleared) {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          setAuthOverlayVisible(false); // Hide overlay when cache cleared (immediate)
          CacheDetection.setCacheMarker(); // Set marker for future detection
          return;
        }

        // Check if we have stored session data first
        const hasStoredSession = cacheStatus.hasAuthTokens;

        // Get initial session (let Supabase handle its own timeouts)
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          logger.error("Session error:", error);

          // If no stored session and we get an error, don't retry indefinitely
          if (!hasStoredSession) {
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            CacheDetection.setCacheMarker(); // Ensure marker is set
            return;
          }

          // Retry logic for session errors only if we have stored data
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(initializeAuth, 1000 * retryCount);
            return;
          }

          // Max retries reached - clear everything
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        setUser(session?.user || null);

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }

        setLoading(false);
        hideAuthOverlay(); // Hide auth overlay with minimum display time
        retryCount = 0; // Reset retry count on success
      } catch (error) {
        logger.error("Auth initialization error:", error);

        if (mounted) {
          // Check if cache was cleared
          const hasStoredSession = checkForStoredSession();

          if (!hasStoredSession) {
            // No stored session - likely cache was cleared
            setUser(null);
            setUserProfile(null);
            setLoading(false);
            return;
          }

          // Retry logic for network errors only if we have stored session
          if (retryCount < maxRetries && hasStoredSession) {
            retryCount++;
            setTimeout(initializeAuth, 1000 * retryCount);
            return;
          }

          // Give up and clear state
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
      }
    };

    // Helper function to check for stored session
    const checkForStoredSession = (): boolean => {
      try {
        if (typeof window === "undefined") return false;

        const keys = Object.keys(localStorage).filter(
          (key) =>
            key.startsWith("sb-") &&
            (key.includes("auth-token") || key.includes("session"))
        );

        return (
          keys.length > 0 &&
          keys.some((key) => {
            const value = localStorage.getItem(key);
            return value && value !== "null" && value !== "{}";
          })
        );
      } catch (error) {
        logger.error("Error checking stored session:", error);
        return false;
      }
    };

    initializeAuth();

    // Listen for auth changes with improved error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        // Handle specific auth events
        if (event === "SIGNED_OUT") {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        if (event === "TOKEN_REFRESHED") {
          // Token refreshed successfully
        }

        if (event === "SIGNED_IN") {
          // User signed in
        }

        setUser(session?.user || null);

        if (session?.user) {
          // Fetching profile for signed in user...
          try {
            await fetchUserProfile(session.user.id);
            // Profile fetch completed
          } catch (error) {
            logger.error("Profile fetch failed, but continuing:", error);
          }
        } else {
          setUserProfile(null);
        }

        // Always set loading to false after processing auth state change
        // Setting loading to false
        setLoading(false);
        hideAuthOverlay(); // Hide auth overlay when auth state is processed
      } catch (error) {
        logger.error("Auth state change error:", error);
        // Don't set loading to false here - let the error handling in visibility change handle it
        if (event === "SIGNED_OUT") {
          setLoading(false);
        }
      }
    });

    // Enhanced tab visibility and focus handling
    const handleVisibilityChange = async () => {
      // Only handle when page becomes visible (user switches back to tab)
      if (!document.hidden && mounted) {
        // Tab became visible, checking session...
        setAuthOverlayVisible(true); // Show overlay during tab switch validation

        // Small delay to ensure tab is fully focused
        setTimeout(async () => {
          if (!mounted || document.hidden) return;

          try {
            // Use session recovery to handle the switch
            const { session, recovered, error } =
              await sessionRecovery.checkAndRecoverSession();

            if (error) {
              logger.error("Session recovery failed:", error);
              if (!loading) {
                setLoading(true);
                await initializeAuth();
              }
              return;
            }

            const currentUser = user;
            const newUser = session?.user;

            if (recovered) {
              // Session recovered successfully
            }

            // Check for auth state mismatch
            if (newUser && !currentUser) {
              // Auth state mismatch: user exists but not in context
              setUser(newUser);
              await fetchUserProfile(newUser.id);
            } else if (!newUser && currentUser) {
              // Auth state mismatch: no user but exists in context
              setUser(null);
              setUserProfile(null);
            } else if (
              newUser &&
              currentUser &&
              newUser.id !== currentUser.id
            ) {
              // Auth state mismatch: different user
              setUser(newUser);
              await fetchUserProfile(newUser.id);
            }

            // Ensure loading is false
            if (loading) {
              setLoading(false);
            }

            // Hide overlay after visibility change handling
            hideAuthOverlay();
          } catch (error) {
            logger.error("Visibility change error:", error);
            hideAuthOverlay(true); // Hide overlay immediately on error
            if (!loading) {
              setLoading(true);
              await initializeAuth();
            }
          }
        }, 100); // Small delay to ensure tab is fully active
      }
    };

    // Handle window focus events (additional layer)
    const handleWindowFocus = async () => {
      if (mounted && !document.hidden) {
        // Window focused, performing quick session check...

        try {
          // Quick session check without full recovery
          const {
            data: { session },
          } = await supabase.auth.getSession();

          // Quick check - if we have a session but no user in context, refresh
          if (session?.user && !user && !loading) {
            // Found session but no user in context
            setLoading(true);
            setUser(session.user);
            await fetchUserProfile(session.user.id);
            setLoading(false);
          } else if (!session?.user && user) {
            // No session but user in context, attempting recovery...
            const { session: recoveredSession } =
              await sessionRecovery.forceSessionRefresh();
            if (!recoveredSession) {
              setUser(null);
              setUserProfile(null);
            }
          }
        } catch (error) {
          logger.error("Window focus error:", error);
        }
      }
    };

    // Handle network reconnection
    const handleOnline = async () => {
      if (mounted) {
        // Network reconnected, refreshing auth...
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session?.user && !user && !loading) {
            // No session and no user - this is expected
            return;
          }
          if (!user && !loading) {
            setLoading(true);
            await initializeAuth();
          }
        } catch (error) {
          logger.error("Online handler error:", error);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("online", handleOnline);

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        return { error };
      }

      // Wait a bit for the auth state change to propagate
      if (data.user) {
        // The auth state change handler will set loading to false
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return { error: null };
    } catch (error) {
      setLoading(false);
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    organizationData: any
  ) => {
    // First create the auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return { error: authError };
    }

    if (authData.user) {
      try {
        // Create organization
        const { data: orgData, error: orgError } = await supabase
          .from("organizations")
          .insert({
            name: organizationData.organizationName,
            primary_color: organizationData.primaryColor,
            logo_url: organizationData.logoUrl,
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Create user profile with admin role
        const { error: profileError } = await supabase.from("members").insert({
          auth_user_id: authData.user.id,
          email: authData.user.email!,
          name: organizationData.fullName,
          role: "admin",
          organization_id: orgData.id,
          is_active: true,
        });

        if (profileError) throw profileError;

        return { error: null };
      } catch (error) {
        // If profile creation fails, we should clean up the auth user
        await supabase.auth.signOut();
        return { error };
      }
    }

    return { error: new Error("User creation failed") };
  };

  const signOut = async () => {
    // Prevent multiple simultaneous sign-out attempts
    if (isSigningOut) {
      logger.info("Sign out already in progress, ignoring duplicate request");
      return;
    }

    try {
      setIsSigningOut(true);
      logger.info("Starting sign out process...");

      // Clear local state first
      setUser(null);
      setUserProfile(null);

      // Try different sign-out approaches
      try {
        // First try: explicit scope
        const { error: signOutError } = await supabase.auth.signOut({
          scope: "local",
        });
        if (signOutError) {
          // If session is already missing, that's actually success for our purposes
          if (signOutError.message?.includes("Auth session missing")) {
            logger.info("Sign out: session already cleared");
          } else {
            logger.warn("Local sign out failed, trying global:", signOutError);

            // Second try: without scope (default)
            const { error: globalError } = await supabase.auth.signOut();
            if (
              globalError &&
              !globalError.message?.includes("Auth session missing")
            ) {
              logger.error("Global sign out also failed:", globalError);
            }
          }
        } else {
          logger.info("Sign out successful");
        }
      } catch (authError) {
        logger.error("Auth sign out error:", authError);
        // Continue anyway - local state is cleared
      }

      // Always redirect to login, regardless of signOut success/failure
      logger.info("Redirecting to login...");
      router.push("/login");
    } catch (error) {
      logger.error("Unexpected sign out error:", error);
      // Clear state and redirect even on unexpected errors
      setUser(null);
      setUserProfile(null);
      router.push("/login");
    } finally {
      setIsSigningOut(false);
    }
  };

  // Set up member status monitoring to automatically log out users when deactivated/deleted
  useMemberStatusMonitor(user, userProfile, signOut);

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthLoadingOverlay isVisible={authOverlayVisible} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
