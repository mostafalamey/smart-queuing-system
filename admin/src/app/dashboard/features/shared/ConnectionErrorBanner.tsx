interface ConnectionErrorBannerProps {
  connectionError: boolean
  onRefresh: () => void
}

export const ConnectionErrorBanner = ({ connectionError, onRefresh }: ConnectionErrorBannerProps) => {
  if (!connectionError) return null

  return (
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
              onClick={onRefresh}
              className="ml-2 text-citrine-800 underline hover:no-underline font-medium transition-colors duration-200"
            >
              Try refreshing
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
