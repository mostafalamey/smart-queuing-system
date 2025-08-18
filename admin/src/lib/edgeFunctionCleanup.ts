// Edge Function Integration for Admin Dashboard
// This adds Edge Function cleanup capabilities to your existing TicketCleanupManager

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export interface EdgeFunctionCleanupRequest {
  organizationId?: string
  cleanupType?: 'tickets' | 'notifications' | 'both'
  ticketRetentionHours?: number
  archiveTickets?: boolean
  successfulNotificationRetentionMinutes?: number
  failedNotificationRetentionHours?: number
  dryRun?: boolean
  maxBatchSize?: number
}

export interface EdgeFunctionCleanupResult {
  success: boolean
  totalOrganizations: number
  totalTicketsProcessed: number
  totalNotificationsProcessed: number
  totalExecutionTimeMs: number
  organizationResults: Array<{
    success: boolean
    organizationId: string
    organizationName: string
    ticketsProcessed: number
    ticketsArchived: number
    notificationsProcessed: number
    totalExecutionTimeMs: number
    details: {
      ticketsDeleted: number
      successfulNotificationsDeleted: number
      failedNotificationsDeleted: number
      errors: string[]
    }
    recommendations: string[]
  }>
  globalRecommendations: string[]
  nextScheduledCleanup?: string
}

export class EdgeFunctionCleanupService {
  private static readonly FUNCTION_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cleanup-database`
  private static readonly ADMIN_KEY = process.env.NEXT_PUBLIC_CLEANUP_ADMIN_KEY || 'cleanup-admin-2025'

  /**
   * Run cleanup using the Edge Function
   */
  static async runEdgeFunctionCleanup(
    request: EdgeFunctionCleanupRequest = {}
  ): Promise<EdgeFunctionCleanupResult> {
    try {
      logger.log('Starting Edge Function cleanup...', request)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      const payload = {
        ...request,
        adminKey: this.ADMIN_KEY
      }

      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Edge Function failed: ${response.status} - ${errorText}`)
      }

      const result: EdgeFunctionCleanupResult = await response.json()
      
      logger.log('Edge Function cleanup completed:', {
        organizations: result.totalOrganizations,
        tickets: result.totalTicketsProcessed,
        notifications: result.totalNotificationsProcessed,
        duration: result.totalExecutionTimeMs + 'ms'
      })

      return result

    } catch (error) {
      logger.error('Edge Function cleanup failed:', error)
      throw error
    }
  }

  /**
   * Test Edge Function with dry run
   */
  static async testEdgeFunction(
    organizationId?: string
  ): Promise<EdgeFunctionCleanupResult> {
    return this.runEdgeFunctionCleanup({
      organizationId,
      dryRun: true
    })
  }

  /**
   * Quick cleanup for current organization only
   */
  static async quickCleanupCurrentOrg(): Promise<EdgeFunctionCleanupResult> {
    try {
      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data: member } = await supabase
        .from('members')
        .select('organization_id')
        .eq('auth_user_id', user.id)
        .single()

      if (!member) {
        throw new Error('User organization not found')
      }

      return this.runEdgeFunctionCleanup({
        organizationId: member.organization_id,
        cleanupType: 'both'
      })

    } catch (error) {
      logger.error('Quick cleanup failed:', error)
      throw error
    }
  }

  /**
   * Comprehensive cleanup with custom settings
   */
  static async comprehensiveCleanup(
    settings: {
      ticketRetentionHours?: number
      notificationRetentionMinutes?: number
      includeAllOrganizations?: boolean
    } = {}
  ): Promise<EdgeFunctionCleanupResult> {
    
    const request: EdgeFunctionCleanupRequest = {
      cleanupType: 'both',
      archiveTickets: true,
      ticketRetentionHours: settings.ticketRetentionHours || 24,
      successfulNotificationRetentionMinutes: settings.notificationRetentionMinutes || 60,
      failedNotificationRetentionHours: 24
    }

    // If not including all organizations, limit to current user's org
    if (!settings.includeAllOrganizations) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: member } = await supabase
          .from('members')
          .select('organization_id')
          .eq('auth_user_id', user.id)
          .single()

        if (member) {
          request.organizationId = member.organization_id
        }
      }
    }

    return this.runEdgeFunctionCleanup(request)
  }

  /**
   * Check if Edge Function is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.FUNCTION_URL + '?test=true', {
        method: 'GET'
      })
      
      // Should get 401 (unauthorized) if function exists but no admin key
      return response.status === 401 || response.status === 200
    } catch (error) {
      logger.warn('Edge Function not available:', error)
      return false
    }
  }

  /**
   * Get cleanup recommendations without actually running cleanup
   */
  static async getCleanupRecommendations(): Promise<{
    ticketCount: number
    notificationCount: number
    recommendations: string[]
  }> {
    try {
      // Run a dry run to get recommendations
      const result = await this.testEdgeFunction()
      
      const totalTickets = result.organizationResults.reduce((sum, org) => sum + org.ticketsProcessed, 0)
      const totalNotifications = result.organizationResults.reduce((sum, org) => sum + org.notificationsProcessed, 0)
      
      const allRecommendations = [
        ...result.globalRecommendations,
        ...result.organizationResults.flatMap(org => org.recommendations)
      ]

      return {
        ticketCount: totalTickets,
        notificationCount: totalNotifications,
        recommendations: allRecommendations
      }

    } catch (error) {
      logger.error('Failed to get cleanup recommendations:', error)
      return {
        ticketCount: 0,
        notificationCount: 0,
        recommendations: ['Failed to get recommendations - Edge Function may not be available']
      }
    }
  }

  /**
   * Format cleanup result for display in admin UI
   */
  static formatResultSummary(result: EdgeFunctionCleanupResult): string {
    const { totalOrganizations, totalTicketsProcessed, totalNotificationsProcessed, totalExecutionTimeMs } = result
    
    const duration = totalExecutionTimeMs < 1000 
      ? `${totalExecutionTimeMs}ms`
      : `${(totalExecutionTimeMs / 1000).toFixed(1)}s`

    const summary = [
      `✅ Processed ${totalOrganizations} organization${totalOrganizations !== 1 ? 's' : ''}`,
      `🎫 Cleaned ${totalTicketsProcessed} tickets`,
      `🔔 Cleaned ${totalNotificationsProcessed} notifications`,
      `⏱️ Completed in ${duration}`
    ]

    if (result.organizationResults.some(org => org.details.errors.length > 0)) {
      const errorCount = result.organizationResults.reduce((sum, org) => sum + org.details.errors.length, 0)
      summary.push(`⚠️ ${errorCount} errors occurred`)
    }

    return summary.join('\n')
  }
}
