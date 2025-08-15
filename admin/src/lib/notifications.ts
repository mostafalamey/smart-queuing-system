import { logger } from '@/lib/logger'
// WhatsApp Notification Service
// This is a basic implementation that logs to console for MVP
// In production, connect to UltraMsg, Twilio, or similar WhatsApp API

interface NotificationData {
  phone: string
  ticketNumber: string
  departmentName: string
  organizationName: string
  type: 'ticket_created' | 'almost_your_turn' | 'your_turn'
  currentServing?: string
  waitingCount?: number
}

class NotificationService {
  private static instance: NotificationService
  private isEnabled: boolean = true

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  async sendWhatsAppMessage(data: NotificationData): Promise<boolean> {
    try {
      const message = this.formatMessage(data)
      
      // For MVP: Log to console (replace with actual WhatsApp API in production)
      
      // TODO: In production, replace with actual WhatsApp API call
      // Example with UltraMsg:
      // const response = await fetch('https://api.ultramsg.com/instance123/messages/chat', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/x-www-form-urlencoded'
      //   },
      //   body: new URLSearchParams({
      //     token: process.env.ULTRAMSG_TOKEN,
      //     to: data.phone,
      //     body: message
      //   })
      // })
      
      return true
    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error)
      return false
    }
  }

  private formatMessage(data: NotificationData): string {
    const { ticketNumber, departmentName, organizationName, type, currentServing, waitingCount } = data

    switch (type) {
      case 'ticket_created':
        return `🎫 Welcome to ${organizationName}!

Your ticket number: *${ticketNumber}*
Department: ${departmentName}

${waitingCount ? `There are ${waitingCount} customers ahead of you.` : 'You\'ll be called soon!'}

Please keep this message for reference. We'll notify you when it's almost your turn.

Thank you for choosing ${organizationName}! 🙏`

      case 'almost_your_turn':
        return `⏰ Almost your turn at ${organizationName}!

Your ticket: *${ticketNumber}*
Currently serving: ${currentServing}

You're next! Please be ready at the ${departmentName} counter.

Thank you for your patience! 🙏`

      case 'your_turn':
        return `🔔 It's your turn!

Ticket: *${ticketNumber}*
Please proceed to: ${departmentName}

Thank you for choosing ${organizationName}! 🙏`

      default:
        return `Update for ticket ${ticketNumber} at ${organizationName}`
    }
  }

  // Helper method to send ticket creation notification
  async notifyTicketCreated(
    phone: string, 
    ticketNumber: string, 
    departmentName: string, 
    organizationName: string,
    waitingCount: number
  ): Promise<boolean> {
    return this.sendWhatsAppMessage({
      phone,
      ticketNumber,
      departmentName,
      organizationName,
      type: 'ticket_created',
      waitingCount
    })
  }

  // Helper method to send "almost your turn" notification
  async notifyAlmostYourTurn(
    phone: string, 
    ticketNumber: string, 
    departmentName: string, 
    organizationName: string,
    currentServing: string
  ): Promise<boolean> {
    return this.sendWhatsAppMessage({
      phone,
      ticketNumber,
      departmentName,
      organizationName,
      type: 'almost_your_turn',
      currentServing
    })
  }

  // Helper method to send "your turn" notification
  async notifyYourTurn(
    phone: string, 
    ticketNumber: string, 
    departmentName: string, 
    organizationName: string
  ): Promise<boolean> {
    return this.sendWhatsAppMessage({
      phone,
      ticketNumber,
      departmentName,
      organizationName,
      type: 'your_turn'
    })
  }
}

export const notificationService = NotificationService.getInstance()
