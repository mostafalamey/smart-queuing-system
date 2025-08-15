import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

export const useRealtimeSubscriptions = (
  selectedDepartment: string,
  fetchQueueData: () => void,
  isFetchingRef: React.MutableRefObject<boolean>
) => {
  const subscriptionsRef = useRef<any>({ tickets: null, queueSettings: null })
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!selectedDepartment) {
      // Clean up existing subscriptions if department is cleared
      if (subscriptionsRef.current.tickets) {
        supabase.removeChannel(subscriptionsRef.current.tickets)
        subscriptionsRef.current.tickets = null
      }
      if (subscriptionsRef.current.queueSettings) {
        supabase.removeChannel(subscriptionsRef.current.queueSettings)
        subscriptionsRef.current.queueSettings = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      return
    }

    // Store the current department ID to prevent stale closures
    const currentDepartmentId = selectedDepartment
    let isActive = true

    // Create a stable refresh function that doesn't trigger state updates that cause re-renders
    const refreshData = async () => {
      if (isFetchingRef.current || !isActive) return
      
      isFetchingRef.current = true
      try {
        // Get department info
        const { data: department } = await supabase
          .from('departments')
          .select(`
            *,
            branches:branch_id (
              id,
              name
            )
          `)
          .eq('id', currentDepartmentId)
          .single()

        // Get waiting count
        const { count } = await supabase
          .from('tickets')
          .select('*', { count: 'exact' })
          .eq('department_id', currentDepartmentId)
          .eq('status', 'waiting')

        // Get currently serving ticket
        const { data: servingTickets } = await supabase
          .from('tickets')
          .select('ticket_number')
          .eq('department_id', currentDepartmentId)
          .eq('status', 'serving')
          .order('updated_at', { ascending: false })
          .limit(1)

        // Get last ticket number
        const { data: lastTickets } = await supabase
          .from('tickets')
          .select('ticket_number')
          .eq('department_id', currentDepartmentId)
          .order('created_at', { ascending: false })
          .limit(1)

        // Only update state if the component is still active
        if (isActive) {
          // Call the provided fetch function instead of setting state directly
          setTimeout(() => fetchQueueData(), 100)
        }
      } catch (error) {
        logger.error('Error refreshing queue data:', error)
        // Don't update connection error state here to prevent re-renders
      } finally {
        isFetchingRef.current = false
      }
    }

    const setupSubscriptions = () => {
      // Clean up existing subscriptions first
      if (subscriptionsRef.current.tickets) {
        supabase.removeChannel(subscriptionsRef.current.tickets)
      }
      if (subscriptionsRef.current.queueSettings) {
        supabase.removeChannel(subscriptionsRef.current.queueSettings)
      }
      
      if (!isActive) return
      
      try {
        // Subscribe to tickets changes
        subscriptionsRef.current.tickets = supabase
          .channel(`tickets-changes-${currentDepartmentId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tickets',
              filter: `department_id=eq.${currentDepartmentId}`
            },
            (payload) => {
              // Use setTimeout to batch updates and prevent rapid successive calls
              if (isActive) {
                setTimeout(() => refreshData(), 100)
              }
            }
          )
          .subscribe()

        // Subscribe to queue_settings changes
        subscriptionsRef.current.queueSettings = supabase
          .channel(`queue-settings-changes-${currentDepartmentId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'queue_settings',
              filter: `department_id=eq.${currentDepartmentId}`
            },
            (payload) => {
              // Use setTimeout to batch updates and prevent rapid successive calls
              if (isActive) {
                setTimeout(() => refreshData(), 100)
              }
            }
          )
          .subscribe()
      } catch (error) {
        logger.error('Error setting up subscriptions:', error)
        // Don't update connection error state here to prevent re-renders
      }
    }

    setupSubscriptions()

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden && isActive) {
        refreshData()
      }
    }

    // Handle online/offline events  
    const handleOnline = () => {
      if (isActive) {
        refreshData()
        setupSubscriptions()
      }
    }

    const handleOffline = () => {
      // Don't update connection error state here to prevent re-renders
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup subscriptions
    return () => {
      isActive = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      if (subscriptionsRef.current.tickets) {
        supabase.removeChannel(subscriptionsRef.current.tickets)
        subscriptionsRef.current.tickets = null
      }
      if (subscriptionsRef.current.queueSettings) {
        supabase.removeChannel(subscriptionsRef.current.queueSettings)
        subscriptionsRef.current.queueSettings = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [selectedDepartment, fetchQueueData]) // Only depend on selectedDepartment and fetchQueueData

  return {
    subscriptionsRef,
    retryTimeoutRef
  }
}
