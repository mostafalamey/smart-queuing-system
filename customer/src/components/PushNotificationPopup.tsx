'use client'

import { useState, useEffect, useCallback } from 'react'

// Simple SVG icons for notifications
const CheckCircleIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
)

const ClockIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
  </svg>
)

const BellIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.243.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9z" clipRule="evenodd" />
  </svg>
)

const XMarkIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
  </svg>
)

interface NotificationData {
  title: string
  body: string
  type: 'ticket_created' | 'almost_your_turn' | 'your_turn' | 'general'
  timestamp: number
}

interface PushNotificationPopupProps {
  notification: NotificationData | null
  onClose: () => void
}

export default function PushNotificationPopup({ notification, onClose }: PushNotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [animationClass, setAnimationClass] = useState('')

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300) // Wait for exit animation
  }, [onClose])

  useEffect(() => {
    if (notification) {
      // Set animation based on notification type
      setAnimationClass(getAnimationClass(notification.type))
      setIsVisible(true)

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [notification, handleClose])

  const getAnimationClass = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return 'animate-slide-in-from-top' // Gentle slide down
      case 'almost_your_turn':
        return 'animate-bounce' // Attention-grabbing bounce
      case 'your_turn':
        return 'animate-pulse' // Urgent pulsing
      default:
        return 'animate-fade-in' // Simple fade
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return <BellIcon className="h-6 w-6 text-blue-500" />
      case 'almost_your_turn':
        return <ClockIcon className="h-6 w-6 text-orange-500" />
      case 'your_turn':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />
      default:
        return <BellIcon className="h-6 w-6 text-gray-500" />
    }
  }

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return 'border-l-blue-500'
      case 'almost_your_turn':
        return 'border-l-orange-500'
      case 'your_turn':
        return 'border-l-green-500'
      default:
        return 'border-l-gray-500'
    }
  }

  if (!notification) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Notification Container */}
        <div className="absolute top-4 right-4 pointer-events-auto">
          <div
            className={`
              bg-white rounded-lg shadow-lg border-l-4 ${getBorderColor(notification.type)}
              min-w-80 max-w-sm p-4 transform transition-all duration-300 ease-in-out
              ${isVisible ? `${animationClass} translate-x-0 opacity-100` : 'translate-x-full opacity-0'}
            `}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getIcon(notification.type)}
                <h4 className="font-semibold text-gray-900 text-sm">
                  {notification.title}
                </h4>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close notification"
                title="Close notification"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Message */}
            <p className="text-gray-700 text-sm leading-relaxed">
              {notification.body}
            </p>

            {/* Progress bar for auto-dismiss */}
            <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all duration-[5000ms] ease-linear ${
                  isVisible ? 'w-0' : 'w-full'
                } ${
                  notification.type === 'your_turn' ? 'bg-green-500' :
                  notification.type === 'almost_your_turn' ? 'bg-orange-500' :
                  'bg-blue-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>


    </>
  )
}
