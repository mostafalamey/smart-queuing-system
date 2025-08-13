import { supabase } from './supabase';

export class SessionRecovery {
  private static instance: SessionRecovery;
  private recoveryInProgress = false;
  private lastSessionCheck = 0;
  private readonly CHECK_INTERVAL = 5000; // 5 seconds

  static getInstance(): SessionRecovery {
    if (!SessionRecovery.instance) {
      SessionRecovery.instance = new SessionRecovery();
    }
    return SessionRecovery.instance;
  }

  async checkAndRecoverSession(): Promise<{ 
    session: any; 
    recovered: boolean; 
    error?: string 
  }> {
    const now = Date.now();
    
    // Prevent too frequent checks
    if (now - this.lastSessionCheck < this.CHECK_INTERVAL) {
      const { data: { session } } = await supabase.auth.getSession();
      return { session, recovered: false };
    }

    this.lastSessionCheck = now;

    if (this.recoveryInProgress) {
      return { session: null, recovered: false, error: 'Recovery in progress' };
    }

    try {
      this.recoveryInProgress = true;

      // Try to get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session recovery error:', error);
        
        // Try to recover from localStorage
        const storedSession = this.getStoredSession();
        if (storedSession) {
          console.log('Attempting to recover from stored session...');
          
          // Try to refresh the stored session
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshData.session) {
            console.log('Successfully recovered session');
            return { session: refreshData.session, recovered: true };
          }
        }
        
        return { session: null, recovered: false, error: error.message };
      }

      return { session, recovered: false };

    } catch (error) {
      console.error('Session recovery failed:', error);
      return { 
        session: null, 
        recovered: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      this.recoveryInProgress = false;
    }
  }

  private getStoredSession(): any {
    try {
      if (typeof window === 'undefined') return null;
      
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') && key.includes('auth-token')
      );
      
      if (keys.length === 0) return null;
      
      const tokenData = localStorage.getItem(keys[0]);
      return tokenData ? JSON.parse(tokenData) : null;
    } catch (error) {
      console.error('Error getting stored session:', error);
      return null;
    }
  }

  async forceSessionRefresh(): Promise<{ success: boolean; session?: any; error?: string }> {
    try {
      console.log('Forcing session refresh...');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Force refresh failed:', error);
        return { success: false, error: error.message };
      }
      
      if (data.session) {
        console.log('Session refreshed successfully');
        return { success: true, session: data.session };
      }
      
      return { success: false, error: 'No session returned after refresh' };
    } catch (error) {
      console.error('Force refresh error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  clearRecoveryState(): void {
    this.recoveryInProgress = false;
    this.lastSessionCheck = 0;
  }
}
