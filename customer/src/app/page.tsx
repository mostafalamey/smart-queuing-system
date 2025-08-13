'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-fixed'
import { DynamicTheme } from '@/components/DynamicTheme'
import { notificationService } from '@/lib/notifications'
import { Phone, ChevronRight, MapPin, Users, Clock } from 'lucide-react'

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
  const orgId = searchParams.get('org')
  const branchId = searchParams.get('branch')

  const [step, setStep] = useState(1) // 1: Phone, 2: Branch, 3: Service
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null)
  const [ticketNumber, setTicketNumber] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (orgId) {
      fetchOrganization()
      fetchBranches()
    }
  }, [orgId])

  useEffect(() => {
    if (branchId) {
      setSelectedBranch(branchId)
      // Don't change step - keep at step 1 for phone number entry
      // The branch is just pre-selected for later use
    }
  }, [branchId])

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

  const fetchOrganization = async () => {
    if (!orgId) return;
    
    console.log('Fetching organization:', orgId);
    
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
      
      console.log('Organization fetched:', data);
      setOrganization(data)
    } catch (error) {
      console.error('Exception fetching organization:', error);
    }
  }

  const fetchBranches = async () => {
    if (!orgId) return;
    
    console.log('Fetching branches for organization:', orgId);
    
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
      
      console.log('Branches fetched:', data);
      setBranches(data || [])
    } catch (error) {
      console.error('Exception fetching branches:', error);
      setBranches([]);
    }
  }

  const fetchDepartments = async () => {
    if (!selectedBranch) return;
    
    console.log('Fetching departments for branch:', selectedBranch);
    
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
      
      console.log('Departments fetched:', data);
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
        console.log('Queue settings not found, creating new one...')
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
        
        // Send WhatsApp notification
        const department = departments.find(d => d.id === selectedDepartment)
        if (department && organization) {
          await notificationService.notifyTicketCreated(
            phoneNumber,
            ticketId,
            department.name,
            organization.name,
            queueStatus?.waitingCount || 0
          )
        }
        
        console.log('Ticket created:', ticketId)
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

  const handleContinue = () => {
    if (step === 1 && phoneNumber) {
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
            <p className="text-gray-600">
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
                  We'll send your queue ticket via WhatsApp
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
        </div>
      </div>
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
