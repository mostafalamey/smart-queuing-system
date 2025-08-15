// Push Notification Service for Customer App
// Handles service worker registration, push subscriptions, and notification permissions

import { logger } from './logger'

interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  image?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  requireInteraction?: boolean
  silent?: boolean
  tag?: string
  renotify?: boolean
  vibrate?: number[]
}

class PushNotificationService {
  private vapidPublicKey: string
  private adminUrl: string
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null

  constructor() {
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    this.adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL!
    
    // Validate environment variables
    if (!this.vapidPublicKey) {
      logger.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set!')
    }
    if (!this.adminUrl) {
      logger.error('NEXT_PUBLIC_ADMIN_URL is not set!')
    }
    
    logger.log('Push Notification Service initialized')
  }

  /**
   * Initialize the push notification service
   * Enhanced for iOS Safari PWA compatibility
   */
  async initialize(): Promise<boolean> {
    try {
      logger.log('Initializing push notification service...')
      
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        logger.log('Service workers not supported')
        return false
      }

      // Check if push notifications are supported
      if (!('PushManager' in window)) {
        logger.log('Push Manager not supported')
        return false
      }

      // Enhanced iOS Safari detection
      const isIOSSafari = this.isIOSSafari()
      const isPWAMode = this.isPWAMode()
      
      logger.log('Browser environment:', {
        isIOSSafari,
        isPWAMode,
        userAgent: navigator.userAgent
      })

      // Special handling for iOS Safari PWA mode
      if (isIOSSafari && isPWAMode) {
        logger.log('iOS Safari PWA mode detected - applying enhanced compatibility')
        // Add delay for iOS Safari PWA initialization
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      logger.log('Browser supports service workers and push notifications')

      // Register service worker
      const registration = await this.registerServiceWorker()
      if (!registration) {
        logger.error('Service worker registration failed')
        return false
      }

      logger.log('Service worker registered successfully')
      this.serviceWorkerRegistration = registration
      return true

    } catch (error) {
      logger.error('Failed to initialize push notification service:', error)
      return false
    }
  }

  /**
   * Register the service worker
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      logger.log('Registering service worker...')
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      logger.log('Service worker registered:', registration)
      logger.log('Service worker scope:', registration.scope)
      logger.log('Service worker state:', registration.active?.state)

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        logger.log('Service worker update found')
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            logger.log('Service worker state changed:', newWorker.state)
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Optionally show update notification to user
              this.handleServiceWorkerUpdate(registration)
            }
          })
        }
      })

      return registration

    } catch (error) {
      logger.error('Service Worker registration failed:', error)
      return null
    }
  }

  /**
   * Handle service worker updates
   */
  private async handleServiceWorkerUpdate(registration: ServiceWorkerRegistration) {
    // Send message to new service worker to skip waiting
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    // Reload page after service worker activation
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<'granted' | 'denied' | 'default'> {
    try {
      logger.log('Requesting notification permission...')
      
      if (!('Notification' in window)) {
        logger.log('Notifications not supported')
        return 'denied'
      }

      // Check current permission status
      let permission = Notification.permission
      logger.log('Current permission status:', permission)

      // Request permission if not already granted or denied
      if (permission === 'default') {
        logger.log('Permission is default, requesting permission from user...')
        
        // Use the newer Promise-based API if available, fallback to callback
        if ('requestPermission' in Notification && typeof Notification.requestPermission === 'function') {
          try {
            logger.log('Using Promise-based requestPermission')
            permission = await Notification.requestPermission()
            logger.log('Permission result (Promise):', permission)
          } catch (error) {
            logger.error('Error with Promise-based requestPermission:', error)
            // Fallback to callback-based API for older browsers
            logger.log('Falling back to callback-based requestPermission')
            permission = await new Promise((resolve) => {
              Notification.requestPermission((result) => {
                logger.log('Permission result (callback):', result)
                resolve(result)
              })
            })
          }
        } else {
          logger.log('Using callback-based requestPermission')
          permission = await new Promise((resolve) => {
            Notification.requestPermission((result) => {
              logger.log('Permission result (legacy callback):', result)
              resolve(result)
            })
          })
        }
      }

      logger.log('Final permission status:', permission)
      return permission

    } catch (error) {
      logger.error('Error requesting notification permission:', error)
      return 'denied'
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(organizationId: string, customerPhone: string): Promise<boolean> {
    try {
      logger.log('Starting push notification subscription process...')
      logger.log('- Organization ID:', organizationId)
      logger.log('- Customer Phone:', customerPhone)
      
      if (!this.serviceWorkerRegistration) {
        logger.error('Service worker not registered')
        return false
      }

      logger.log('Service worker is registered, requesting permission...')
      
      // Check permission
      const permission = await this.requestPermission()
      logger.log('Permission result:', permission)
      
      if (permission !== 'granted') {
        logger.log('Permission not granted, subscription failed')
        return false
      }

      logger.log('Permission granted, creating subscription...')

      // Check if already subscribed
      let subscription = await this.serviceWorkerRegistration.pushManager.getSubscription()
      logger.log('Existing subscription:', subscription ? 'Found' : 'None')

      // Always create a fresh subscription to ensure it's valid
      if (subscription) {
        try {
          logger.log('Unsubscribing from existing subscription...')
          await subscription.unsubscribe()
          logger.log('Successfully unsubscribed from old subscription')
        } catch (error) {
          logger.warn('Error unsubscribing old subscription:', error)
        }
      }

      logger.log('Creating new subscription with VAPID key...')
      logger.log('VAPID key (first 20 chars):', this.vapidPublicKey ? this.vapidPublicKey.substring(0, 20) : 'NOT SET')

      // Create new subscription
      subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey) as BufferSource
      })

      logger.log('New subscription created successfully!')
      logger.log('Subscription endpoint:', subscription.endpoint)

      // Send subscription to server (with small delay to ensure browser is ready)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      logger.log('Sending subscription to server...')
      const success = await this.sendSubscriptionToServer(
        organizationId,
        customerPhone,
        subscription
      )

      logger.log('Subscription server response:', success ? 'SUCCESS' : 'FAILED')
      return success

    } catch (error) {
      logger.error('Error subscribing to push notifications:', error)
      
      if (error instanceof Error) {
        logger.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      }
      
      // Update preferences to indicate push failed
      await this.updateNotificationPreferences(organizationId, customerPhone, true)
      return false
    }
  }

