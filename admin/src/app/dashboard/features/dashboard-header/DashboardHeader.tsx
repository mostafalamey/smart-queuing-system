import { RefreshCw } from 'lucide-react'

interface DashboardHeaderProps {
  lastCleanupTime: Date | null
  loading: boolean
  selectedDepartment: string
  onRefresh: () => void
}

export const DashboardHeader = ({
  lastCleanupTime,
  loading,
  selectedDepartment,
  onRefresh
}: DashboardHeaderProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
      
      <div className="relative flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Queue Dashboard</h1>
          <p className="text-white/80">Monitor and manage active queues across all departments</p>
          {lastCleanupTime && (
            <p className="text-white/60 text-sm mt-1">
              🧹 Last auto-cleanup: {lastCleanupTime.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="group relative overflow-hidden bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-3 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 disabled:opacity-50 border border-white/30"
          >
            <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
            <div className="relative flex items-center space-x-1 sm:space-x-2">
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-300`} />
              <span className="hidden sm:inline">Refresh</span>
            </div>
          </button>
          
          {/* Automated Cleanup Status */}
          <div className="bg-green-500/20 backdrop-blur-sm text-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border border-green-400/30">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline text-sm font-medium">Auto-Cleanup Active</span>
              <span className="sm:hidden text-xs">Auto</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
