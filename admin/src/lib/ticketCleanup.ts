import { supabase } from './supabase'
import { logger } from '@/lib/logger'

export interface CleanupResult {
  total_cleaned: number
  total_archived: number
  departments_affected: number
}

export interface CleanupStats {
  date: string
  tickets_created: number
  completed: number
  cancelled: number
  active: number
}

export interface DepartmentStats {
  department: string
  active_tickets: number
  completed_today: number
  cancelled_today: number
}

/**
 * Ticket Cleanup Utilities for Smart Queue System
 * Provides functions to manage database size and performance
 */
export class TicketCleanupService {
  
  /**
   * Clean up old completed/cancelled tickets
   * @param hoursOld - Age of tickets to clean (default: 24 hours)
   * @param archiveBeforeDelete - Whether to archive tickets before deletion (default: true)
   * @returns Promise with cleanup results
   */
  static async cleanupOldTickets(
    hoursOld: number = 24, 
    archiveBeforeDelete: boolean = true
  ): Promise<CleanupResult | null> {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_tickets', {
        hours_old: hoursOld,
        archive_before_delete: archiveBeforeDelete
      })

      if (error) {
        logger.error('Error cleaning up tickets:', error)
        throw error
      }

      return data?.[0] || null
    } catch (error) {
      logger.error('Cleanup failed:', error)
      throw error
    }
  }

  /**
   * Run automated cleanup (same as auto_cleanup_tickets function)
   * Cleans tickets older than 24 hours with archiving
   */
  static async runAutomatedCleanup(): Promise<void> {
    try {
      const { error } = await supabase.rpc('auto_cleanup_tickets')
      
      if (error) {
        logger.error('Error running automated cleanup:', error)
        throw error
      }
    } catch (error) {
      logger.error('Automated cleanup failed:', error)
      throw error
    }
  }

  /**
   * Get ticket cleanup statistics for the last 30 days
   */
  static async getCleanupStats(): Promise<CleanupStats[]> {
    try {
      const { data, error } = await supabase
        .from('ticket_cleanup_stats')
        .select('*')
        .order('date', { ascending: false })

      if (error) {
        logger.error('Error fetching cleanup stats:', error)
        throw error
      }

      return data || []
    } catch (error) {
      logger.error('Failed to get cleanup stats:', error)
      throw error
    }
  }

  /**
   * Get current department statistics
   */
  static async getDepartmentStats(): Promise<DepartmentStats[]> {
    try {
      const { data, error } = await supabase.rpc('get_department_ticket_stats')

      if (error) {
        logger.error('Error fetching department stats:', error)
        throw error
      }

      return data || []
    } catch (error) {
      logger.error('Failed to get department stats:', error)
      throw error
    }
  }

  /**
   * Get total ticket count for monitoring database size
   */
  static async getTotalTicketCount(): Promise<{
    total: number
    active: number
    completed: number
    cancelled: number
    archived?: number
  }> {
    try {
      // Get archived count safely
      let archivedResult = 0
      try {
        const archivedResponse = await supabase
          .from('tickets_archive')
          .select('*', { count: 'exact', head: true })
        archivedResult = archivedResponse.count || 0
      } catch {
        // Archive table might not exist
        archivedResult = 0
      }

      const [ticketsResult] = await Promise.all([
        supabase
          .from('tickets')
          .select('status', { count: 'exact', head: true })
      ])

      if (ticketsResult.error) {
        throw ticketsResult.error
      }

      // Get status breakdown
      const statusBreakdown = await supabase
        .from('tickets')
        .select('status')

      const total = ticketsResult.count || 0
      const archived = archivedResult

      let active = 0, completed = 0, cancelled = 0

      if (statusBreakdown.data) {
        statusBreakdown.data.forEach(ticket => {
          switch (ticket.status) {
            case 'waiting':
            case 'serving':
              active++
              break
            case 'completed':
              completed++
              break
            case 'cancelled':
              cancelled++
              break
          }
        })
      }

      return {
        total,
        active,
        completed,
        cancelled,
        archived
      }
    } catch (error) {
      logger.error('Failed to get ticket count:', error)
      throw error
    }
  }

  /**
   * Emergency cleanup - removes all completed/cancelled tickets immediately
   * Use with caution! This now requires a callback for confirmation
   */
  static async emergencyCleanup(
    archiveFirst: boolean = true,
    confirmCallback?: () => Promise<boolean>
  ): Promise<CleanupResult | null> {
    // If no callback provided, skip confirmation (for programmatic use)
    if (confirmCallback) {
      const confirmed = await confirmCallback()
      if (!confirmed) {
        return null
      }
    }

    return this.cleanupOldTickets(0, archiveFirst)
  }

  /**
   * Check if cleanup is needed based on ticket count thresholds
   */
  static async needsCleanup(thresholds: {
    totalTickets?: number
    completedTickets?: number
  } = {}): Promise<{
    needed: boolean
    reason: string
    currentCount: number
    threshold: number
  }> {
    const defaultThresholds = {
      totalTickets: 10000,
      completedTickets: 5000
    }

    const config = { ...defaultThresholds, ...thresholds }
    const counts = await this.getTotalTicketCount()

    // Check total tickets
    if (counts.total > config.totalTickets) {
      return {
        needed: true,
        reason: 'Total tickets exceed threshold',
        currentCount: counts.total,
        threshold: config.totalTickets
      }
    }

    // Check completed tickets
    if (counts.completed > config.completedTickets) {
      return {
        needed: true,
        reason: 'Completed tickets exceed threshold',
        currentCount: counts.completed,
        threshold: config.completedTickets
      }
    }

    return {
      needed: false,
      reason: 'No cleanup needed',
      currentCount: counts.total,
      threshold: config.totalTickets
    }
  }
}

