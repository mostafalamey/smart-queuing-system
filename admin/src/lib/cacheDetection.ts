import { logger } from '@/lib/logger'
/**
 * Utility to detect if browser cache has been cleared and handle auth recovery
 */

export class CacheDetection {
  private static readonly CACHE_MARKER_KEY = 'smart-queue-cache-marker';
  private static readonly CACHE_MARKER_VALUE = 'present';
  
  /**
   * Check if the browser cache was recently cleared
   */
  static isCacheCleared(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      
      const marker = localStorage.getItem(this.CACHE_MARKER_KEY);
      const hasAuthTokens = this.hasAuthTokens();
      
      // If we have no marker but auth tokens exist, cache might have been partially cleared
      if (!marker && hasAuthTokens) {
        logger.log('Cache marker missing but auth tokens present');
        this.setCacheMarker(); // Restore marker
        return false;
      }
      
      // If no marker and no auth tokens, cache was likely cleared
      if (!marker && !hasAuthTokens) {
        logger.log('No cache marker and no auth tokens - cache was cleared');
        this.setCacheMarker(); // Set marker for future checks
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking cache status:', error);
      return false;
    }
  }
  
  /**
   * Check if Supabase auth tokens exist in localStorage
   */
  static hasAuthTokens(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') && (
          key.includes('auth-token') || 
          key.includes('session') ||
          key.includes('refresh-token')
        )
      );
      
      return keys.length > 0 && keys.some(key => {
        const value = localStorage.getItem(key);
        if (!value || value === 'null' || value === '{}') return false;
        
        try {
          const parsed = JSON.parse(value);
          return parsed && (parsed.access_token || parsed.refresh_token);
        } catch {
          return false;
        }
      });
    } catch (error) {
      logger.error('Error checking auth tokens:', error);
      return false;
    }
  }
  
  /**
   * Set cache marker to detect future cache clears
   */
  static setCacheMarker(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.CACHE_MARKER_KEY, this.CACHE_MARKER_VALUE);
      }
    } catch (error) {
      logger.error('Error setting cache marker:', error);
    }
  }
  
  /**
   * Clear cache marker (for testing or manual reset)
   */
  static clearCacheMarker(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(this.CACHE_MARKER_KEY);
      }
    } catch (error) {
      logger.error('Error clearing cache marker:', error);
    }
  }
  
  /**
   * Get detailed cache status for debugging
   */
  static getCacheStatus(): {
    hasMarker: boolean;
    hasAuthTokens: boolean;
    isCacheCleared: boolean;
    authTokenCount: number;
  } {
    try {
      const hasMarker = typeof window !== 'undefined' 
        ? localStorage.getItem(this.CACHE_MARKER_KEY) === this.CACHE_MARKER_VALUE
        : false;
        
      const hasAuthTokens = this.hasAuthTokens();
      const isCacheCleared = this.isCacheCleared();
      
      const authTokenCount = typeof window !== 'undefined'
        ? Object.keys(localStorage).filter(key => 
            key.startsWith('sb-') && key.includes('auth')
          ).length
        : 0;
      
      return {
        hasMarker,
        hasAuthTokens,
        isCacheCleared,
        authTokenCount
      };
    } catch (error) {
      logger.error('Error getting cache status:', error);
      return {
        hasMarker: false,
        hasAuthTokens: false,
        isCacheCleared: true,
        authTokenCount: 0
      };
    }
  }
}