  /**
   * Send subscription data to server
   */
  private async sendSubscriptionToServer(
    organizationId: string,
    customerPhone: string,
    subscription: PushSubscription,
    retryCount = 0
  ): Promise<boolean> {
    try {
      logger.log(`Sending subscription to server (attempt ${retryCount + 1})...`)
      
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      }

      logger.log('Subscription data prepared:', {
        endpoint: subscriptionData.endpoint,
        hasP256dh: !!subscriptionData.keys.p256dh,
        hasAuth: !!subscriptionData.keys.auth
      })

      const requestBody = {
        organizationId,
        customerPhone,
        subscription: subscriptionData,
        userAgent: navigator.userAgent
      }

      const url = `${this.adminUrl}/api/notifications/subscribe`
      logger.log('Sending POST request to:', url)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      logger.log('Server response status:', response.status)
      logger.log('Server response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('Server error response:', errorText)
        throw new Error(`Server responded with status: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      logger.log('Server response body:', result)
      
      const success = result.success === true
      logger.log('Subscription success:', success)
      
      return success

    } catch (error) {
      logger.error(`Error sending subscription to server (attempt ${retryCount + 1}):`, error)
      
      // Retry logic: retry up to 2 times with increasing delay
      if (retryCount < 2) {
        const delay = (retryCount + 1) * 1000 // 1s, 2s delays
        logger.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.sendSubscriptionToServer(organizationId, customerPhone, subscription, retryCount + 1)
      }
      
      logger.error('All retry attempts failed')
      return false
    }
  }

  /**
   * Update notification preferences (when push is denied)
   */
  private async updateNotificationPreferences(
    organizationId: string,
    customerPhone: string,
    pushDenied: boolean
  ): Promise<void> {
    try {
      const response = await fetch(`${this.adminUrl}/api/notifications/subscribe`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId,
          customerPhone,
          pushDenied
        })
      })

      if (response.ok) {
        await response.json()
      }

    } catch (error) {
      logger.error('Error updating notification preferences:', error)
    }
  }

  /**
   * Get current notification preferences
   */
  async getNotificationPreferences(
    organizationId: string,
    customerPhone: string
  ): Promise<any> {
    try {
      const response = await fetch(
        `${this.adminUrl}/api/notifications/subscribe?organizationId=${organizationId}&customerPhone=${customerPhone}`
      )

      if (response.ok) {
        return await response.json()
      }

      return null

    } catch (error) {
      logger.error('Error getting notification preferences:', error)
      return null
    }
  }

  /**
   * Check if push notifications are supported and enabled
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  /**
   * Check current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if ('Notification' in window) {
      return Notification.permission
    }
    return 'denied'
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.serviceWorkerRegistration) {
        return false
      }

      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription()
      if (subscription) {
        const success = await subscription.unsubscribe()
        return success
      }

      return true

    } catch (error) {
      logger.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }

  /**
   * Send a test notification (for development)
   */
  async sendTestNotification(
    organizationId: string,
    customerPhone: string,
    ticketNumber: string
  ): Promise<boolean> {
    try {
      const payload: NotificationPayload = {
        title: '🎫 Test Notification',
        body: `Your ticket ${ticketNumber} - This is a test notification`,
        icon: '/logo_s.png',
        badge: '/favicon.svg',
        data: {
          ticketNumber,
          notificationType: 'test',
          clickUrl: '/',
          timestamp: Date.now()
        },
        actions: [
          {
            action: 'view_queue',
            title: 'View Queue'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ],
        requireInteraction: false,
        tag: 'test-notification',
        vibrate: [200, 100, 200]
      }

      const response = await fetch(`${this.adminUrl}/api/notifications/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId,
          customerPhone,
          payload,
          notificationType: 'test',
          ticketNumber
        })
      })

      const result = await response.json()
      return result.success

    } catch (error) {
      logger.error('Error sending test notification:', error)
      return false
    }
  }

  /**
   * Utility function to convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Utility function to convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  /**
   * Detect if running on iOS Safari
   */
  private isIOSSafari(): boolean {
    if (typeof window === 'undefined') return false
    
    const userAgent = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent)
    
    return isIOS && isSafari
  }

  /**
   * Detect if the app is running as a PWA
   */
  private isPWAMode(): boolean {
    if (typeof window === 'undefined') return false
    
    // Check for standalone display mode
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
    
    // Check for iOS Safari home screen mode
    const isIOSStandalone = 'standalone' in window.navigator && (window.navigator as any).standalone === true
    
    // Check for Android PWA
    const isAndroidPWA = window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches
    
    return isStandalone || isIOSStandalone || isAndroidPWA
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService()

// Export class for type checking
export default PushNotificationService
