// Push Notification Helper for Queue Operations
// This module provides easy-to-use functions for sending queue-related push notifications

import { pushNotificationService } from './pushNotifications'
import { logger } from './logger'

interface NotificationData {
  organizationId: string
  ticketId: string // Primary identifier - required
  customerPhone?: string | null // Optional for WhatsApp/SMS fallback
  ticketNumber: string
  departmentName: string
  organizationName: string
  organizationLogo?: string
  organizationColor?: string
}

interface QueueNotificationHelper {
  sendTicketCreatedNotification(data: NotificationData & { waitingCount: number }): Promise<boolean>
  sendAlmostYourTurnNotification(data: NotificationData & { currentServing: string }): Promise<boolean>
  sendYourTurnNotification(data: NotificationData): Promise<boolean>
  sendQueueResetNotification(data: NotificationData): Promise<boolean>
}

class QueueNotificationHelperImpl implements QueueNotificationHelper {
  private adminUrl: string

  constructor() {
    this.adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL!
    
    // Validate that admin URL is properly configured
    if (!this.adminUrl || this.adminUrl === 'undefined') {
      logger.error('NEXT_PUBLIC_ADMIN_URL environment variable is not properly configured')
      logger.error('Push notifications will not work without the admin app URL')
      // Use a placeholder that will fail gracefully
      this.adminUrl = 'ADMIN_URL_NOT_CONFIGURED'
    }
  }

  /**
   * Send notification when customer first creates a ticket
   */
  async sendTicketCreatedNotification(data: NotificationData & { waitingCount: number }): Promise<boolean> {
    const payload = {
      title: `🎫 ${data.organizationName}`,
      body: `Your ticket number is ${data.ticketNumber}\nDepartment: ${data.departmentName}\n${data.waitingCount} customers ahead of you`,
      icon: data.organizationLogo || '/logo_s.png',
      badge: '/favicon.svg',
      data: {
        ticketNumber: data.ticketNumber,
        departmentName: data.departmentName,
        organizationId: data.organizationId,
        notificationType: 'ticket_created',
        clickUrl: `/?org=${data.organizationId}`,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view_queue',
          title: 'View Queue'
        }
      ],
      requireInteraction: false,
      tag: `ticket-${data.ticketNumber}`,
      vibrate: [200, 100, 200]
    }

    return this.sendPushNotification(data, payload, 'ticket_created')
  }

  /**
   * Send notification when customer is 3 tickets away from being served
   */
  async sendAlmostYourTurnNotification(data: NotificationData & { currentServing: string }): Promise<boolean> {
    const payload = {
      title: `🔔 Almost Your Turn - ${data.organizationName}`,
      body: `Ticket ${data.ticketNumber} - You're almost up!\nCurrently serving: ${data.currentServing}\nPlease get ready for ${data.departmentName}`,
      icon: data.organizationLogo || '/logo_s.png',
      badge: '/favicon.svg',
      data: {
        ticketNumber: data.ticketNumber,
        departmentName: data.departmentName,
        organizationId: data.organizationId,
        notificationType: 'almost_your_turn',
        clickUrl: `/?org=${data.organizationId}`,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view_queue',
          title: 'Check Queue'
        }
      ],
      requireInteraction: true, // More important notification
      tag: `almost-turn-${data.ticketNumber}`,
      renotify: true,
      vibrate: [300, 100, 300, 100, 300]
    }

    return this.sendPushNotification(data, payload, 'almost_your_turn')
  }

  /**
   * Send notification when it's customer's turn
   */
  async sendYourTurnNotification(data: NotificationData): Promise<boolean> {
    const payload = {
      title: `🎯 Your Turn! - ${data.organizationName}`,
      body: `Ticket ${data.ticketNumber} - Please proceed to ${data.departmentName}`,
      icon: data.organizationLogo || '/logo_s.png',
      badge: '/favicon.svg',
      data: {
        ticketNumber: data.ticketNumber,
        departmentName: data.departmentName,
        organizationId: data.organizationId,
        notificationType: 'your_turn',
        clickUrl: `/?org=${data.organizationId}`,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view_queue',
          title: 'I\'m Here!'
        }
      ],
      requireInteraction: true, // Critical notification
      tag: `your-turn-${data.ticketNumber}`,
      renotify: true,
      vibrate: [500, 200, 500, 200, 500]
    }

    return this.sendPushNotification(data, payload, 'your_turn')
  }

  /**
   * Send notification when queue is reset (optional)
   */
  async sendQueueResetNotification(data: NotificationData): Promise<boolean> {
    const payload = {
      title: `🔄 Queue Reset - ${data.organizationName}`,
      body: `The queue for ${data.departmentName} has been reset. Please rejoin if you still need service.`,
      icon: data.organizationLogo || '/logo_s.png',
      badge: '/favicon.svg',
      data: {
        ticketNumber: data.ticketNumber,
        departmentName: data.departmentName,
        organizationId: data.organizationId,
        notificationType: 'queue_reset',
        clickUrl: `/?org=${data.organizationId}`,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view_queue',
          title: 'Rejoin Queue'
        }
      ],
      requireInteraction: false,
      tag: `queue-reset-${data.organizationId}`,
      vibrate: [200, 100, 200]
    }

    return this.sendPushNotification(data, payload, 'queue_reset')
  }

  /**
   * Private method to send push notification via admin API
   */
  private async sendPushNotification(
    data: NotificationData,
    payload: any,
    notificationType: string
  ): Promise<boolean> {
    try {
      // Check if admin URL is properly configured
      if (!this.adminUrl || this.adminUrl === 'ADMIN_URL_NOT_CONFIGURED') {
        logger.error('Cannot send push notification: Admin URL not configured')
        logger.error('Please set NEXT_PUBLIC_ADMIN_URL environment variable in Vercel')
        return false
      }

      const url = `${this.adminUrl}/api/notifications/push`
      logger.debug('Sending push notification to:', url)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: data.organizationId,
          ticketId: data.ticketId, // Use ticket ID as primary identifier
          customerPhone: data.customerPhone, // Optional for WhatsApp/SMS fallback
          payload,
          notificationType,
          ticketNumber: data.ticketNumber
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        
        // Check if this is a migration required error
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.migrationRequired) {
            logger.error('Database migration required:', errorData.details)
            // Don't return false immediately - this is expected until migration runs
            return false
          }
        } catch (e) {
          // If we can't parse the error, just log it normally
        }
        
        logger.error(`Push notification API error (${response.status}):`, errorText)
        return false
      }

      const result = await response.json()
      return result.success

    } catch (error) {
      logger.error('Error sending push notification:', error)
      logger.error('This usually indicates a configuration or network issue')
      return false
    }
  }

  /**
   * Check if customer has active push subscriptions
   */
  async hasActivePushSubscription(organizationId: string, ticketId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.adminUrl}/api/notifications/subscribe?organizationId=${organizationId}&ticketId=${ticketId}`
      )

      if (response.ok) {
        const result = await response.json()
        return result.success && result.activeSubscriptions > 0
      }

      return false

    } catch (error) {
      logger.error('Error checking push subscription status:', error)
      return false
    }
  }

  /**
   * Get notification preferences for a customer by ticket ID
   */
  async getNotificationPreferences(organizationId: string, ticketId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.adminUrl}/api/notifications/subscribe?organizationId=${organizationId}&ticketId=${ticketId}`
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
}

// Create singleton instance
export const queueNotificationHelper = new QueueNotificationHelperImpl()

// Export notification data interface for type checking
export type { NotificationData }

// Export class for testing
export default QueueNotificationHelperImpl
