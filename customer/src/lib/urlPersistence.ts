// URL Parameter Persistence for iOS Safari PWA
// Handles org/branch key preservation across Home Screen installations

interface URLParams {
  org: string | null
  branch: string | null
}

interface StoredURLParams extends URLParams {
  timestamp: number
  userAgent: string
}

export class URLPersistenceService {
  private static readonly STORAGE_KEY = 'smart-queue-url-params'
  private static readonly EXPIRY_HOURS = 24 * 7 // 7 days

  /**
   * Store URL parameters in localStorage for PWA recovery
   */
  static storeURLParams(orgId: string | null, branchId: string | null): void {
    try {
      if (typeof window === 'undefined') return

      const params: StoredURLParams = {
        org: orgId,
        branch: branchId,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(params))
      console.log('URL parameters stored for PWA recovery:', params)
    } catch (error) {
      console.error('Failed to store URL parameters:', error)
    }
  }

  /**
   * Retrieve stored URL parameters if available and valid
   */
  static getStoredURLParams(): URLParams | null {
    try {
      if (typeof window === 'undefined') return null

      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return null

      const params: StoredURLParams = JSON.parse(stored)
      
      // Check if expired
      const expiryTime = this.EXPIRY_HOURS * 60 * 60 * 1000
      if (Date.now() - params.timestamp > expiryTime) {
        localStorage.removeItem(this.STORAGE_KEY)
        return null
      }

      return {
        org: params.org,
        branch: params.branch
      }
    } catch (error) {
      console.error('Failed to retrieve stored URL parameters:', error)
      return null
    }
  }

  /**
   * Detect if the app is running as a PWA
   */
  static isPWAMode(): boolean {
    if (typeof window === 'undefined') return false
    
    // Check for standalone display mode
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
    
    // Check for iOS Safari home screen mode
    const isIOSStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone === true
    
    // Check for Android PWA
    const isAndroidPWA = window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches
    
    return isStandalone || isIOSStandalone || isAndroidPWA
  }

  /**
   * Detect if running on iOS Safari
   */
  static isIOSSafari(): boolean {
    if (typeof window === 'undefined') return false
    
    const userAgent = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)
    
    return isIOS && isSafari
  }

  /**
   * Get current URL parameters from search params or stored data
   */
  static getCurrentParams(searchParams: URLSearchParams): URLParams {
    // First try to get from URL
    const orgFromURL = searchParams.get('org')
    const branchFromURL = searchParams.get('branch')

    // If we have URL params, store them and return
    if (orgFromURL) {
      this.storeURLParams(orgFromURL, branchFromURL)
      return { org: orgFromURL, branch: branchFromURL }
    }

    // If no URL params and we're in PWA mode, try stored params
    if (this.isPWAMode()) {
      const stored = this.getStoredURLParams()
      if (stored && stored.org) {
        console.log('PWA mode detected: Using stored URL parameters', stored)
        return stored
      }
    }

    return { org: null, branch: null }
  }

  /**
   * Update stored parameters (e.g., when user selects a different branch)
   */
  static updateStoredParams(orgId: string | null, branchId: string | null): void {
    this.storeURLParams(orgId, branchId)
  }

  /**
   * Clear stored parameters
   */
  static clearStoredParams(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear stored parameters:', error)
    }
  }

  /**
   * Generate install URL with current parameters for sharing
   */
  static generateInstallURL(baseURL: string, orgId: string, branchId?: string): string {
    const url = new URL(baseURL)
    url.searchParams.set('org', orgId)
    if (branchId) {
      url.searchParams.set('branch', branchId)
    }
    return url.toString()
  }
}
