'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from './database.types';

type UserProfile = Database['public']['Tables']['members']['Row'] & {
  organization: Database['public']['Tables']['organizations']['Row'] | null;
};

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, organizationData: any) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('auth_user_id', userId)
        .single();

      if (error) {
        throw error;
      }
      
      setUserProfile(data);
    } catch (error) {
      setUserProfile(null);
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

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          return;
        }
        
        setUser(session?.user || null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state changed:', event, session?.user?.id);
        
        setUser(session?.user || null);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
        }
        
        // Only set loading to false if we're not in the middle of a sign in
        if (event !== 'SIGNED_IN' || session) {
          setLoading(false);
        }
      }
    );

    // Handle page visibility changes to reconnect to Supabase
    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        // Page became visible, refresh session
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user && !user) {
            setUser(session.user);
            fetchUserProfile(session.user.id);
          } else if (!session?.user && user) {
            setUser(null);
            setUserProfile(null);
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return { error: null };
    } catch (error) {
      setLoading(false);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, organizationData: any) => {
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
          .from('organizations')
          .insert({
            name: organizationData.organizationName,
            primary_color: organizationData.primaryColor,
            logo_url: organizationData.logoUrl,
          })
          .select()
          .single();

        if (orgError) throw orgError;

        // Create user profile with admin role
        const { error: profileError } = await supabase
          .from('members')
          .insert({
            auth_user_id: authData.user.id,
            email: authData.user.email!,
            name: organizationData.fullName,
            role: 'admin',
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

    return { error: new Error('User creation failed') };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

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
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
