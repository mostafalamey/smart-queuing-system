'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import ResetQueueModal from '@/components/ResetQueueModal'

// Feature components
import { DashboardHeader } from './features/dashboard-header'
import { QueueManager } from './features/queue-management'
import { QueueStatus } from './features/queue-status'
import { useQueueOperations } from './features/queue-controls'
import { 
  useDashboardData, 
  useRealtimeSubscriptions, 
  ConnectionErrorBanner 
} from './features/shared'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [showResetQueueModal, setShowResetQueueModal] = useState(false)
  const [queueOperationLoading, setQueueOperationLoading] = useState(false)

  // Use custom hooks for data management
  const dashboardData = useDashboardData()
  const queueOperations = useQueueOperations()

  // Real-time subscriptions
  useRealtimeSubscriptions(
    dashboardData.selectedDepartment,
    dashboardData.fetchQueueData,
    dashboardData.isFetchingRef
  )

  // Redirect if not authenticated
  if (!authLoading && !user && dashboardData.mounted) {
    router.replace('/login')
    return null
  }

  // Show loading if auth is still loading or component not mounted
  if (authLoading || !dashboardData.mounted) {
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

  // Handle queue operations with proper parameters
  const handleCallNext = () => {
    queueOperations.callNext(
      dashboardData.selectedDepartment,
      dashboardData.selectedService,
      dashboardData.queueData,
      dashboardData.userProfile,
      dashboardData.organization,
      dashboardData.fetchQueueData,
      setQueueOperationLoading,
      (error) => {/* setConnectionError handled in dashboardData */},
      dashboardData.showSuccess,
      dashboardData.showInfo,
      dashboardData.showError
    )
  }

  const handleSkipTicket = () => {
    queueOperations.skipCurrentTicket(
      dashboardData.selectedDepartment,
      dashboardData.queueData,
      dashboardData.fetchQueueData,
      setQueueOperationLoading,
      (error) => {/* setConnectionError handled in dashboardData */},
      dashboardData.showWarning,
      dashboardData.showError
    )
  }

  const handleCompleteTicket = () => {
    queueOperations.completeCurrentTicket(
      dashboardData.selectedDepartment,
      dashboardData.queueData,
      dashboardData.fetchQueueData,
      setQueueOperationLoading,
      (error) => {/* setConnectionError handled in dashboardData */},
      dashboardData.showSuccess,
      dashboardData.showError
    )
  }

  const handleResetQueue = (includeCleanup: boolean) => {
    queueOperations.resetQueue(
      dashboardData.selectedDepartment,
      includeCleanup,
      dashboardData.fetchQueueData,
      setQueueOperationLoading,
      (error) => {/* setConnectionError handled in dashboardData */},
      dashboardData.showWarning,
      dashboardData.showError
    )
  }

  const handlePerformCleanup = () => {
    queueOperations.performCleanup(
      dashboardData.selectedDepartment,
      dashboardData.fetchQueueData,
      setQueueOperationLoading,
      dashboardData.showInfo,
      dashboardData.showSuccess,
      dashboardData.showError
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" suppressHydrationWarning={true}>
        {/* Dashboard Header */}
        <DashboardHeader
          lastCleanupTime={dashboardData.lastCleanupTime}
          loading={dashboardData.loading}
          selectedDepartment={dashboardData.selectedDepartment}
          onRefresh={dashboardData.handleRefresh}
          onCleanup={handlePerformCleanup}
          showWarning={dashboardData.showWarning}
        />

        {/* Connection Error Banner */}
        <ConnectionErrorBanner
          connectionError={dashboardData.connectionError}
          onRefresh={dashboardData.handleRefresh}
        />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Enhanced Queue Manager */}
          <div className="xl:col-span-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Main Queue Manager Card */}
              <div className="lg:col-span-2">
                <QueueManager
                  selectedBranch={dashboardData.selectedBranch}
                  setSelectedBranch={dashboardData.setSelectedBranch}
                  selectedDepartment={dashboardData.selectedDepartment}
                  setSelectedDepartment={dashboardData.setSelectedDepartment}
                  selectedService={dashboardData.selectedService}
                  setSelectedService={dashboardData.setSelectedService}
                  branches={dashboardData.branches}
                  departments={dashboardData.departments}
                  services={dashboardData.services}
                  queueData={dashboardData.queueData}
                  loading={queueOperationLoading}
                  onSkipTicket={handleSkipTicket}
                  onCompleteTicket={handleCompleteTicket}
                  showWarning={dashboardData.showWarning}
                  showInfo={dashboardData.showInfo}
                />
              </div>

              {/* Queue Status and Actions - Side Panel */}
              <div className="lg:col-span-3">
                <QueueStatus
                  queueData={dashboardData.queueData}
                  loading={queueOperationLoading}
                  onCallNext={handleCallNext}
                  onShowResetModal={() => setShowResetQueueModal(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Queue Modal */}
      <ResetQueueModal
        isOpen={showResetQueueModal}
        onClose={() => setShowResetQueueModal(false)}
        onResetOnly={() => handleResetQueue(false)}
        onResetWithCleanup={() => handleResetQueue(true)}
        queueName={
          dashboardData.queueData?.service 
            ? `${dashboardData.queueData.service.name} (${dashboardData.queueData.department?.name})` 
            : dashboardData.queueData?.department?.name || 'queue'
        }
      />
    </DashboardLayout>
  )
}

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'
