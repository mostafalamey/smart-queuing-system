// PWA Install Helper for iOS Safari
// Provides install button and step-by-step instructions

import React, { useState, useEffect } from 'react'
import { Share, Download, Smartphone, Home, Plus, X } from 'lucide-react'
import { URLPersistenceService } from '@/lib/urlPersistence'
import { logger } from '@/lib/logger'

interface PWAInstallHelperProps {
  orgId: string
  branchId?: string
  organizationName?: string
  organizationLogo?: string
}

interface IOSInstallStep {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  screenshot?: string
}

export function PWAInstallHelper({ orgId, branchId, organizationName, organizationLogo }: PWAInstallHelperProps) {
  const [showInstructions, setShowInstructions] = useState(false)
  const [isIOSSafari, setIsIOSSafari] = useState(false)
  const [isPWAMode, setIsPWAMode] = useState(false)
  const [canShowInstallPrompt, setCanShowInstallPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Detect browser and PWA mode
    setIsIOSSafari(URLPersistenceService.isIOSSafari())
    setIsPWAMode(URLPersistenceService.isPWAMode())

    // Listen for beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanShowInstallPrompt(true)
      logger.log('Install prompt available')
    }

    // Listen for manifest updates to refresh install prompt
    const handleManifestUpdated = () => {
      logger.log('Manifest updated - refreshing install prompt availability')
      // Reset the prompt state to allow new prompt detection
      setCanShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('manifestUpdated', handleManifestUpdated)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('manifestUpdated', handleManifestUpdated)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android/Desktop install
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      logger.log('Install prompt outcome:', outcome)
      setDeferredPrompt(null)
      setCanShowInstallPrompt(false)
    } else if (isIOSSafari && !isPWAMode) {
      // iOS Safari - show instructions
      setShowInstructions(true)
    }
  }

  const iosInstallSteps: IOSInstallStep[] = [
    {
      id: 1,
      title: "Tap the Share button",
      description: "Look for the share icon at the bottom of your Safari browser",
      icon: <Share className="w-6 h-6 text-blue-500" />
    },
    {
      id: 2,
      title: "Find 'Add to Home Screen'",
      description: "Scroll down in the share menu and tap 'Add to Home Screen'",
      icon: <Plus className="w-6 h-6 text-green-500" />
    },
    {
      id: 3,
      title: "Confirm installation",
      description: "Tap 'Add' in the top-right corner to install the app",
      icon: <Home className="w-6 h-6 text-purple-500" />
    },
    {
      id: 4,
      title: "Find app on Home Screen",
      description: "The app will appear on your Home Screen for easy access",
      icon: <Smartphone className="w-6 h-6 text-orange-500" />
    }
  ]

  // Don't show if already in PWA mode
  if (isPWAMode) {
    return null
  }

  return (
    <>
      {/* Install Button */}
      {(canShowInstallPrompt || (isIOSSafari && !isPWAMode)) && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={handleInstallClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-300 transform hover:scale-105"
          >
            <Download className="w-5 h-5" />
            Install App
          </button>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                {organizationLogo ? (
                  <img 
                    src={organizationLogo} 
                    alt={`${organizationName} logo`}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full"></div>
                )}
                <h2 className="text-xl font-semibold text-gray-900">
                  Install {organizationName || 'Smart Queue'} App
                </h2>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Close instructions"
                aria-label="Close installation instructions"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <p className="text-gray-600 mb-6">
                Follow these steps to install the app on your iPhone for the best experience:
              </p>

              {/* Steps */}
              <div className="space-y-4">
                {iosInstallSteps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {step.id}. {step.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Benefits */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Benefits of installing:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Faster loading and offline access</li>
                  <li>• Push notifications for queue updates</li>
                  <li>• Easy access from your Home Screen</li>
                  <li>• Full-screen experience without browser bars</li>
                </ul>
              </div>

              {/* Share Button Alternative */}
              <div className="mt-6 flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
                  <Share className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                Look for this icon at the bottom of Safari
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PWAInstallHelper
