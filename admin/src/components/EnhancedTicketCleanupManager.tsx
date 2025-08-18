// Enhanced Ticket Cleanup Manager with Edge Function Support
// This component extends your existing cleanup system with Edge Function capabilities

import React, { useState, useEffect } from 'react'
import { TicketCleanupService, type CleanupResult } from '@/lib/ticketCleanup'
import { EdgeFunctionCleanupService, type EdgeFunctionCleanupResult } from '@/lib/edgeFunctionCleanup'
import { useAppToast } from '@/hooks/useAppToast'

interface EnhancedTicketCleanupManagerProps {
  className?: string
}

type CleanupMethod = 'local' | 'edge-function'
type CleanupScope = 'current-org' | 'all-orgs'

export default function EnhancedTicketCleanupManager({ 
  className = '' 
}: EnhancedTicketCleanupManagerProps) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { showSuccess, showError, showInfo } = useAppToast()
  const [cleaning, setCleaning] = useState(false)
  const [edgeFunctionAvailable, setEdgeFunctionAvailable] = useState(false)
  
  // Cleanup configuration
  const [cleanupMethod, setCleanupMethod] = useState<CleanupMethod>('local')
  const [cleanupScope, setCleanupScope] = useState<CleanupScope>('current-org')
  const [settings, setSettings] = useState({
    ticketRetentionHours: 24,
    notificationRetentionMinutes: 60,
    archiveTickets: true,
    dryRun: false
  })

  // Results state
  const [lastResult, setLastResult] = useState<CleanupResult | EdgeFunctionCleanupResult | null>(null)

  useEffect(() => {
    Promise.all([
      loadCleanupStats(),
      checkEdgeFunctionAvailability()
    ])
  }, [])

  const loadCleanupStats = async () => {
    try {
      setLoading(true)
      const [cleanupStats, departmentStats] = await Promise.all([
        TicketCleanupService.getCleanupStats(),
        TicketCleanupService.getDepartmentStats()
      ])
      
      setStats({ cleanupStats, departmentStats })
    } catch (error) {
      console.error('Error loading cleanup stats:', error)
      toast.error('Failed to load cleanup statistics')
    } finally {
      setLoading(false)
    }
  }

  const checkEdgeFunctionAvailability = async () => {
    try {
      const available = await EdgeFunctionCleanupService.isAvailable()
      setEdgeFunctionAvailable(available)
      
      if (available) {
        // Default to Edge Function if available
        setCleanupMethod('edge-function')
      }
    } catch (error) {
      console.warn('Edge Function check failed:', error)
    }
  }

  const runCleanup = async () => {
    try {
      setCleaning(true)
      setLastResult(null)

      if (cleanupMethod === 'edge-function') {
        // Use Edge Function cleanup
        const result = await EdgeFunctionCleanupService.runEdgeFunctionCleanup({
          organizationId: cleanupScope === 'current-org' ? undefined : undefined, // Let Edge Function handle org detection
          cleanupType: 'both',
          ticketRetentionHours: settings.ticketRetentionHours,
          archiveTickets: settings.archiveTickets,
          successfulNotificationRetentionMinutes: settings.notificationRetentionMinutes,
          failedNotificationRetentionHours: 24,
          dryRun: settings.dryRun
        })

        setLastResult(result)
        
        const summary = EdgeFunctionCleanupService.formatResultSummary(result)
        toast.success(settings.dryRun ? `DRY RUN Results:\n${summary}` : summary, {
          duration: 5000
        })

      } else {
        // Use local cleanup
        if (settings.dryRun) {
          // For local cleanup, we'll simulate by checking what would be cleaned
          const recommendation = await TicketCleanupService.getCleanupRecommendation()
          toast.info(`DRY RUN: Would clean ${recommendation.oldTicketsCount} tickets`, {
            duration: 3000
          })
          return
        }

        const result = await TicketCleanupService.performCleanup({
          maxAge: settings.ticketRetentionHours,
          archive: settings.archiveTickets,
          confirmationCallback: () => Promise.resolve(true)
        })

        setLastResult(result)
        toast.success(`Local cleanup: ${result.ticketsDeleted} tickets deleted, ${result.ticketsArchived} archived`)
      }

      // Refresh stats after cleanup
      await loadCleanupStats()

    } catch (error) {
      console.error('Cleanup failed:', error)
      toast.error(`Cleanup failed: ${error.message}`)
    } finally {
      setCleaning(false)
    }
  }

  const runQuickTest = async () => {
    try {
      setCleaning(true)
      
      if (cleanupMethod === 'edge-function') {
        const result = await EdgeFunctionCleanupService.testEdgeFunction()
        const summary = EdgeFunctionCleanupService.formatResultSummary(result)
        toast.success(`Edge Function Test:\n${summary}`, { duration: 4000 })
      } else {
        const recommendation = await TicketCleanupService.getCleanupRecommendation()
        toast.info(`Local Test: ${recommendation.oldTicketsCount} tickets would be cleaned`, {
          duration: 3000
        })
      }
    } catch (error) {
      console.error('Test failed:', error)
      toast.error(`Test failed: ${error.message}`)
    } finally {
      setCleaning(false)
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  const isEdgeFunctionResult = (result: any): result is EdgeFunctionCleanupResult => {
    return result && 'totalOrganizations' in result
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Enhanced Database Cleanup
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Clean up tickets and notification logs with local or Edge Function processing
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {edgeFunctionAvailable && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Edge Function Available
              </span>
            )}
            <button
              onClick={loadCleanupStats}
              disabled={loading}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="p-6 bg-gray-50 border-b border-gray-200">
        <h4 className="font-medium text-gray-900 mb-4">Cleanup Configuration</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Cleanup Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cleanup Method
            </label>
            <select
              value={cleanupMethod}
              onChange={(e) => setCleanupMethod(e.target.value as CleanupMethod)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="local">Local (Browser)</option>
              {edgeFunctionAvailable && (
                <option value="edge-function">Edge Function (Server)</option>
              )}
            </select>
          </div>

          {/* Cleanup Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scope
            </label>
            <select
              value={cleanupScope}
              onChange={(e) => setCleanupScope(e.target.value as CleanupScope)}
              disabled={cleanupMethod === 'local'} // Local always uses current org
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
            >
              <option value="current-org">Current Organization</option>
              {cleanupMethod === 'edge-function' && (
                <option value="all-orgs">All Organizations</option>
              )}
            </select>
          </div>

          {/* Ticket Retention */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ticket Retention (hours)
            </label>
            <input
              type="number"
              min="1"
              max="168"
              value={settings.ticketRetentionHours}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                ticketRetentionHours: parseInt(e.target.value) || 24
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          {/* Notification Retention */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notification Retention (min)
            </label>
            <input
              type="number"
              min="5"
              max="1440"
              value={settings.notificationRetentionMinutes}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                notificationRetentionMinutes: parseInt(e.target.value) || 60
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              disabled={cleanupMethod === 'local'} // Local cleanup doesn't handle notifications yet
            />
          </div>
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.archiveTickets}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                archiveTickets: e.target.checked
              }))}
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Archive tickets before deletion</span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.dryRun}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                dryRun: e.target.checked
              }))}
              className="rounded border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Dry run (preview only)</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={runQuickTest}
            disabled={cleaning}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {cleaning ? '⏳ Testing...' : '🧪 Quick Test'}
          </button>

          <button
            onClick={runCleanup}
            disabled={cleaning}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {cleaning ? '⏳ Processing...' : settings.dryRun ? '👁️ Preview Cleanup' : '🧹 Run Cleanup'}
          </button>

          {cleanupMethod === 'edge-function' && (
            <div className="text-sm text-gray-600 flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                Server-side
              </span>
              Reliable, scheduled, multi-organization support
            </div>
          )}

          {cleanupMethod === 'local' && (
            <div className="text-sm text-gray-600 flex items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                Browser-based
              </span>
              Current organization only, requires admin session
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {lastResult && (
        <div className="p-6 bg-blue-50 border-b border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Last Cleanup Results</h4>
          
          {isEdgeFunctionResult(lastResult) ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{lastResult.totalOrganizations}</div>
                  <div className="text-sm text-gray-500">Organizations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{lastResult.totalTicketsProcessed}</div>
                  <div className="text-sm text-gray-500">Tickets Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{lastResult.totalNotificationsProcessed}</div>
                  <div className="text-sm text-gray-500">Notifications Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{lastResult.totalExecutionTimeMs}ms</div>
                  <div className="text-sm text-gray-500">Execution Time</div>
                </div>
              </div>

              {lastResult.globalRecommendations.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Recommendations:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {lastResult.globalRecommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{lastResult.ticketsDeleted}</div>
                <div className="text-sm text-gray-500">Tickets Deleted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{lastResult.ticketsArchived}</div>
                <div className="text-sm text-gray-500">Tickets Archived</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{lastResult.departmentsAffected}</div>
                <div className="text-sm text-gray-500">Departments</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Statistics */}
      {stats && (
        <div className="p-6">
          <h4 className="font-medium text-gray-900 mb-4">Current Database Status</h4>
          
          {stats.departmentStats && stats.departmentStats.length > 0 ? (
            <div className="space-y-3">
              {stats.departmentStats.map((dept: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{dept.department_name}</div>
                    <div className="text-sm text-gray-500">
                      {dept.active_tickets} active • {dept.completed_tickets} completed • {dept.cancelled_tickets} cancelled
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">{dept.total_tickets}</div>
                    <div className="text-sm text-gray-500">total tickets</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No ticket statistics available
            </div>
          )}
        </div>
      )}
    </div>
  )
}
