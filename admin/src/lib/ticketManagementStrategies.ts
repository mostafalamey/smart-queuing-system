/**
 * Hybrid Ticket Management Strategies
 * Choose the approach that best fits your business needs
 */

import { supabase } from './supabase'
import { logger } from '@/lib/logger'

export class TicketManagementStrategies {

  /**
   * STRATEGY 1: IMMEDIATE DELETION (Simplest)
   * Deletes completed tickets immediately when calling next
   * Best for: Simple queuing, no analytics needed, minimal storage
   */
  static async callNextWithImmediateDeletion(departmentId: string) {
    try {
      // Get next waiting ticket
      const { data: nextTickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('department_id', departmentId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .limit(1)

      const nextTicket = nextTickets?.[0]

      if (nextTicket) {
        // DELETE (not update) currently serving ticket
        await supabase
          .from('tickets')
          .delete()
          .eq('department_id', departmentId)
          .eq('status', 'serving')

        // Update next ticket to serving
        await supabase
          .from('tickets')
          .update({ 
            status: 'serving',
            called_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', nextTicket.id)

        // Update queue settings
        await supabase
          .from('queue_settings')
          .upsert({
            department_id: departmentId,
            current_serving: nextTicket.ticket_number
          })

        return { success: true, ticket: nextTicket }
      }

      return { success: false, message: 'No waiting tickets' }
    } catch (error) {
      logger.error('Error calling next with immediate deletion:', error)
      throw error
    }
  }

  /**
   * STRATEGY 2: IMMEDIATE DELETION WITH MINIMAL LOGGING
   * Deletes immediately but keeps basic analytics
   * Best for: Some analytics needed, minimal storage growth
   */
  static async callNextWithMinimalLogging(departmentId: string) {
    try {
      // Get currently serving ticket for logging
      const { data: servingTickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('department_id', departmentId)
        .eq('status', 'serving')

      // Get next waiting ticket
      const { data: nextTickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('department_id', departmentId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .limit(1)

      const nextTicket = nextTickets?.[0]
      const servingTicket = servingTickets?.[0]

      if (nextTicket) {
        // Log completed ticket to simple analytics table (minimal data)
        if (servingTicket) {
          await supabase
            .from('ticket_analytics')
            .insert({
              department_id: departmentId,
              ticket_number: servingTicket.ticket_number,
              service_date: new Date().toISOString().split('T')[0], // Date only
              service_duration: servingTicket.called_at ? 
                Math.round((Date.now() - new Date(servingTicket.called_at).getTime()) / 60000) : null // Minutes
            })
        }

        // DELETE completed ticket
        await supabase
          .from('tickets')
          .delete()
          .eq('department_id', departmentId)
          .eq('status', 'serving')

        // Update next ticket to serving
        await supabase
          .from('tickets')
          .update({ 
            status: 'serving',
            called_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', nextTicket.id)

        return { success: true, ticket: nextTicket }
      }

      return { success: false, message: 'No waiting tickets' }
    } catch (error) {
      logger.error('Error calling next with minimal logging:', error)
      throw error
    }
  }

  /**
   * STRATEGY 3: SMART HYBRID (Recommended)
   * Keeps recent tickets, auto-deletes old ones
   * Best for: Balance of analytics and performance
   */
  static async callNextWithSmartCleanup(departmentId: string, keepRecentHours: number = 24) {
    try {
      // Get next waiting ticket
      const { data: nextTickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('department_id', departmentId)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .limit(1)

      const nextTicket = nextTickets?.[0]

      if (nextTicket) {
        // Mark current serving as completed (normal flow)
        await supabase
          .from('tickets')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('department_id', departmentId)
          .eq('status', 'serving')

        // Auto-delete old completed tickets (older than keepRecentHours)
        const cutoffTime = new Date(Date.now() - (keepRecentHours * 60 * 60 * 1000)).toISOString()
        
        await supabase
          .from('tickets')
          .delete()
          .eq('department_id', departmentId)
          .in('status', ['completed', 'cancelled'])
          .lt('updated_at', cutoffTime)

        // Update next ticket to serving
        await supabase
          .from('tickets')
          .update({ 
            status: 'serving',
            called_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', nextTicket.id)

        return { success: true, ticket: nextTicket }
      }

      return { success: false, message: 'No waiting tickets' }
    } catch (error) {
      logger.error('Error calling next with smart cleanup:', error)
      throw error
    }
  }

  /**
   * STRATEGY 4: CONFIGURABLE APPROACH
   * Let admin choose the behavior
   */
  static async callNextWithConfig(
    departmentId: string, 
    config: {
      strategy: 'immediate' | 'minimal_logging' | 'smart_hybrid' | 'batch_cleanup'
      keepRecentHours?: number
    }
  ) {
    switch (config.strategy) {
      case 'immediate':
        return this.callNextWithImmediateDeletion(departmentId)
      
      case 'minimal_logging':
        return this.callNextWithMinimalLogging(departmentId)
      
      case 'smart_hybrid':
        return this.callNextWithSmartCleanup(departmentId, config.keepRecentHours || 24)
      
      case 'batch_cleanup':
      default:
        // Use existing implementation (mark as completed, cleanup later)
        return this.callNextTraditional(departmentId)
    }
  }

  /**
   * Traditional approach (your current implementation)
   */
  static async callNextTraditional(departmentId: string) {
    // Your existing implementation - mark as completed, cleanup later
    // This is what you currently have in dashboard/page.tsx
  }
}

/**
 * Simple analytics table schema for minimal logging strategy
 * Run this SQL if you choose Strategy 2:
 * 
 * CREATE TABLE ticket_analytics (
 *   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   department_id uuid NOT NULL REFERENCES departments(id),
 *   ticket_number text NOT NULL,
 *   service_date date NOT NULL,
 *   service_duration integer, -- minutes
 *   created_at timestamp with time zone DEFAULT now()
 * );
 * 
 * CREATE INDEX idx_ticket_analytics_dept_date ON ticket_analytics(department_id, service_date);
 */
