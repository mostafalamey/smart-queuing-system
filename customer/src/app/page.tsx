'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-fixed'
import { DynamicTheme } from '@/components/DynamicTheme'
import { notificationService } from '@/lib/notifications'
import { pushNotificationService } from '@/lib/pushNotifications'
import { queueNotificationHelper } from '@/lib/queueNotifications'
import { BrowserDetection, type BrowserInfo } from '@/lib/browserDetection'
import { URLPersistenceService } from '@/lib/urlPersistence'
import PWAInstallHelper from '@/components/PWAInstallHelper'
import { Phone, ChevronRight, MapPin, Users, Clock, Bell, BellOff, AlertTriangle, Info } from 'lucide-react'

interface Organization {
  id: string
  name: string
  primary_color: string | null
  logo_url: string | null
  welcome_message: string | null
}

interface Branch {
  id: string
  name: string
  address: string | null
}

interface Department {
  id: string
  name: string
  description: string | null
  branch_id: string
}

interface QueueStatus {
  currentServing: number | null
  waitingCount: number
  estimatedWaitTime: number
}

function CustomerAppContent() {
  const searchParams = useSearchParams()
  
  // Enhanced URL parameter handling with persistence
  const urlParams = URLPersistenceService.getCurrentParams(searchParams)
  const orgId = urlParams.org
  const branchId = urlParams.branch

  const [step, setStep] = useState(1) // 1: Phone, 2: Branch, 3: Service
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>(branchId || '')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [ticketNumber, setTicketNumber] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(false)
  const [pushNotificationsSupported, setPushNotificationsSupported] = useState(false)
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  const [pushSubscriptionLoading, setPushSubscriptionLoading] = useState(false)
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null)
  const [showBrowserWarning, setShowBrowserWarning] = useState(false)

  // Initialize browser detection only (no permission request yet)
  useEffect(() => {
    initializeBrowserDetection()
  }, [])

  useEffect(() => {
    if (orgId) {
      fetchOrganization()
      fetchBranches()
    }
  }, [orgId])

  useEffect(() => {
    if (branchId) {
      setSelectedBranch(branchId)
      // Update stored parameters
      URLPersistenceService.updateStoredParams(orgId, branchId)
      // Don't change step - keep at step 1 for phone number entry
      // The branch is just pre-selected for later use
    }
  }, [branchId, orgId])

  useEffect(() => {
    if (selectedBranch) {
      fetchDepartments()
    }
  }, [selectedBranch])

  useEffect(() => {
    if (selectedDepartment) {
      fetchQueueStatus()
    }
  }, [selectedDepartment])

  // Initialize browser detection only (no permission request)
  const initializeBrowserDetection = async () => {
    try {
      // Get detailed browser information
      const browserInfo = BrowserDetection.getBrowserInfo()
      setBrowserInfo(browserInfo)

      console.log('Browser detection:', browserInfo)

      // Set support based on detailed detection
      setPushNotificationsSupported(browserInfo.isSupported)

      // Show warning ONLY for unsupported browsers, not limited support
      if (!browserInfo.isSupported) {
        setShowBrowserWarning(true)
      }
    } catch (error) {
      console.error('Error detecting browser capabilities:', error)
    }
  }

  const fetchOrganization = async () => {
    if (!orgId) return;
    
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single()
      
      if (error) {
        console.error('Error fetching organization:', error);
        return;
      }
      
      setOrganization(data)
    } catch (error) {
      console.error('Exception fetching organization:', error);
    }
  }

  const fetchBranches = async () => {
    if (!orgId) return;
    
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('organization_id', orgId)
      
      if (error) {
        console.error('Error fetching branches:', error);
        setBranches([]);
        return;
      }
      
      setBranches(data || [])
    } catch (error) {
      console.error('Exception fetching branches:', error);
      setBranches([]);
    }
  }

  const fetchDepartments = async () => {
    if (!selectedBranch) return;
    
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('branch_id', selectedBranch)
      
      if (error) {
        console.error('Error fetching departments:', error);
        setDepartments([]);
        return;
      }
      
      setDepartments(data || [])
    } catch (error) {
      console.error('Exception fetching departments:', error);
      setDepartments([]);
    }
  }

  const fetchQueueStatus = async () => {
    if (!selectedDepartment) return

    try {
      // Try to get queue settings first
      const { data: settings } = await supabase
        .from('queue_settings')
        .select('*')
        .eq('department_id', selectedDepartment)
        .single()

      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .eq('department_id', selectedDepartment)
        .eq('status', 'waiting')

      setQueueStatus({
        currentServing: settings?.current_serving || null,
        waitingCount: count || 0,
        estimatedWaitTime: (count || 0) * 5 // 5 minutes per customer estimate
      })
    } catch (error) {
      console.error('Error fetching queue status:', error)
      // Fallback to basic count only
      const { count } = await supabase
        .from('tickets')
        .select('*', { count: 'exact' })
        .eq('department_id', selectedDepartment)
        .eq('status', 'waiting')

      setQueueStatus({
        currentServing: null,
        waitingCount: count || 0,
        estimatedWaitTime: (count || 0) * 5
      })
    }
  }

  const joinQueue = async () => {
    if (!phoneNumber || !selectedDepartment) return

    setLoading(true)
    try {
      // Get or create queue settings for this department
      let { data: queueSettings, error: settingsError } = await supabase
        .from('queue_settings')
        .select('*')
        .eq('department_id', selectedDepartment)
        .single()

      if (settingsError || !queueSettings) {
        // Create queue settings if it doesn't exist
        const { data: newSettings, error: createError } = await supabase
          .from('queue_settings')
          .insert({
            department_id: selectedDepartment,
            current_serving: null,
            last_ticket_number: 0
          })
          .select()
          .single()
        
        if (createError) {
          console.error('Error creating queue settings:', createError)
          throw createError
        }
        queueSettings = newSettings
      }

      const department = departments.find(d => d.id === selectedDepartment)
      const departmentPrefix = department?.name.substring(0, 2).toUpperCase() || 'AA'
      
      // Extract numeric part from last ticket number (e.g., "BA003" -> 3)
      let lastNumber = 0
      if (queueSettings?.last_ticket_number && queueSettings.last_ticket_number !== '0') {
        const match = queueSettings.last_ticket_number.match(/\d+/)
        if (match) {
          lastNumber = parseInt(match[0])
        }
      }
      
      const newTicketNumber = lastNumber + 1
      const ticketId = `${departmentPrefix}${newTicketNumber.toString().padStart(3, '0')}`
      
      // Create ticket
      const { error } = await supabase
        .from('tickets')
        .insert({
          department_id: selectedDepartment,
          ticket_number: ticketId,
          customer_phone: phoneNumber,
          status: 'waiting'
        })

      if (!error) {
        // Update queue settings with new last ticket number
        await supabase
          .from('queue_settings')
          .update({ last_ticket_number: ticketId })
          .eq('department_id', selectedDepartment)

        setTicketNumber(ticketId)
        setStep(4) // Show confirmation
        
        // Try to send push notification first, fallback to WhatsApp if needed
        const department = departments.find(d => d.id === selectedDepartment)
        if (department && organization) {
          let pushSent = false
          
          // Try push notification if enabled
          if (pushNotificationsEnabled && orgId) {
            try {
              pushSent = await queueNotificationHelper.sendTicketCreatedNotification({
                organizationId: orgId,
                customerPhone: phoneNumber,
                ticketNumber: ticketId,
                departmentName: department.name,
                organizationName: organization.name,
                organizationLogo: organization.logo_url || undefined,
                organizationColor: organization.primary_color || undefined,
                waitingCount: queueStatus?.waitingCount || 0
              })
              
            } catch (error) {
              console.error('Push notification failed:', error)
            }
          }
          
          // Send WhatsApp notification (either as fallback or primary)
          if (!pushSent || !pushNotificationsEnabled) {
            await notificationService.notifyTicketCreated(
              phoneNumber,
              ticketId,
              department.name,
              organization.name,
              queueStatus?.waitingCount || 0
            )
          }
        }
        
      } else {
        console.error('Error creating ticket:', error)
        throw error
      }
    } catch (error) {
      console.error('Error joining queue:', error)
    } finally {
      setLoading(false)
    }
  }

  // Enable push notifications
  const enablePushNotifications = async () => {
    setPushSubscriptionLoading(true)

    if (!phoneNumber) {
      console.error('Phone number is required for push notifications')
      setPushSubscriptionLoading(false)
      return
    }

    if (!orgId) {
      console.error('Organization ID is required for push notifications')
      setPushSubscriptionLoading(false)
      return
    }

    try {
      console.log('Attempting to enable push notifications for:', {
        platform: browserInfo?.platform,
        browser: browserInfo?.browser,
        supportLevel: browserInfo?.supportLevel
      })

      // For iOS Safari, add a small delay to ensure user interaction is processed
      if (browserInfo?.platform === 'iOS' && browserInfo?.browser === 'Safari') {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Ensure this is triggered by user interaction
      const success = await pushNotificationService.subscribe(orgId, phoneNumber)

      if (success) {
        setPushNotificationsEnabled(true)
        setShowPushPrompt(false)
        console.log('Push notifications enabled successfully')
      } else {
        console.log('Push notification permission denied or failed')
        // Still hide the prompt even if denied, so user can proceed
        setShowPushPrompt(false)
      }
    } catch (error) {
      console.error('Error enabling push notifications:', error)
      // Hide prompt on error so user can proceed
      setShowPushPrompt(false)
    } finally {
      setPushSubscriptionLoading(false)
    }
  }  // Dismiss push notification prompt
  const dismissPushPrompt = () => {
    setShowPushPrompt(false)
  }

  const handleContinue = async () => {
    if (step === 1 && phoneNumber) {
      // Initialize push notifications only when user tries to continue after entering phone
      if (pushNotificationsSupported && !pushNotificationsEnabled) {
        // Initialize the push notification service without requesting permission yet
        try {
          const initialized = await pushNotificationService.initialize()
          if (initialized) {
            const permission = pushNotificationService.getPermissionStatus()
            console.log('Current permission status:', permission)
            setPushNotificationsEnabled(permission === 'granted')
            
            // Only show prompt if permission is default (not granted or denied)
            if (permission === 'default') {
              setShowPushPrompt(true)
            }
          }
        } catch (error) {
          console.error('Error initializing push notifications:', error)
        }
      }
      
      if (branchId) {
        setStep(3) // Skip branch selection if branch is pre-selected
      } else {
        setStep(2)
      }
    } else if (step === 2 && selectedBranch) {
      setStep(3)
    } else if (step === 3 && selectedDepartment) {
      joinQueue()
    }
  }

  const brandColor = organization?.primary_color || '#3b82f6'

  return (
    <DynamicTheme brandColor={brandColor}>
      <div className="container mx-auto px-4 py-8 max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-white/40 rounded-xl flex items-center justify-center p-1">
              {organization?.logo_url ? (
                <img 
                  src={organization.logo_url} 
                  alt={organization.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img 
                  src="/logo_s.png" 
                  alt="Smart Queue Logo"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <h1 className="text-xl font-bold text-white">
              {organization?.name || 'Smart Queue'}
            </h1>
          </div>
        </div>

        {/* Progress Steps */}
        {step < 4 && (
          <div className="flex justify-center space-x-4 mb-8">
            <div className={`step-indicator ${step >= 1 ? 'step-active' : 'step-inactive'}`}>1</div>
            {!branchId && (
              <div className={`step-indicator ${step >= 2 ? 'step-active' : 'step-inactive'}`}>2</div>
            )}
            <div className={`step-indicator ${step >= (branchId ? 2 : 3) ? 'step-active' : 'step-inactive'}`}>
              {branchId ? '2' : '3'}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="space-y-6">
          {/* Welcome Message */}
          <div className="card p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              Welcome to {organization?.name || 'our queue system'}
            </h2>
            <p className="text-gray-600 mb-4">
              {organization?.welcome_message || 
               'Welcome to our smart queue system. Please take your number and wait for your turn.'}
            </p>
          </div>

          {/* Step 1: Phone Number */}
          {step === 1 && (
            <div className="card p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="step-indicator step-active">1</div>
                  <h3 className="text-lg font-semibold text-gray-900">Phone</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {!branchId && (
                      <>
                        <span>2</span>
                        <span>Branch</span>
                        <span>3</span>
                      </>
                    )}
                    {branchId && (
                      <>
                        <span>2</span>
                      </>
                    )}
                    <span>Service</span>
                  </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  Enter Your Phone Number
                </h4>
                <p className="text-gray-600">
                  We'll send your queue updates via {pushNotificationsSupported ? 'notifications and WhatsApp' : 'WhatsApp'}
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="input-field text-gray-900"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <button
                  onClick={handleContinue}
                  disabled={!phoneNumber}
                  className="w-full dynamic-button text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Branch Selection */}
          {step === 2 && (
            <div className="card p-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  Select Branch
                </h4>

                <div className="space-y-3">
                  {branches.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setSelectedBranch(branch.id)
                        // Update stored parameters when user selects a branch
                        URLPersistenceService.updateStoredParams(orgId, branch.id)
                        setStep(3)
                      }}
                      className="w-full p-4 border border-gray-200 rounded-xl text-left hover:border-primary-500 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="font-medium text-gray-900">{branch.name}</h5>
                          {branch.address && (
                            <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                              <MapPin className="w-3 h-3" />
                              <span>{branch.address}</span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Department Selection */}
          {step === 3 && (
            <div className="card p-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">
                  Select Service
                </h4>

                <div className="space-y-3">
                  {departments.map((department) => (
                    <button
                      key={department.id}
                      onClick={() => setSelectedDepartment(department.id)}
                      className={`w-full p-4 border rounded-xl text-left transition-colors ${
                        selectedDepartment === department.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold dynamic-icon-bg"
                          >
                            {department.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{department.name}</span>
                        </div>
                        {selectedDepartment === department.id && (
                          <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedDepartment && queueStatus && (
                  <div className="bg-gray-50 rounded-xl p-4 mt-6">
                    <h5 className="font-medium text-gray-900 mb-3">Current Queue Status</h5>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {queueStatus.currentServing || '--'}
                        </div>
                        <div className="text-xs text-gray-500">Now Serving</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {queueStatus.waitingCount}
                        </div>
                        <div className="text-xs text-gray-500">Waiting</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {queueStatus.estimatedWaitTime}m
                        </div>
                        <div className="text-xs text-gray-500">Est. Wait</div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleContinue}
                  disabled={!selectedDepartment || loading}
                  className="w-full dynamic-button text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? 'Joining Queue...' : 'Join Queue'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="card p-6 text-center">
              <div className="space-y-6">
                <div>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Phone className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    You're in the {departments.find(d => d.id === selectedDepartment)?.name || 'Queue'} Queue!
                  </h3>
                  <p className="text-gray-600">
                    Your ticket number is
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {ticketNumber}
                  </div>
                  <p className="text-gray-600">
                    We've sent you a WhatsApp message with your ticket details
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Currently Serving</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {queueStatus?.currentServing || '--'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Estimated Wait</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {queueStatus?.estimatedWaitTime || 0} minutes
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Need help? Contact us:
                </p>
                <div className="flex justify-center space-x-4">
                  <button className="text-sm text-primary-600 underline">
                    📞 +1234567890
                  </button>
                  <button className="text-sm text-primary-600 underline">
                    ✉️ Email us
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Browser Compatibility Warning */}
          {showBrowserWarning && browserInfo && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    {browserInfo.isSupported ? (
                      <Info className="w-8 h-8 text-amber-600" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-amber-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {browserInfo.isSupported ? 'Limited Notification Support' : 'Notifications Not Supported'}
                  </h3>
                  <div className="text-left space-y-2">
                    <p className="text-sm text-gray-600">
                      <strong>Platform:</strong> {browserInfo.platform}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Browser:</strong> {browserInfo.browser}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Support Level:</strong> {browserInfo.supportLevel}
                    </p>
                    {browserInfo.limitations.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Limitations:</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {browserInfo.limitations.map((limitation, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-amber-500 mr-1">•</span>
                              {limitation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      {BrowserDetection.getRecommendation(browserInfo)}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {browserInfo.isSupported && (
                      <button
                        onClick={() => {
                          setShowBrowserWarning(false)
                          setShowPushPrompt(true)
                        }}
                        className="w-full dynamic-button text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200"
                      >
                        Continue with Limited Support
                      </button>
                    )}
                    <button
                      onClick={() => setShowBrowserWarning(false)}
                      className="w-full text-gray-600 font-medium py-3 px-6 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                    >
                      I Understand
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Push Notification Prompt */}
          {showPushPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Enable Notifications?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Get instant notifications when it's almost your turn and when you're called, even when the app is closed.
                  </p>
                  {browserInfo && browserInfo.platform === 'iOS' && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>iOS Safari:</strong> After clicking "Enable", you'll see a browser permission popup. Make sure to tap "Allow" to receive notifications.
                      </p>
                    </div>
                  )}
                  {browserInfo && browserInfo.platform === 'Windows' && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Windows:</strong> Your browser will ask for notification permission. Click "Allow" in the popup that appears.
                      </p>
                    </div>
                  )}
                  <div className="space-y-3">
                    <button
                      onClick={enablePushNotifications}
                      disabled={pushSubscriptionLoading}
                      className="w-full dynamic-button text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pushSubscriptionLoading ? (
                        <>
                          <div className="w-4 h-4 mr-2 inline-block border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 mr-2 inline" />
                          Enable Notifications
                        </>
                      )}
                    </button>
                    <button
                      onClick={dismissPushPrompt}
                      className="w-full text-gray-600 font-medium py-3 px-6 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <BellOff className="w-4 h-4 mr-2 inline" />
                      Use WhatsApp Only
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    You can change this anytime in your browser settings
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* PWA Install Helper */}
      {orgId && (
        <PWAInstallHelper 
          orgId={orgId}
          branchId={selectedBranch}
          organizationName={organization?.name}
          organizationLogo={organization?.logo_url || undefined}
        />
      )}
    </DynamicTheme>
  )
}

export default function CustomerApp() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>}>
      <CustomerAppContent />
    </Suspense>
  )
}
