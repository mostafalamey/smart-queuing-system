// Browser and Platform Detection for Push Notification Compatibility

export interface BrowserInfo {
  platform: 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Unknown'
  browser: 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Unknown'
  version: string
  isSupported: boolean
  supportLevel: 'full' | 'limited' | 'none'
  limitations: string[]
}

export class BrowserDetection {
  static getBrowserInfo(): BrowserInfo {
    const userAgent = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    const isMacOS = /Mac OS X/.test(userAgent)
    const isAndroid = /Android/.test(userAgent)
    const isWindows = /Windows/.test(userAgent)
    const isLinux = /Linux/.test(userAgent) && !isAndroid
    
    let platform: BrowserInfo['platform'] = 'Unknown'
    if (isIOS) platform = 'iOS'
    else if (isMacOS) platform = 'macOS'
    else if (isAndroid) platform = 'Android'
    else if (isWindows) platform = 'Windows'
    else if (isLinux) platform = 'Linux'

    let browser: BrowserInfo['browser'] = 'Unknown'
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari'
    else if (userAgent.includes('Edg')) browser = 'Edge'

    const { isSupported, supportLevel, limitations } = this.checkPushSupport(platform, browser, userAgent)

    return {
      platform,
      browser,
      version: userAgent,
      isSupported,
      supportLevel,
      limitations
    }
  }

  private static checkPushSupport(
    platform: BrowserInfo['platform'], 
    browser: BrowserInfo['browser'], 
    userAgent: string
  ): { isSupported: boolean; supportLevel: BrowserInfo['supportLevel']; limitations: string[] } {
    const limitations: string[] = []

    // Basic feature detection
    const hasServiceWorker = 'serviceWorker' in navigator
    const hasPushManager = 'PushManager' in window
    const hasNotifications = 'Notification' in window

    if (!hasServiceWorker) {
      limitations.push('Service Workers not supported')
    }
    if (!hasPushManager) {
      limitations.push('Push Manager not supported')
    }
    if (!hasNotifications) {
      limitations.push('Notifications API not supported')
    }

    // Platform-specific limitations
    if (platform === 'iOS') {
      if (browser === 'Safari') {
        const iosVersion = this.getIOSVersion(userAgent)
        if (iosVersion < 16.4) {
          limitations.push('iOS Safari requires version 16.4+ for push notifications')
          return { isSupported: false, supportLevel: 'none', limitations }
        }
        limitations.push('Limited to Safari on iOS')
        limitations.push('Requires user interaction for permission')
        return { isSupported: true, supportLevel: 'limited', limitations }
      } else {
        limitations.push('Push notifications only work in Safari on iOS')
        return { isSupported: false, supportLevel: 'none', limitations }
      }
    }

    // Android Chrome/Edge - full support
    if (platform === 'Android' && (browser === 'Chrome' || browser === 'Edge')) {
      return { isSupported: true, supportLevel: 'full', limitations }
    }

    // Android Firefox - limited support
    if (platform === 'Android' && browser === 'Firefox') {
      limitations.push('Firefox on Android has limited push notification support')
      return { isSupported: false, supportLevel: 'none', limitations }
    }

    // Desktop browsers
    if (platform === 'Windows' || platform === 'macOS' || platform === 'Linux') {
      if (browser === 'Chrome' || browser === 'Edge') {
        return { isSupported: true, supportLevel: 'full', limitations }
      }
      if (browser === 'Firefox') {
        return { isSupported: true, supportLevel: 'full', limitations }
      }
      if (browser === 'Safari' && platform === 'macOS') {
        const safariVersion = this.getSafariVersion(userAgent)
        if (safariVersion >= 16) {
          return { isSupported: true, supportLevel: 'full', limitations }
        }
        limitations.push('Safari requires version 16+ for push notifications')
        return { isSupported: false, supportLevel: 'none', limitations }
      }
    }

    // Check if all basic features are present
    if (hasServiceWorker && hasPushManager && hasNotifications) {
      limitations.push('Browser/platform combination not fully tested')
      return { isSupported: true, supportLevel: 'limited', limitations }
    }

    return { isSupported: false, supportLevel: 'none', limitations }
  }

  private static getIOSVersion(userAgent: string): number {
    const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/)
    if (match) {
      return parseInt(match[1], 10) + (parseInt(match[2], 10) / 10)
    }
    return 0
  }

  private static getSafariVersion(userAgent: string): number {
    const match = userAgent.match(/Version\/(\d+)\.(\d+)/)
    if (match) {
      return parseInt(match[1], 10)
    }
    return 0
  }

  static getRecommendation(browserInfo: BrowserInfo): string {
    if (browserInfo.isSupported && browserInfo.supportLevel === 'full') {
      return 'Push notifications are fully supported on your browser.'
    }

    if (browserInfo.isSupported && browserInfo.supportLevel === 'limited') {
      return 'Push notifications have limited support on your browser. Some features may not work as expected.'
    }

    // Provide specific recommendations based on platform
    if (browserInfo.platform === 'iOS') {
      return 'For the best experience with push notifications, please use Safari on iOS 16.4 or later.'
    }

    if (browserInfo.platform === 'Android') {
      return 'For push notifications, please use Chrome or Microsoft Edge on Android.'
    }

    if (browserInfo.platform === 'Windows' || browserInfo.platform === 'macOS' || browserInfo.platform === 'Linux') {
      return 'For push notifications, please use Chrome, Firefox, or Microsoft Edge.'
    }

    return 'Push notifications are not supported on your current browser. Please try using a different browser.'
  }
}
