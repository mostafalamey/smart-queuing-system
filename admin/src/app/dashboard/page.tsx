'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { RefreshCw, Phone, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ToastConfirmation, TicketCleanupService } from '../../lib/ticketCleanup'
import { useAppToast } from '../../hooks/useAppToast'
import ConfirmationModal from '@/components/ConfirmationModal'
import ResetQueueModal from '@/components/ResetQueueModal'

interface Department {
  id: string
  name: string
  description: string | null
  branches: {
    id: string
    name: string
  }
}

interface QueueData {
  department: Department
  currentServing: string | null
  waitingCount: number
  lastTicketNumber: string | null
}

export default function DashboardPage() {
  const { userProfile, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { showSuccess, showError, showWarning, showInfo } = useAppToast()
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [branches, setBranches] = useState<any[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [organization, setOrganization] = useState<any>(null)
  const [queueData, setQueueData] = useState<QueueData | null>(null)
  const [loading, setLoading] = useState(false)
  const [connectionError, setConnectionError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showResetQueueModal, setShowResetQueueModal] = useState(false)
  const [lastCleanupTime, setLastCleanupTime] = useState<Date | null>(null)

  // Refs to prevent multiple simultaneous operations
  const isFetchingRef = useRef(false)
  const subscriptionsRef = useRef<any>({ tickets: null, queueSettings: null })
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Function declarations with useCallback
  const fetchBranches = useCallback(async () => {
    if (!userProfile?.organization_id) return
    
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
      
      if (error) throw error
      setBranches(data || [])
      if (data && data.length > 0) {
        setSelectedBranch(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
      setConnectionError(true)
    }
  }, [userProfile?.organization_id])

  const fetchOrganization = useCallback(async () => {
    if (!userProfile?.organization_id) return
    
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url, primary_color')
        .eq('id', userProfile.organization_id)
        .single()
      
      if (error) throw error
      setOrganization(data)
    } catch (error) {
      console.error('Error fetching organization:', error)
    }
  }, [userProfile?.organization_id])

  const fetchDepartments = useCallback(async () => {
    if (!selectedBranch) return
    
    try {
      const { data } = await supabase
        .from('departments')
        .select(`
          *,
          branches:branch_id (
            id,
            name
          )
        `)
        .eq('branch_id', selectedBranch)
      
      setDepartments(data || [])
      if (data && data.length > 0) {
        setSelectedDepartment(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
      setDepartments([])
      setConnectionError(true)
    }
  }, [selectedBranch])

  const fetchQueueData = useCallback(async () => {
    if (!selectedDepartment || isFetchingRef.current) return

    isFetchingRef.current = true
    setLoading(true)
    
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
        .eq('id', selectedDepartment)
        .single()

      // Get waiting count
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .eq('department_id', selectedDepartment)
        .eq('status', 'waiting')

      // Get currently serving ticket
      const { data: servingTickets } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('department_id', selectedDepartment)
        .eq('status', 'serving')
        .order('updated_at', { ascending: false })
        .limit(1)

      // Get last ticket number
      const { data: lastTickets } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('department_id', selectedDepartment)
        .order('created_at', { ascending: false })
        .limit(1)

      setQueueData({
        department,
        currentServing: servingTickets?.[0]?.ticket_number || null,
        waitingCount: count || 0,
        lastTicketNumber: lastTickets?.[0]?.ticket_number || null,
      })

    } catch (error) {
      console.error('Error fetching queue data:', error)
      setQueueData(null)
      setConnectionError(true)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [selectedDepartment])

  // Ensure component is mounted on client side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user && mounted) {
      router.replace('/login')
    }
  }, [user, authLoading, router, mounted])

  useEffect(() => {
    if (userProfile?.organization_id) {
      fetchBranches()
      fetchOrganization()
    }
  }, [userProfile, fetchBranches, fetchOrganization])

  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments()
    }
  }, [selectedBranch, fetchDepartments])

  useEffect(() => {
    if (selectedDepartment) {
      fetchQueueData()
    }
  }, [selectedDepartment, fetchQueueData])

  // Real-time subscriptions for live updates
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
          setQueueData({
            department,
            currentServing: servingTickets?.[0]?.ticket_number || null,
            waitingCount: count || 0,
            lastTicketNumber: lastTickets?.[0]?.ticket_number || null,
          })
        }
      } catch (error) {
        console.error('Error refreshing queue data:', error)
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
        console.error('Error setting up subscriptions:', error)
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
  }, [selectedDepartment]) // Only depend on selectedDepartment

  // TEMPORARILY DISABLED - Automated ticket cleanup - runs every 24 hours
  // useEffect(() => {
  //   if (!user || !userProfile) return // Only run for authenticated users

  //   let cleanupInterval: NodeJS.Timeout | null = null
  //   let hasInitialized = false
  //   const hoursToMs = (hours: number) => hours * 60 * 60 * 1000

  //   const runAutomatedCleanup = async () => {
  //     try {
  //       console.log('Running automated ticket cleanup...')
  //       await TicketCleanupService.runAutomatedCleanup()
  //       const now = new Date()
  //       const nowTimestamp = now.getTime()
  //       setLastCleanupTime(now)
  //       localStorage.setItem('lastCleanupTime', nowTimestamp.toString())
  //       console.log('Automated ticket cleanup completed successfully')
        
  //       // Show a subtle notification that cleanup happened
  //       if (showInfo) {
  //         showInfo('Database Maintenance', 'Automated ticket cleanup completed in the background.')
  //       }
  //     } catch (error) {
  //       console.error('Automated cleanup failed:', error)
  //       // Don't show error to user as this is background process
  //     }
  //   }

  //   // Initialize last cleanup time from localStorage only once
  //   if (!hasInitialized) {
  //     hasInitialized = true
  //     const storedLastCleanup = localStorage.getItem('lastCleanupTime')
  //     const lastStoredTime = storedLastCleanup ? parseInt(storedLastCleanup) : 0
      
  //     if (lastStoredTime > 0) {
  //       setLastCleanupTime(new Date(lastStoredTime))
  //     }

  //     // Check if we need to run initial cleanup
  //     const timeSinceLastCleanup = Date.now() - lastStoredTime

  //     // If more than 23 hours since last cleanup, run it now
  //     if (timeSinceLastCleanup > hoursToMs(23)) {
  //       setTimeout(() => {
  //         runAutomatedCleanup()
  //       }, 5000) // Wait 5 seconds after page load to avoid interfering with initial load
  //     }
  //   }

  //   // Set up interval for every 24 hours
  //   cleanupInterval = setInterval(() => {
  //     runAutomatedCleanup()
  //   }, hoursToMs(24))

  //   // Cleanup interval on unmount
  //   return () => {
  //     if (cleanupInterval) {
  //       clearInterval(cleanupInterval)
  //     }
  //   }
  // }, [user, userProfile]) // Only depend on user and userProfile

  const callNext = async () => {
    if (!selectedDepartment || !queueData) return

    setLoading(true)
    try {
      // Get next waiting ticket
      const { data: nextTickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('department_id', selectedDepartment)
        .eq('status', 'waiting')
        .order('created_at', { ascending: true })
        .limit(1)

      const nextTicket = nextTickets?.[0]

      if (nextTicket) {
        // Mark any currently serving ticket as completed
        await supabase
          .from('tickets')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('department_id', selectedDepartment)
          .eq('status', 'serving')

        // Update next ticket status to serving
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
            department_id: selectedDepartment,
            current_serving: nextTicket.ticket_number
          })

        // Send push notifications
        try {
          // Validate required data for notifications
          if (!userProfile?.organization_id) {
            console.error('Organization ID not found in user profile')
            throw new Error('Organization ID required for notifications')
          }

          // 1. Send "Your Turn" notification to the customer being called
          const yourTurnResponse = await fetch('/api/notifications/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId: userProfile.organization_id,
              customerPhone: nextTicket.customer_phone,
              payload: {
                title: `🎯 Your Turn! - ${queueData.department.branches.name}`,
                body: `Ticket ${nextTicket.ticket_number} - Please proceed to ${queueData.department.name}`,
                icon: organization?.logo_url || '/logo_s.png',
                requireInteraction: true,
                vibrate: [300, 100, 300, 100, 300],
                tag: 'your-turn'
              },
              notificationType: 'your_turn',
              ticketNumber: nextTicket.ticket_number
            })
          })

          const yourTurnResult = await yourTurnResponse.json()

          // 2. Send "Almost Your Turn" notification to the next 1-2 customers in line
          const { data: upcomingTickets } = await supabase
            .from('tickets')
            .select('*')
            .eq('department_id', selectedDepartment)
            .eq('status', 'waiting')
            .order('created_at', { ascending: true })
            .limit(2)

          if (upcomingTickets && upcomingTickets.length > 0) {
            for (const upcomingTicket of upcomingTickets) {
              const position = upcomingTickets.indexOf(upcomingTicket) + 1
              const message = position === 1 
                ? "You're next! Please get ready."
                : "You're almost up! Please be ready."

              const almostTurnResponse = await fetch('/api/notifications/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  organizationId: userProfile.organization_id,
                  customerPhone: upcomingTicket.customer_phone,
                  payload: {
                    title: `🔔 Almost Your Turn - ${queueData.department.branches.name}`,
                    body: `Ticket ${upcomingTicket.ticket_number} - ${message}\nCurrently serving: ${nextTicket.ticket_number}`,
                    icon: organization?.logo_url || '/logo_s.png',
                    requireInteraction: false,
                    vibrate: [200, 100, 200],
                    tag: 'almost-your-turn'
                  },
                  notificationType: 'almost_your_turn',
                  ticketNumber: upcomingTicket.ticket_number
                })
              })

              await almostTurnResponse.json()
            }
          }
        } catch (notificationError) {
          console.error('Error sending push notifications:', notificationError)
          // Don't fail the entire operation if notifications fail
        }

        fetchQueueData()
        setConnectionError(false)
        
        // Show success toast
        showSuccess(
          'Customer Called Successfully!',
          `Now serving ticket ${nextTicket.ticket_number}`,
          {
            label: 'View Details',
            onClick: () => {
              // TODO: Implement ticket details view
            }
          }
        )
      } else {
        // No waiting customers
        showInfo(
          'No Customers Waiting',
          'The queue is currently empty. No customers to call.'
        )
      }
    } catch (error) {
      console.error('Error calling next ticket:', error)
      setConnectionError(true)
      
      // Show error toast
      showError(
        'Failed to Call Next Customer',
        'There was an error processing your request. Please try again.',
        {
          label: 'Retry',
          onClick: () => callNext()
        }
      )
    } finally {
      setLoading(false)
    }
  }

  const resetQueue = async (includeCleanup: boolean = false) => {
    if (!selectedDepartment) return

    try {
      // Reset all tickets to cancelled
      await supabase
        .from('tickets')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('department_id', selectedDepartment)
        .in('status', ['waiting', 'serving'])

      // Optional: Clean up old completed/cancelled tickets
      if (includeCleanup) {
        // Archive and delete ALL completed/cancelled tickets (no age limit for manual cleanup)
        
        // First get all completed/cancelled tickets
        const { data: oldTickets } = await supabase
          .from('tickets')
          .select('*')
          .eq('department_id', selectedDepartment)
          .in('status', ['completed', 'cancelled'])

        if (oldTickets && oldTickets.length > 0) {
          // Archive to tickets_archive table (if it exists)
          try {
            await supabase
              .from('tickets_archive')
              .insert(
                oldTickets.map(ticket => ({
                  original_ticket_id: ticket.id,
                  department_id: ticket.department_id,
                  ticket_number: ticket.ticket_number,
                  customer_phone: ticket.customer_phone,
                  status: ticket.status,
                  priority: ticket.priority,
                  estimated_service_time: ticket.estimated_service_time,
                  created_at: ticket.created_at,
                  updated_at: ticket.updated_at,
                  called_at: ticket.called_at,
                  completed_at: ticket.completed_at
                }))
              )
          } catch (archiveError) {
            // Archive table not available, skip archival and proceed with deletion
          }

          // Delete ALL completed/cancelled tickets
          await supabase
            .from('tickets')
            .delete()
            .eq('department_id', selectedDepartment)
            .in('status', ['completed', 'cancelled'])
        }
      }

      // Clear current serving and reset ticket numbering
      await supabase
        .from('queue_settings')
        .update({ 
          current_serving: null,
          last_ticket_number: 0
        })
        .eq('department_id', selectedDepartment)

      fetchQueueData()
      setConnectionError(false)
      
      // Show success toast for reset
      showWarning(
        'Queue Reset Successfully',
        includeCleanup 
          ? 'Queue cleared and all completed/cancelled tickets cleaned up!' 
          : 'All pending tickets have been cancelled and the queue has been cleared.',
        {
          label: 'Refresh Data',
          onClick: () => fetchQueueData()
        }
      )
    } catch (error) {
      console.error('Error resetting queue:', error)
      setConnectionError(true)
      
      // Show error toast for reset failure
      showError(
        'Failed to Reset Queue',
        'Unable to reset the queue. Please check your connection and try again.',
        {
          label: 'Try Again',
          onClick: () => resetQueue(includeCleanup)
        }
      )
    }
  }

  const skipCurrentTicket = async () => {
    if (!selectedDepartment || !queueData?.currentServing) return

    try {
      setLoading(true)

      // Get the currently serving ticket
      const { data: servingTickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('department_id', selectedDepartment)
        .eq('status', 'serving')
        .limit(1)

      const servingTicket = servingTickets?.[0]

      if (servingTicket) {
        // Mark the current ticket as cancelled (skipped)
        await supabase
          .from('tickets')
          .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', servingTicket.id)

        // Clear current serving in queue settings
        await supabase
          .from('queue_settings')
          .update({ current_serving: null })
          .eq('department_id', selectedDepartment)

        fetchQueueData()
        setConnectionError(false)
        
        showWarning(
          'Ticket Skipped',
          `Ticket ${servingTicket.ticket_number} has been skipped and marked as cancelled.`,
          {
            label: 'Call Next',
            onClick: () => callNext()
          }
        )
      }
    } catch (error) {
      console.error('Error skipping ticket:', error)
      setConnectionError(true)
      
      showError(
        'Failed to Skip Ticket',
        'There was an error skipping the current ticket. Please try again.',
        {
          label: 'Retry',
          onClick: () => skipCurrentTicket()
        }
      )
    } finally {
      setLoading(false)
    }
  }

  const completeCurrentTicket = async () => {
    if (!selectedDepartment || !queueData?.currentServing) return

    try {
      setLoading(true)

      // Get the currently serving ticket
      const { data: servingTickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('department_id', selectedDepartment)
        .eq('status', 'serving')
        .limit(1)

      const servingTicket = servingTickets?.[0]

      if (servingTicket) {
        // Mark the current ticket as completed
        await supabase
          .from('tickets')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', servingTicket.id)

        // Clear current serving in queue settings
        await supabase
          .from('queue_settings')
          .update({ current_serving: null })
          .eq('department_id', selectedDepartment)

        fetchQueueData()
        setConnectionError(false)
        
        showSuccess(
          'Ticket Completed!',
          `Ticket ${servingTicket.ticket_number} has been marked as completed.`,
          {
            label: 'Call Next',
            onClick: () => callNext()
          }
        )
      }
    } catch (error) {
      console.error('Error completing ticket:', error)
      setConnectionError(true)
      
      showError(
        'Failed to Complete Ticket',
        'There was an error completing the current ticket. Please try again.',
        {
          label: 'Retry',
          onClick: () => completeCurrentTicket()
        }
      )
    } finally {
      setLoading(false)
    }
  }

  const performCleanup = async () => {
    if (!selectedDepartment) return

    try {
      setLoading(true)
      
      // Clean up old completed/cancelled tickets (older than 24 hours)
      const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString()
      
      // Get tickets to be cleaned
      const { data: oldTickets } = await supabase
        .from('tickets')
        .select('*')
        .eq('department_id', selectedDepartment)
        .in('status', ['completed', 'cancelled'])
        .lt('updated_at', cutoffTime)

      if (!oldTickets || oldTickets.length === 0) {
        showInfo(
          'No Cleanup Needed',
          'No old tickets found to clean up. Database is already optimized!'
        )
        return
      }

      // Archive tickets before deletion
      try {
        await supabase
          .from('tickets_archive')
          .insert(
            oldTickets.map(ticket => ({
              original_ticket_id: ticket.id,
              department_id: ticket.department_id,
              ticket_number: ticket.ticket_number,
              customer_phone: ticket.customer_phone,
              status: ticket.status,
              priority: ticket.priority,
              estimated_service_time: ticket.estimated_service_time,
              created_at: ticket.created_at,
              updated_at: ticket.updated_at,
              called_at: ticket.called_at,
              completed_at: ticket.completed_at
            }))
          )
      } catch (archiveError) {
        console.warn('Archive table not available, proceeding with cleanup only')
      }

      // Delete old tickets
      await supabase
        .from('tickets')
        .delete()
        .eq('department_id', selectedDepartment)
        .in('status', ['completed', 'cancelled'])
        .lt('updated_at', cutoffTime)

      fetchQueueData()
      
      showSuccess(
        'Cleanup Completed!',
        `Successfully cleaned up ${oldTickets.length} old tickets. Database optimized!`
      )
    } catch (error) {
      console.error('Error during cleanup:', error)
      showError(
        'Cleanup Failed',
        'There was an error cleaning up old tickets. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchQueueData()
    if (connectionError) {
      fetchBranches()
    }
    
    // Show refresh toast
    showInfo(
      'Data Refreshed',
      'Queue information has been updated with the latest data.'
    )
  }

  // Show loading if auth is still loading or component not mounted
  if (authLoading || !mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 bg-white rounded animate-pulse"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" suppressHydrationWarning={true}>
        {/* Enhanced Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-celestial-500 via-french-blue-500 to-celestial-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Queue Dashboard</h1>
              <p className="text-white/80 text-lg">Monitor and manage active queues across all departments</p>
              {lastCleanupTime && (
                <p className="text-white/60 text-sm">
                  🧹 Last auto-cleanup: {lastCleanupTime.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="group relative overflow-hidden bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 border border-white/30"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
                  <span>Refresh</span>
                </div>
              </button>
              
              <button
                onClick={() => {
                  ToastConfirmation.confirmCleanup(
                    () => performCleanup(),
                    showWarning
                  )
                }}
                disabled={loading || !selectedDepartment}
                className="group relative overflow-hidden bg-purple-500/80 hover:bg-purple-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 border border-purple-400/30"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Cleanup</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Connection Error Warning */}
        {connectionError && (
          <div className="relative overflow-hidden bg-gradient-to-r from-citrine-50 to-yellow-50 border border-citrine-200 rounded-xl p-6 shadow-sm">
            <div className="absolute inset-0 bg-citrine-100/20"></div>
            <div className="relative flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-citrine-400 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-citrine-800 font-semibold">Connection Issues Detected</h3>
                <p className="text-citrine-700 text-sm mt-1">
                  Data may not be real-time. 
                  <button 
                    onClick={handleRefresh}
                    className="ml-2 text-citrine-800 underline hover:no-underline font-medium transition-colors duration-200"
                  >
                    Try refreshing
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Enhanced Queue Manager */}
          <div className="xl:col-span-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Main Queue Manager Card */}
              <div className="lg:col-span-2">
                <div className="relative overflow-hidden bg-gradient-to-br from-white to-celestial-50 rounded-2xl shadow-xl border-0 hover:shadow-2xl transition-all duration-300 group">
                  {/* Animated Background Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-celestial-200/30 to-french-200/20 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellowgreen-200/20 to-citrine-200/10 rounded-full translate-y-12 -translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
                  
                  <div className="relative p-8">
                    <div className="flex items-center space-x-4 mb-8">
                      <div className="relative group/icon">
                        <div className="absolute inset-0 bg-gradient-to-br from-celestial-400 to-french-500 rounded-2xl blur-sm opacity-70 group-hover/icon:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative w-14 h-14 bg-gradient-to-br from-celestial-500 to-french-600 rounded-2xl flex items-center justify-center shadow-lg group-hover/icon:shadow-xl group-hover/icon:scale-105 transition-all duration-300">
                          <Users className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-1">Queue Manager</h2>
                        <p className="text-gray-600 text-lg">Control and monitor queue operations</p>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* Branch Status Badge */}
                      {selectedBranch && (
                        <div className="flex items-center space-x-4 mb-6">
                          <div className="flex items-center space-x-3 px-5 py-3 bg-gradient-to-r from-yellowgreen-100 to-citrine-100 text-yellowgreen-800 rounded-2xl text-sm border border-yellowgreen-200 shadow-md hover:shadow-lg transition-all duration-200">
                            <div className="w-3 h-3 bg-gradient-to-r from-yellowgreen-500 to-citrine-500 rounded-full animate-pulse shadow-sm"></div>
                            <span className="font-bold">
                              {branches.find(b => b.id === selectedBranch)?.name || 'MAIN BRANCH'} 
                            </span>
                            <span className="text-yellowgreen-600 font-semibold">• ACTIVE</span>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Branch Selection */}
                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Select Branch
                        </label>
                        <div className="relative group">
                          <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-celestial-200 focus:border-celestial-500 transition-all duration-200 appearance-none cursor-pointer hover:border-celestial-300 hover:shadow-md text-gray-900 font-medium"
                            aria-label="Select Branch"
                          >
                            <option value="">Choose a branch...</option>
                            {branches.map((branch) => (
                              <option key={branch.id} value={branch.id}>
                                {branch.name} - {branch.address}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <svg className="w-5 h-5 text-celestial-500 group-hover:text-celestial-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Department Selection */}
                      <div className="space-y-3">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Select Department
                        </label>
                        <div className="relative group">
                          <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-3 focus:ring-celestial-200 focus:border-celestial-500 transition-all duration-200 appearance-none cursor-pointer hover:border-celestial-300 hover:shadow-md text-gray-900 font-medium"
                            aria-label="Select Department"
                          >
                            <option value="">Choose a department...</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <svg className="w-5 h-5 text-celestial-500 group-hover:text-celestial-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Currently Serving Banner */}
                      {queueData && (
                        <div className="relative overflow-hidden bg-gradient-to-r from-caramel-100 to-citrine-100 rounded-2xl p-6 border border-caramel-200 shadow-lg hover:shadow-xl transition-all duration-300">
                          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-caramel-200/30 to-citrine-200/20 rounded-full -translate-y-8 translate-x-8"></div>
                          <div className="relative">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-caramel-500 to-citrine-500 rounded-xl flex items-center justify-center shadow-md">
                                  <span className="text-white text-sm font-bold">📢</span>
                                </div>
                                <span className="text-caramel-800 font-bold text-lg">Currently Serving</span>
                              </div>
                              
                              {/* Action buttons - only show if there's a ticket being served */}
                              {queueData.currentServing && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => {
                                      showWarning(
                                        'Skip Current Ticket?',
                                        `This will mark ticket ${queueData.currentServing} as cancelled and clear the current serving status.`,
                                        {
                                          label: 'Skip Ticket',
                                          onClick: () => skipCurrentTicket()
                                        }
                                      )
                                    }}
                                    disabled={loading}
                                    className="group relative overflow-hidden bg-orange-500/80 hover:bg-orange-600/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg"
                                  >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                    <div className="relative flex items-center space-x-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                      <span>Skip</span>
                                    </div>
                                  </button>
                                  
                                  <button
                                    onClick={() => {
                                      showInfo(
                                        'Complete Current Ticket?',
                                        `This will mark ticket ${queueData.currentServing} as completed and clear the current serving status.`,
                                        {
                                          label: 'Complete',
                                          onClick: () => completeCurrentTicket()
                                        }
                                      )
                                    }}
                                    disabled={loading}
                                    className="group relative overflow-hidden bg-green-500/80 hover:bg-green-600/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-lg"
                                  >
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                    <div className="relative flex items-center space-x-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span>Complete</span>
                                    </div>
                                  </button>
                                </div>
                              )}
                            </div>
                            <p className="text-caramel-700 font-semibold text-xl">
                              {queueData.currentServing ? `Ticket ${queueData.currentServing}` : 'No ticket currently being served'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Queue Status and Actions - Side Panel */}
              <div className="lg:col-span-3">
                {queueData && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-celestial-500 to-french-600 rounded-2xl p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-300 group h-full">
                    {/* Animated Background Elements */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-110 transition-transform duration-500"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8 group-hover:scale-110 transition-transform duration-500"></div>
                    
                    <div className="relative h-full flex flex-col">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-xl">Queue Status</span>
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="text-center mb-8">
                          <div className="text-6xl font-black mb-3 text-white drop-shadow-lg">{queueData.waitingCount || 0}</div>
                          <div className="text-celestial-100 text-xl font-semibold">Customers Waiting</div>
                        </div>
                        <div className="space-y-4">
                          {/* Enhanced Call Next Button - Main Action */}
                          <button
                            onClick={callNext}
                            disabled={!queueData.waitingCount || loading}
                            className="w-full relative overflow-hidden bg-gradient-to-r from-yellowgreen-500 to-citrine-500 hover:from-yellowgreen-600 hover:to-citrine-600 disabled:from-gray-400 disabled:to-gray-500 text-white py-6 rounded-2xl font-black text-xl transition-all duration-200 shadow-2xl hover:shadow-3xl disabled:shadow-none group/btn transform hover:scale-105 disabled:transform-none"
                          >
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200"></div>
                            <div className="relative flex items-center justify-center">
                              <Phone className="w-7 h-7 mr-3 group-hover/btn:rotate-12 transition-transform duration-200" />
                              <span className="text-2xl">{loading ? 'Calling...' : 'Call Next Customer'}</span>
                            </div>
                          </button>
                          {/* Secondary Action Buttons */}
                          <div className="grid grid-cols-1 gap-3">
                            <button
                              onClick={() => setShowResetQueueModal(true)}
                              className="w-full relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl group/btn"
                            >
                              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200"></div>
                              <span className="relative">Reset Queue</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Queue Modal */}
      <ResetQueueModal
        isOpen={showResetQueueModal}
        onClose={() => setShowResetQueueModal(false)}
        onResetOnly={() => resetQueue(false)}
        onResetWithCleanup={() => resetQueue(true)}
        queueName={queueData?.department?.name || 'queue'}
      />
    </DashboardLayout>
  )
}

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'