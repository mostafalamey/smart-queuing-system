import React, { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { TicketCleanupService, CleanupResult, CleanupStats } from '../lib/ticketCleanup'
import { useAppToast } from '../hooks/useAppToast'

interface TicketCleanupManagerProps {
  className?: string
}

export default function TicketCleanupManager({ className = '' }: TicketCleanupManagerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<CleanupStats[]>([])
  const [totalCounts, setTotalCounts] = useState<{
    total: number
    active: number
    completed: number
    cancelled: number
    archived?: number
  } | null>(null)
  const [cleanupNeeded, setCleanupNeeded] = useState<{
    needed: boolean
    reason: string
    currentCount: number
    threshold: number
  } | null>(null)
  
  const { showSuccess, showError, showWarning, showInfo } = useAppToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [statsData, countsData, cleanupCheck] = await Promise.all([
        TicketCleanupService.getCleanupStats(),
        TicketCleanupService.getTotalTicketCount(),
        TicketCleanupService.needsCleanup()
      ])
      
      setStats(statsData)
      setTotalCounts(countsData)
      setCleanupNeeded(cleanupCheck)
    } catch (error) {
      logger.error('Error loading cleanup data:', error)
      showError('Error Loading Data', 'Failed to load ticket cleanup statistics.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCleanup = async (hoursOld: number, archive: boolean = true) => {
    try {
      setIsLoading(true)
      const result = await TicketCleanupService.cleanupOldTickets(hoursOld, archive)
      
      if (result) {
        showSuccess(
          'Cleanup Completed',
          `Cleaned ${result.total_cleaned} tickets${archive ? `, archived ${result.total_archived}` : ''} across ${result.departments_affected} departments.`
        )
        await loadData() // Refresh data
      }
    } catch (error) {
      logger.error('Cleanup error:', error)
      showError('Cleanup Failed', 'There was an error during the cleanup process.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAutomatedCleanup = async () => {
    try {
      setIsLoading(true)
      await TicketCleanupService.runAutomatedCleanup()
      showSuccess('Automated Cleanup', 'Automated cleanup completed successfully.')
      await loadData()
    } catch (error) {
      logger.error('Automated cleanup error:', error)
      showError('Automated Cleanup Failed', 'There was an error during automated cleanup.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmergencyCleanup = async () => {
    try {
      setIsLoading(true)
      const result = await TicketCleanupService.emergencyCleanup(true)
      
      if (result) {
        showWarning(
          'Emergency Cleanup Completed',
          `Removed all completed/cancelled tickets: ${result.total_cleaned} tickets cleaned, ${result.total_archived} archived.`
        )
        await loadData()
      }
    } catch (error) {
      logger.error('Emergency cleanup error:', error)
      showError('Emergency Cleanup Failed', 'There was an error during emergency cleanup.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number) => num.toLocaleString()

  if (isLoading && !totalCounts) {
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

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Database Cleanup Management</h3>
            <p className="text-sm text-gray-500 mt-1">
              Manage ticket database size and performance
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Statistics */}
        {totalCounts && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Current Database Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formatNumber(totalCounts.total)}</div>
                <div className="text-sm text-blue-800">Total Tickets</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatNumber(totalCounts.active)}</div>
                <div className="text-sm text-green-800">Active</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">{formatNumber(totalCounts.completed)}</div>
                <div className="text-sm text-gray-800">Completed</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{formatNumber(totalCounts.cancelled)}</div>
                <div className="text-sm text-red-800">Cancelled</div>
              </div>
            </div>
            {totalCounts.archived !== undefined && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                <span className="text-sm text-purple-800">
                  <strong>{formatNumber(totalCounts.archived)}</strong> tickets archived
                </span>
              </div>
            )}
          </div>
        )}

        {/* Cleanup Recommendation */}
        {cleanupNeeded && (
          <div className={`p-4 rounded-lg ${cleanupNeeded.needed ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center">
              {cleanupNeeded.needed ? (
                <svg className="h-5 w-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              <div>
                <div className={`text-sm font-medium ${cleanupNeeded.needed ? 'text-yellow-800' : 'text-green-800'}`}>
                  {cleanupNeeded.needed ? 'Cleanup Recommended' : 'Database Status Good'}
                </div>
                <div className={`text-sm ${cleanupNeeded.needed ? 'text-yellow-700' : 'text-green-700'}`}>
                  {cleanupNeeded.reason} ({formatNumber(cleanupNeeded.currentCount)}/{formatNumber(cleanupNeeded.threshold)})
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cleanup Actions */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Cleanup Actions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Manual Cleanup Options */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700">Manual Cleanup</h5>
              <button
                onClick={() => handleCleanup(0, true)}
                disabled={isLoading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Clean All Completed (with Archive)
              </button>
              <button
                onClick={() => handleCleanup(0, false)}
                disabled={isLoading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Clean All Completed (no Archive)
              </button>
            </div>

            {/* Advanced Options */}
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-gray-700">Advanced Options</h5>
              <button
                onClick={handleAutomatedCleanup}
                disabled={isLoading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                Run Standard Cleanup (24h old)
              </button>
              <button
                onClick={handleEmergencyCleanup}
                disabled={isLoading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                Emergency Cleanup (All Tickets)
              </button>
            </div>
          </div>
        </div>

        {/* Recent Statistics */}
        {stats.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Recent Activity (Last 7 Days)</h4>
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cancelled</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.slice(0, 7).map((stat, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(stat.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(stat.tickets_created)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{formatNumber(stat.completed)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{formatNumber(stat.cancelled)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{formatNumber(stat.active)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-blue-600">Processing cleanup...</span>
          </div>
        </div>
      )}
    </div>
  )
}
