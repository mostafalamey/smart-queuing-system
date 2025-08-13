'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Building2, Users, CheckCircle, X } from 'lucide-react'

function AcceptInvitationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [invitationData, setInvitationData] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    // Use a flag to prevent issues
    let isMounted = true;
    
    const initializeInvitation = async () => {
      if (!isMounted) return;
      // Debug log removed
      await handleInvitationAcceptance()
    }
    
    initializeInvitation()
    
    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      // Don't timeout for test tokens
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      
      if (loading && isMounted && token !== 'test') {
        // Debug log removed
        setLoading(false)
        setError('Loading timeout - please check console for errors')
      }
    }, 10000) // 10 second timeout
    
    return () => {
      isMounted = false;
      clearTimeout(timeout)
    }
  }, []) // Remove searchParams dependency to prevent re-execution

  const handleInvitationAcceptance = async () => {
    // Debug log removed
    setLoading(true)
    
    try {
      // Debug log removed
      
      // Get the token from URL (sent by Supabase in the invitation email)
      const token = searchParams.get('token')
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      // Handle test token FIRST (before trying to get user session)
      const invitationToken = token || tokenHash
      if (type === 'invite' && invitationToken === 'test') {
        // Debug log removed
        setInvitationData({
          email: 'test@example.com',
          organizationName: 'Test Organization',
          role: 'employee',
          organizationId: 'test-org-id'
        })
        setLoading(false)
        return
      }

      // For real tokens, check if user is already authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      // Debug log removed
      // Debug log removed
      
      if (user && user.user_metadata && user.user_metadata.invitation_type === 'member') {
        // User is already verified through invitation, get data from user metadata
        const metadata = user.user_metadata
        // Debug log removed
        
        setInvitationData({
          email: user.email || '',
          organizationName: metadata.organization_name || 'Organization',
          role: metadata.role || 'employee',
          organizationId: metadata.organization_id || ''
        })
        setLoading(false)
        return
      }

      // If no authenticated user with invitation metadata, try manual token verification
      if (type === 'invite' && invitationToken) {
        // Debug log removed
        
        // Verify the invitation token with Supabase
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: invitationToken,
          type: 'invite'
        })

        if (error) {
          throw error
        }

        if (data.user) {
          // Get invitation metadata
          const metadata = data.user.user_metadata
          setInvitationData({
            email: data.user.email,
            organizationName: metadata.organization_name,
            role: metadata.role,
            organizationId: metadata.organization_id
          })
        }
      } else {
        // If no token but user is authenticated, check if they have an invitation metadata
        if (user) {
          // Debug log removed
          
          // Try to find pending member record
          const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select('*, organizations(name)')
            .eq('email', user.email)
            .eq('is_active', false)
            .single()
          
          if (memberData && !memberError) {
            // Debug log removed
            setInvitationData({
              email: user.email || '',
              organizationName: memberData.organizations?.name || 'Organization',
              role: memberData.role || 'employee',
              organizationId: memberData.organization_id || ''
            })
            setLoading(false)
            return
          }
        }
        
        throw new Error('Invalid invitation link')
      }
    } catch (error: any) {
      // Debug log removed
      setError(error.message || 'Invalid or expired invitation link')
    } finally {
      setLoading(false)
    }
  }

  const completeRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Handle test token differently
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      
      if (token === 'test') {
        // For test token, just simulate success
        // Debug log removed
        setSuccess(true)
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
        return
      }

      // For real tokens, update the user's password and name
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
        data: {
          name: formData.name
        }
      })

      if (updateError) throw updateError

      // Activate the member record
      const { error: memberError } = await supabase
        .from('members')
        .update({
          name: formData.name,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', invitationData.email)
        .eq('organization_id', invitationData.organizationId)

      if (memberError) {
        // Debug log removed
        // Continue anyway - user account is created
      }

      setSuccess(true)
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error: any) {
      // Debug log removed
      setError(error.message || 'Failed to complete registration')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="btn-primary"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Welcome to the Team!</h1>
          <p className="text-gray-600 mb-4">Your account has been created successfully. Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Registration</h1>
          <p className="text-gray-600 mt-2">
            You've been invited to join <strong>{invitationData?.organizationName}</strong> as a <strong>{invitationData?.role}</strong>
          </p>
        </div>

        <form onSubmit={completeRegistration} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={invitationData?.email || ''}
              className="input-field bg-gray-50"
              disabled
              aria-label="Your email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input-field"
              placeholder="Create a password"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="input-field"
              placeholder="Confirm your password"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>}>
      <AcceptInvitationContent />
    </Suspense>
  )
}
