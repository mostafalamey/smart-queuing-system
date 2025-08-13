'use client'

interface LoadingSpinnerProps {
  message?: string
}

export function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 bg-brand-primary rounded-lg flex items-center justify-center mx-auto mb-4">
          <div className="w-6 h-6 bg-white rounded animate-pulse"></div>
        </div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}
