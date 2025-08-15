'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    logger.error('Global error:', error)
    
    // Check if it's a chunk loading error
    if (error.message.includes('Loading chunk') || 
        error.message.includes('ChunkLoadError') ||
        error.message.includes('Loading CSS chunk')) {
      // Auto-refresh for chunk loading errors
      window.location.reload()
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl">!</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              The application encountered an error. This might be due to a development server restart.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={reset}
                className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