/**
 * Cleanup schedule recommendations based on usage patterns
 */
export const CleanupSchedule = {
  // High volume: cleanup every 6 hours
  HIGH_VOLUME: { hours: 6, archive: true },
  
  // Medium volume: cleanup daily
  MEDIUM_VOLUME: { hours: 24, archive: true },
  
  // Low volume: cleanup weekly
  LOW_VOLUME: { hours: 168, archive: true },
  
  // Emergency: cleanup immediately without archiving
  EMERGENCY: { hours: 0, archive: false }
}

/**
 * Toast-based confirmation utilities that work with your existing toast system
 */

export class ToastConfirmation {
  /**
   * Quick cleanup confirmation with proper messaging
   */
  static confirmCleanup(onConfirm: () => void | Promise<void>, showWarning: any) {
    showWarning(
      'Clean Up Old Tickets?',
      'This will archive and delete tickets older than 24 hours to improve database performance.',
      {
        label: 'Clean Up Now',
        onClick: async () => {
          try {
            await onConfirm()
          } catch (error) {
            logger.error('Cleanup failed:', error)
          }
        }
      }
    )
  }

  /**
   * Smart reset confirmation - offers both reset options in one toast
   * Shows first option as the main action, with a follow-up toast for the enhanced option
   */
  static confirmSmartReset(
    onResetOnly: () => void | Promise<void>, 
    onResetWithCleanup: () => void | Promise<void>, 
    showWarning: any,
    showInfo: any
  ) {
    showWarning(
      'Reset Queue?',
      'This will cancel all waiting tickets. Choose your reset option:',
      {
        label: 'Reset Queue',
        onClick: async () => {
          try {
            await onResetOnly()
          } catch (error) {
            logger.error('Reset failed:', error)
          }
        }
      }
    )
    
    // Show enhanced option
    setTimeout(() => {
      showInfo(
        'Want to Optimize Database Too?',
        'You can also reset AND clean up old tickets for better performance.',
        {
          label: 'Reset + Cleanup',
          onClick: async () => {
            try {
              await onResetWithCleanup()
            } catch (error) {
              logger.error('Reset with cleanup failed:', error)
            }
          }
        }
      )
    }, 200)
  }

  /**
   * Emergency cleanup confirmation - for dangerous operations
   */
  static confirmEmergencyCleanup(onConfirm: () => void | Promise<void>, showWarning: any, showError: any) {
    showWarning(
      '⚠️ Emergency Database Cleanup',
      'This will DELETE ALL completed/cancelled tickets immediately. This action cannot be undone!',
      {
        label: 'I Understand - Proceed',
        onClick: async () => {
          // Double confirmation for emergency actions
          showError(
            'Final Confirmation Required',
            'Are you absolutely sure? All historical ticket data will be permanently lost.',
            {
              label: 'Yes, Delete Everything',
              onClick: async () => {
                try {
                  await onConfirm()
                } catch (error) {
                  logger.error('Emergency cleanup failed:', error)
                }
              }
            }
          )
        }
      }
    )
  }
}

/**
 * Usage examples:
 * 
 * // Daily cleanup (recommended)
 * await TicketCleanupService.cleanupOldTickets(24, true)
 * 
 * // With toast confirmation
 * ToastConfirmation.confirmCleanup(
 *   () => TicketCleanupService.cleanupOldTickets(24, true),
 *   showWarning
 * )
 * 
 * // Check if cleanup is needed
 * const cleanupCheck = await TicketCleanupService.needsCleanup()
 * if (cleanupCheck.needed) {
 *   await TicketCleanupService.runAutomatedCleanup()
 * }
 * 
 * // Get statistics
 * const stats = await TicketCleanupService.getCleanupStats()
 * const deptStats = await TicketCleanupService.getDepartmentStats()
 */
