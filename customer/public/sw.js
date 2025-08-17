// Service Worker for Push Notifications and PWA Support
// Enhanced for iOS Safari PWA compatibility

const CACHE_NAME = 'smart-queue-v3'
const urlsToCache = [
  '/',
  '/favicon.svg',
  '/Logo.svg',
  '/manifest.json'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  // console.log('Service Worker: Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // console.log('Service Worker: Caching files')
        return cache.addAll(urlsToCache)
      })
      .then(() => {
        // console.log('Service Worker: Files cached successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker: Cache installation failed:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  // console.log('Service Worker: Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            // console.log('Service Worker: Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // console.log('Service Worker: Claiming clients')
      return self.clients.claim()
    })
  )
})

// Push event - handle incoming push notifications
// Enhanced for iOS Safari PWA compatibility
self.addEventListener('push', (event) => {
  // console.log('Service Worker: Push event received')

  if (!event.data) {
    // console.log('Service Worker: No data in push event')
    return
  }

  try {
    const data = event.data.json()
    // console.log('Service Worker: Push data:', data)

    // Enhanced notification options for iOS Safari compatibility
    const options = {
      body: data.body,
      icon: data.icon || '/logo_s.png',
      badge: data.badge || '/favicon.svg',
      image: data.image,
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      tag: data.tag || 'smart-queue-notification',
      renotify: data.renotify || false,
      vibrate: data.vibrate || [200, 100, 200],
      timestamp: Date.now()
    }

    // For iOS Safari, ensure we always show the notification
    event.waitUntil(
      Promise.all([
        // Show system notification
        self.registration.showNotification(data.title, options),
        // Send message to app for in-app popup
        sendMessageToApp({
          type: 'PUSH_NOTIFICATION',
          payload: {
            title: data.title,
            body: data.body,
            data: data.data || {}
          }
        })
      ])
        .then(() => {
          // console.log('Service Worker: Notification shown successfully')
        })
        .catch((error) => {
          console.error('Service Worker: Error showing notification:', error)
        })
    )

  } catch (error) {
    console.error('Service Worker: Error processing push event:', error)
    
    // Fallback notification if data parsing fails
    event.waitUntil(
      self.registration.showNotification('Smart Queue Update', {
        body: 'You have a queue update. Please check the app.',
        icon: '/logo_s.png',
        badge: '/favicon.svg',
        tag: 'smart-queue-fallback'
      })
    )
  }
})

// Notification click event - handle user clicking on notification
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  const data = notification.data || {}
  
  notification.close()

  // Handle action button clicks
  if (event.action) {
    
    switch (event.action) {
      case 'view_queue':
        event.waitUntil(
          openOrFocusApp(data.queueUrl || '/')
        )
        break
      case 'dismiss':
        // Just close the notification (already done above)
        break
      default:
        // console.log('Service Worker: Unknown action:', event.action)
    }
    return
  }

  // Default click behavior - open the app
  const targetUrl = data.clickUrl || data.queueUrl || '/'
  
  event.waitUntil(
    openOrFocusApp(targetUrl)
  )
})

// Notification close event - handle notification being dismissed
self.addEventListener('notificationclose', (event) => {
  // console.log('Service Worker: Notification closed')
  
  const notification = event.notification
  const data = notification.data || {}

  // Track notification dismissal if needed
  if (data.trackDismissal) {
    event.waitUntil(
      fetch('/api/notifications/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'dismissed',
          notificationId: data.notificationId,
          timestamp: Date.now()
        })
      }).catch((error) => {
        console.error('Service Worker: Error tracking dismissal:', error)
      })
    )
  }
})

// Background sync event - handle background data sync
self.addEventListener('sync', (event) => {
  // console.log('Service Worker: Background sync triggered:', event.tag)

  if (event.tag === 'queue-status-sync') {
    event.waitUntil(syncQueueStatus())
  }
})

// Fetch event - handle network requests (for offline support)
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for caching
  if (event.request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Clone the response
            const responseToCache = response.clone()

            // Cache the response for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache)
              })

            return response
          })
          .catch(() => {
            // Return offline page or cached fallback if available
            return caches.match('/') // Fallback to main page
          })
      })
  )
})

/**
 * Helper function to open or focus the app
 */
async function openOrFocusApp(url) {
  try {
    // Get all clients (open tabs/windows)
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })

    // Check if app is already open
    for (const client of clients) {
      if (client.url.startsWith(self.location.origin)) {
        // Focus existing window and navigate to URL if needed
        if (url !== '/' && !client.url.includes(url)) {
          client.navigate(url)
        }
        return client.focus()
      }
    }

    // Open new window if no existing window found
    return self.clients.openWindow(url)

  } catch (error) {
    console.error('Service Worker: Error opening app:', error)
    // Fallback to opening new window
    return self.clients.openWindow(url || '/')
  }
}

/**
 * Helper function to sync queue status in background
 */
async function syncQueueStatus() {
  try {
    // console.log('Service Worker: Syncing queue status...')
    
    // This would typically fetch latest queue status
    // and update local cache or IndexedDB
    
    // For now, just log that sync was triggered
    // console.log('Service Worker: Queue status sync completed')
    
  } catch (error) {
    console.error('Service Worker: Error syncing queue status:', error)
  }
}

// Send message to all open app windows/tabs
async function sendMessageToApp(message) {
  try {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    
    clients.forEach(client => {
      client.postMessage(message)
    })
  } catch (error) {
    console.error('Service Worker: Error sending message to app:', error)
  }
}

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  // console.log('Service Worker: Message received:', event.data)

  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting()
        break
      case 'CLAIM_CLIENTS':
        self.clients.claim()
        break
      case 'CACHE_UPDATE':
        // Update cache with new data
        updateCache(event.data.url, event.data.data)
        break
      default:
        // console.log('Service Worker: Unknown message type:', event.data.type)
    }
  }
})

/**
 * Helper function to update cache
 */
async function updateCache(url, data) {
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    })
    await cache.put(url, response)
    // console.log('Service Worker: Cache updated for:', url)
  } catch (error) {
    console.error('Service Worker: Error updating cache:', error)
  }
}
