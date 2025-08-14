// Push Notification Service for Customer App
// Handles service worker registration, push subscriptions, and notification permissions

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
    
    // Debug logging for environment variables
    console.log('Push Notification Service initialized:')
    console.log('- VAPID Public Key:', this.vapidPublicKey ? `${this.vapidPublicKey.substring(0, 10)}...` : 'NOT SET')
    console.log('- Admin URL:', this.adminUrl || 'NOT SET')
    
    if (!this.vapidPublicKey) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set!')
    }
    if (!this.adminUrl) {
      console.error('NEXT_PUBLIC_ADMIN_URL is not set!')
    }
  }

  /**
   * Initialize the push notification service
   * This should be called when the customer app loads
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing push notification service...')
      
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.log('Service workers not supported')
        return false
      }

      // Check if push notifications are supported
      if (!('PushManager' in window)) {
        console.log('Push Manager not supported')
        return false
      }

      console.log('Browser supports service workers and push notifications')

      // Register service worker
      const registration = await this.registerServiceWorker()
      if (!registration) {
        console.error('Service worker registration failed')
        return false
      }

      console.log('Service worker registered successfully')
      this.serviceWorkerRegistration = registration
      return true

    } catch (error) {
      console.error('Failed to initialize push notification service:', error)
      return false
    }
  }

  /**
   * Register the service worker
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      console.log('Registering service worker...')
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      })

      console.log('Service worker registered:', registration)
      console.log('Service worker scope:', registration.scope)
      console.log('Service worker state:', registration.active?.state)

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        console.log('Service worker update found')
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            console.log('Service worker state changed:', newWorker.state)
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Optionally show update notification to user
              this.handleServiceWorkerUpdate(registration)
            }
          })
        }
      })

      return registration

    } catch (error) {
      console.error('Service Worker registration failed:', error)
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
      console.log('Requesting notification permission...')
      
      if (!('Notification' in window)) {
        console.log('Notifications not supported')
        return 'denied'
      }

      // Check current permission status
      let permission = Notification.permission
      console.log('Current permission status:', permission)

      // Request permission if not already granted or denied
      if (permission === 'default') {
        console.log('Permission is default, requesting permission from user...')
        
        // Use the newer Promise-based API if available, fallback to callback
        if ('requestPermission' in Notification && typeof Notification.requestPermission === 'function') {
          try {
            console.log('Using Promise-based requestPermission')
            permission = await Notification.requestPermission()
            console.log('Permission result (Promise):', permission)
          } catch (error) {
            console.error('Error with Promise-based requestPermission:', error)
            // Fallback to callback-based API for older browsers
            console.log('Falling back to callback-based requestPermission')
            permission = await new Promise((resolve) => {
              Notification.requestPermission((result) => {
                console.log('Permission result (callback):', result)
                resolve(result)
              })
            })
          }
        } else {
          console.log('Using callback-based requestPermission')
          permission = await new Promise((resolve) => {
            Notification.requestPermission((result) => {
              console.log('Permission result (legacy callback):', result)
              resolve(result)
            })
          })
        }
      }

      console.log('Final permission status:', permission)
      return permission

    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return 'denied'
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(organizationId: string, customerPhone: string): Promise<boolean> {
    try {
      console.log('Starting push notification subscription process...')
      console.log('- Organization ID:', organizationId)
      console.log('- Customer Phone:', customerPhone)
      
      if (!this.serviceWorkerRegistration) {
        console.error('Service worker not registered')
        return false
      }

      console.log('Service worker is registered, requesting permission...')
      
      // Check permission
      const permission = await this.requestPermission()
      console.log('Permission result:', permission)
      
      if (permission !== 'granted') {
        console.log('Permission not granted, subscription failed')
        return false
      }

      console.log('Permission granted, creating subscription...')

      // Check if already subscribed
      let subscription = await this.serviceWorkerRegistration.pushManager.getSubscription()
      console.log('Existing subscription:', subscription ? 'Found' : 'None')

      // Always create a fresh subscription to ensure it's valid
      if (subscription) {
        try {
          console.log('Unsubscribing from existing subscription...')
          await subscription.unsubscribe()
          console.log('Successfully unsubscribed from old subscription')
        } catch (error) {
          console.warn('Error unsubscribing old subscription:', error)
        }
      }

      console.log('Creating new subscription with VAPID key...')
      console.log('VAPID key (first 20 chars):', this.vapidPublicKey ? this.vapidPublicKey.substring(0, 20) : 'NOT SET')

      // Create new subscription
      subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey) as BufferSource
      })

      console.log('New subscription created successfully!')
      console.log('Subscription endpoint:', subscription.endpoint)

      // Send subscription to server (with small delay to ensure browser is ready)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('Sending subscription to server...')
      const success = await this.sendSubscriptionToServer(
        organizationId,
        customerPhone,
        subscription
      )

      console.log('Subscription server response:', success ? 'SUCCESS' : 'FAILED')
      return success

    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      
      if (error instanceof Error) {
        console.error('Error details:', {
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
      console.log(`Sending subscription to server (attempt ${retryCount + 1})...`)
      
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      }

      console.log('Subscription data prepared:', {
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
      console.log('Sending POST request to:', url)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      console.log('Server response status:', response.status)
      console.log('Server response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Server error response:', errorText)
        throw new Error(`Server responded with status: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Server response body:', result)
      
      const success = result.success === true
      console.log('Subscription success:', success)
      
      return success

    } catch (error) {
      console.error(`Error sending subscription to server (attempt ${retryCount + 1}):`, error)
      
      // Retry logic: retry up to 2 times with increasing delay
      if (retryCount < 2) {
        const delay = (retryCount + 1) * 1000 // 1s, 2s delays
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.sendSubscriptionToServer(organizationId, customerPhone, subscription, retryCount + 1)
      }
      
      console.error('All retry attempts failed')
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
      console.error('Error updating notification preferences:', error)
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
      console.error('Error getting notification preferences:', error)
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
      console.error('Error unsubscribing from push notifications:', error)
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
      console.error('Error sending test notification:', error)
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
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService()

// Export class for type checking
export default PushNotificationService
