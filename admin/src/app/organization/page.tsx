'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Building2, QrCode, Users, Download, Share, Copy, Upload, X } from 'lucide-react'
import QRCode from 'qrcode'
import { ColorPreview } from '@/components/ColorPreview'
import { useAppToast } from '@/hooks/useAppToast'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

export default function OrganizationPage() {
  const { userProfile } = useAuth()
  const { showSuccess, showError, showWarning, showInfo } = useAppToast()
  const [activeTab, setActiveTab] = useState('details')
  const [activeQrTab, setActiveQrTab] = useState('general')
  const [organization, setOrganization] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [branchQrCodes, setBranchQrCodes] = useState<{[key: string]: string}>({})
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('employee')
  const [inviting, setInviting] = useState(false)
  const [testMode, setTestMode] = useState(false)

  const [orgForm, setOrgForm] = useState({
    name: '',
    contact_email: '',
    phone: '',
    website: '',
    address: '',
    primary_color: '#3b82f6',
    welcome_message: '',
    logo_url: ''
  })

  useEffect(() => {
    if (userProfile?.organization_id) {
      fetchOrganization()
      fetchMembers()
      fetchBranches()
      generateQRCode()
    }
  }, [userProfile])

  const fetchOrganization = async () => {
    if (!userProfile?.organization_id) return;
    
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userProfile.organization_id)
      .single()
    
    if (data) {
      setOrganization(data)
      setOrgForm({
        name: data.name || '',
        contact_email: data.contact_email || '',
        phone: data.phone || '',
        website: data.website || '',
        address: data.address || '',
        primary_color: data.primary_color || '#3b82f6',
        welcome_message: data.welcome_message || '',
        logo_url: data.logo_url || ''
      })
    }
  }

  const fetchMembers = async () => {
    if (!userProfile?.organization_id) return;
    
    const { data } = await supabase
      .from('members')
      .select(`
        *,
        organizations(*)
      `)
      .eq('organization_id', userProfile.organization_id)
    
    setMembers(data || [])
  }

  const fetchBranches = async () => {
    if (!userProfile?.organization_id) return;
    
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('organization_id', userProfile.organization_id)
      .order('name')
    
    setBranches(data || [])
    
    // Generate QR codes for each branch
    if (data && data.length > 0) {
      const qrCodes: {[key: string]: string} = {}
      for (const branch of data) {
        try {
          const response = await fetch('/api/generate-qr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              organizationId: userProfile.organization_id,
              branchId: branch.id,
              organizationName: organization?.name || 'Organization'
            })
          })

          const qrData = await response.json()
          if (qrData.success) {
            qrCodes[branch.id] = qrData.qrCodeDataURL
          }
        } catch (error) {
          console.error('Error generating branch QR code:', error)
        }
      }
      setBranchQrCodes(qrCodes)
    }
  }

  const generateQRCode = async () => {
    if (!userProfile?.organization_id || !organization?.name) return;
    
    try {
      const response = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: userProfile.organization_id,
          organizationName: organization.name
        })
      })

      const data = await response.json()
      if (data.success) {
        setQrCodeUrl(data.qrCodeDataURL)
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const updateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userProfile?.organization_id) return;
    
    setLoading(true)

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          ...orgForm,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.organization_id)

      if (!error) {
        await fetchOrganization()
        showSuccess(
          'Organization Updated!',
          'Your organization details have been saved successfully.'
        )
      } else {
        showError(
          'Update Failed',
          'Unable to update organization details. Please try again.'
        )
      }
    } catch (error) {
      showError(
        'Update Error',
        'An unexpected error occurred while updating the organization.'
      )
    } finally {
      setLoading(false)
    }
  }

  const uploadLogo = async (file: File) => {
    if (!userProfile?.organization_id) return;

    setUploading(true)
    try {
      // Check if user has admin or manager role
      if (!userProfile.role || !['admin', 'manager'].includes(userProfile.role)) {
        throw new Error(`Access denied. Your role (${userProfile.role}) does not have permission to upload logos. Admin or manager role required.`);
      }

      // Create filename that matches the existing policy structure
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const fileName = `${userProfile.organization_id}/${userProfile.organization_id}-logo-${timestamp}.${fileExt}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        // Handle error silently
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(fileName)

      // Update organization with new logo URL
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          logo_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.organization_id)

      if (updateError) throw updateError

      // Update local state
      setOrgForm(prev => ({ ...prev, logo_url: publicUrl }))
      await fetchOrganization()
      
      showSuccess(
        'Logo Uploaded!',
        'Your organization logo has been updated successfully.'
      )
    } catch (error: any) {
      // Handle error silently
      if (error?.message?.includes('row-level security policy')) {
        showError(
          'Storage Access Denied',
          'Please check if you have admin or manager role.',
          {
            label: 'Contact Admin',
            onClick: () => setActiveTab('members')
          }
        )
      } else if (error?.message?.includes('duplicate') || error?.statusCode === 409) {
        showSuccess(
          'Logo Updated!',
          'Your logo file was updated successfully.'
        )
        // Refresh the data even if there was a "duplicate" error
        await fetchOrganization()
      } else {
        showError(
          'Upload Failed',
          `Error uploading logo: ${error?.message || 'Please try again.'}`,
          {
            label: 'Try Again',
            onClick: () => document.getElementById('logo-upload')?.click()
          }
        )
      }
    } finally {
      setUploading(false)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showWarning(
        'Invalid File Type',
        'Please select an image file (PNG, JPG, GIF, etc.)',
        {
          label: 'Choose File',
          onClick: () => document.getElementById('logo-upload')?.click()
        }
      )
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      showWarning(
        'File Too Large',
        'File size must be less than 10MB. Please choose a smaller image.',
        {
          label: 'Choose Another',
          onClick: () => document.getElementById('logo-upload')?.click()
        }
      )
      return
    }

    uploadLogo(file)
  }

  const removeLogo = async () => {
    if (!userProfile?.organization_id || !orgForm.logo_url) return;

    setUploading(true)
    try {
      // Extract the file path from the URL
      const url = new URL(orgForm.logo_url)
      const pathParts = url.pathname.split('/')
      const fileName = pathParts[pathParts.length - 1]
      const filePath = `${userProfile.organization_id}/${fileName}`

      // Try to delete the file from storage
      const { error: deleteError } = await supabase.storage
        .from('organization-logos')
        .remove([filePath])

      // Continue even if file deletion fails (file might not exist)
      if (deleteError) {
        // Warning removed
      }

      // Update organization to remove logo URL
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          logo_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.organization_id)

      if (updateError) throw updateError

      setOrgForm(prev => ({ ...prev, logo_url: '' }))
      await fetchOrganization()
      
      showSuccess(
        'Logo Removed!',
        'Your organization logo has been removed successfully.'
      )
    } catch (error: any) {
      showError(
        'Removal Failed',
        `Error removing logo: ${error?.message || 'Please try again.'}`,
        {
          label: 'Try Again',
          onClick: () => removeLogo()
        }
      )
    } finally {
      setUploading(false)
    }
  }

  const downloadQR = () => {
    const link = document.createElement('a')
    link.download = `${organization?.name || 'organization'}-qr-code.png`
    link.href = qrCodeUrl
    link.click()
  }

  const copyQRUrl = async () => {
    if (!userProfile?.organization_id) return;
    
    const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'
    const url = `${customerUrl}?org=${userProfile.organization_id}`
    await navigator.clipboard.writeText(url)
    
    showSuccess(
      'URL Copied!',
      'Customer queue URL has been copied to your clipboard.',
      {
        label: 'Test URL',
        onClick: () => window.open(url, '_blank')
      }
    )
  }

  const downloadBranchQR = (branchId: string, branchName: string) => {
    const qrCode = branchQrCodes[branchId]
    if (!qrCode) {
      showError('Download Failed', 'QR code not available. Please generate it first.')
      return
    }
    
    const link = document.createElement('a')
    link.download = `${branchName}-qr-code.png`
    link.href = qrCode
    link.click()
    
    showSuccess(
      'QR Code Downloaded!',
      `${branchName} QR code has been saved to your device.`
    )
  }

  const copyBranchQRUrl = async (branchId: string, branchName?: string) => {
    if (!userProfile?.organization_id) return;
    
    try {
      const customerUrl = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'
      const url = `${customerUrl}?org=${userProfile.organization_id}&branch=${branchId}`
      await navigator.clipboard.writeText(url)
      
      showSuccess(
        'Branch URL Copied!',
        `${branchName || 'Branch'} queue URL has been copied to your clipboard.`,
        {
          label: 'Test URL',
          onClick: () => window.open(url, '_blank')
        }
      )
    } catch (error) {
      showError('Copy Failed', 'Unable to copy URL to clipboard.')
    }
  }

  const updateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', memberId)

      if (error) throw error

      // Update local state
      setMembers(members.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      ))
      
      showSuccess(
        'Role Updated!',
        `Member role has been changed to ${newRole}.`
      )
    } catch (error) {
      showError(
        'Update Failed',
        'Failed to update member role. Please try again.',
        {
          label: 'Retry',
          onClick: () => updateMemberRole(memberId, newRole)
        }
      )
    }
  }

  const updateMemberBranch = async (memberId: string, branchId: string | null) => {
    try {
      const { error } = await supabase
        .from('members')
        .update({ branch_id: branchId, updated_at: new Date().toISOString() })
        .eq('id', memberId)

      if (error) throw error

      // Update local state
      setMembers(members.map(member => 
        member.id === memberId ? { ...member, branch_id: branchId } : member
      ))
      
      const branchName = branches.find(b => b.id === branchId)?.name || 'None'
      showSuccess(
        'Branch Assignment Updated!',
        `Member has been assigned to ${branchName}.`
      )
    } catch (error) {
      showError(
        'Assignment Failed',
        'Failed to update member branch assignment.',
        {
          label: 'Try Again',
          onClick: () => updateMemberBranch(memberId, branchId)
        }
      )
    }
  }

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

      // Update local state
      setMembers(members.filter(member => member.id !== memberId))
      
      showSuccess(
        'Member Removed!',
        'The member has been successfully removed from your organization.'
      )
    } catch (error) {
      showError(
        'Removal Failed',
        'Failed to remove member. Please try again.',
        {
          label: 'Try Again',
          onClick: () => removeMember(memberId)
        }
      )
    }
  }

  const inviteMember = async () => {
    if (!inviteEmail.trim()) {
      showWarning('Email Required', 'Please enter an email address to send an invitation.')
      return
    }

    setInviting(true)
    try {
      // Check if user already exists in the system
      const { data: existingUser, error: userError } = await supabase
        .from('members')
        .select('*')
        .eq('email', inviteEmail.trim())
        .eq('organization_id', userProfile?.organization_id)

      if (existingUser && existingUser.length > 0) {
        showWarning(
          'Member Already Exists',
          'This user is already a member of your organization.',
          {
            label: 'View Members',
            onClick: () => setActiveTab('members')
          }
        )
        return
      }

      // Use the server-side API route for invitations
      const response = await fetch('/api/invite-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          organizationId: userProfile?.organization_id,
          organizationName: organization?.name || 'Smart Queue Organization',
          testMode: testMode
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation')
      }

      if (testMode) {
        showInfo(
          'Test Invitation Created!',
          'Member record has been added to the database for testing.',
          {
            label: 'View Members',
            onClick: () => setActiveTab('members')
          }
        )
      } else {
        showSuccess(
          'Invitation Sent!',
          `An invitation has been sent to ${inviteEmail.trim()}.`,
          {
            label: 'Send Another',
            onClick: () => setInviteEmail('')
          }
        )
      }

      // Refresh members list
      await fetchMembers()
      
      // Reset form
      setInviteEmail('')
      setInviteRole('employee')
      setShowInviteModal(false)
      
    } catch (error) {
      showError(
        'Invitation Failed',
        `Unable to send invitation: ${(error as any)?.message}`,
        {
          label: 'Try Again',
          onClick: () => {} // Keep modal open for retry
        }
      )
    } finally {
      setInviting(false)
    }
  }

  const tabs = [
    { id: 'details', name: 'Organization Details', icon: Building2 },
    { id: 'qr-codes', name: 'QR Codes', icon: QrCode },
    { id: 'members', name: 'Members & Invitations', icon: Users },
  ]

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Enhanced Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-french-blue-500 via-celestial-500 to-french-blue-600 rounded-2xl p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative flex items-center space-x-6">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-sm"></div>
              <div className="relative w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                <Building2 className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Organization Management</h1>
              <p className="text-white/80 text-lg">Configure settings for {organization?.name || 'your organization'}</p>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs with Modern Design */}
        <div className="relative">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
          <nav className="relative flex space-x-1 bg-gray-50/50 rounded-xl p-1 backdrop-blur-sm border border-gray-200/60">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button group relative flex-1 py-3 px-6 font-medium text-sm transition-all duration-300 rounded-lg overflow-hidden ${
                  activeTab === tab.id
                    ? 'bg-white text-celestial-600 shadow-lg border border-gray-200/60'
                    : 'text-gray-600 hover:text-celestial-600 hover:bg-white/60'
                } slide-in-left animation-delay-${index}`}
              >
                {activeTab === tab.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-celestial-50 to-french-blue-50 opacity-50"></div>
                )}
                <div className="relative flex items-center justify-center space-x-2">
                  <tab.icon className={`w-4 h-4 transition-transform duration-200 ${
                    activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'
                  }`} />
                  <span>{tab.name}</span>
                </div>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-celestial-500 to-french-blue-500 rounded-full"></div>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="tab-content fade-in">
          {activeTab === 'details' && (
          <div className="space-y-8">
            {/* Enhanced Basic Information */}
            <div className="relative p-2 space-y-8 overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 to-indigo-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative p-8">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-french-blue-400 to-celestial-500 rounded-xl blur-sm opacity-70"></div>
                    <div className="relative w-12 h-12 bg-gradient-to-br from-french-blue-500 to-celestial-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Building2 className="w-6 h-6 text-french-500" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
                    <p className="text-gray-600">Essential details about your organization</p>
                  </div>
                </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={orgForm.name}
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                      className="input-field"
                      placeholder="Enter organization name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={orgForm.contact_email}
                      onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                      className="input-field"
                      placeholder="admin@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={orgForm.phone}
                      onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })}
                      className="input-field"
                      placeholder="+1234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={orgForm.website}
                      onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                      className="input-field"
                      placeholder="https://company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    value={orgForm.address}
                    onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                    className="input-field"
                    rows={3}
                    placeholder="Enter organization address"
                  />
                </div>
              </div>
            </div>

            {/* Branding */}
            <div className="card p-6">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-5 h-5 bg-purple-500 rounded"></div>
                <h2 className="text-lg font-semibold">Branding</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Color
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    This is the primary color for the customer app
                  </p>
                  <div className="flex items-center space-x-4">
                    <ColorPreview color={orgForm.primary_color} />
                    <input
                      type="color"
                      value={orgForm.primary_color}
                      onChange={(e) => setOrgForm({ ...orgForm, primary_color: e.target.value })}
                      className="w-16 h-8 rounded border border-gray-300"
                      title="Brand color picker"
                    />
                    <span className="text-sm font-mono text-gray-600">
                      {orgForm.primary_color}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Logo
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Upload your organization's logo for branding
                  </p>
                  <div className="flex items-center space-x-4">
                    {/* Logo Preview */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 relative">
                      {orgForm.logo_url ? (
                        <>
                          <img
                            src={orgForm.logo_url}
                            alt="Organization Logo"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            onClick={removeLogo}
                            disabled={uploading}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                            title="Remove logo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-orange-500 rounded"></div>
                      )}
                    </div>
                    
                    {/* Upload Controls */}
                    <div className="flex-1">
                      <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center space-x-2 disabled:opacity-50">
                        <Upload className="w-4 h-4" />
                        <span>{uploading ? 'Uploading...' : orgForm.logo_url ? 'Change Logo' : 'Upload Logo'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleLogoUpload}
                          disabled={uploading}
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, SVG - max 10MB. Recommended size: 200x200px
                      </p>
                      {orgForm.logo_url && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Logo uploaded successfully
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Experience */}
            <div className="card p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Users className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold">Customer Experience</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  This message will be displayed to customers when they first access the queue system
                </p>
                <textarea
                  value={orgForm.welcome_message}
                  onChange={(e) => setOrgForm({ ...orgForm, welcome_message: e.target.value })}
                  className="input-field"
                  rows={4}
                  placeholder="Welcome to our smart queue system. Please take your number and wait for your turn."
                />
              </div>
            </div>

            {/* Save Changes Button - Single button at bottom */}
            <div className="flex justify-end p-6">
              <button
                onClick={updateOrganization}
                disabled={loading || uploading}
                className="btn-primary px-8 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'qr-codes' && (
          <div className="card p-6">
            <div className="flex items-center space-x-2 mb-6">
              <QrCode className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold">QR Codes for Customer Access</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Generate QR codes that customers can scan to access your queue system
            </p>

            {/* QR Code Tabs */}
            <div className="flex space-x-1 mb-6">
              <button
                onClick={() => setActiveQrTab('general')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeQrTab === 'general'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                General Access
              </button>
              <button
                onClick={() => setActiveQrTab('branch')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeQrTab === 'branch'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Branch-Specific ({branches.length})
              </button>
            </div>

            {/* General Access Tab */}
            {activeQrTab === 'general' && (
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">General Access QR Code</h3>
                <p className="text-blue-700 mb-4">
                  This QR code allows customers to access {organization?.name || 'your organization'} and choose from all available branches. Perfect when branches are within the same location.
                </p>

                <div className="text-center">
                  {qrCodeUrl && (
                    <img
                      src={qrCodeUrl}
                      alt="General Access QR Code"
                      className="mx-auto mb-4 border border-gray-200 rounded"
                    />
                  )}
                  
                  <div className="flex justify-center space-x-2">
                    <button
                      onClick={downloadQR}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                      <Share className="w-4 h-4" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={copyQRUrl}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copy URL</span>
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-white rounded border">
                    <p className="text-xs text-gray-500 break-all">
                      {typeof window !== 'undefined' && `${process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'}?org=${userProfile?.organization_id}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Branch-Specific Tab */}
            {activeQrTab === 'branch' && (
              <div>
                {branches.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Branches Available</h3>
                    <p className="text-gray-600 mb-4">
                      Create branches in the Manage section to generate branch-specific QR codes
                    </p>
                    <button 
                      onClick={() => setActiveTab('manage')}
                      className="btn-primary"
                    >
                      Go to Manage Section
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branches.map((branch) => (
                      <div key={branch.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-gray-900">{branch.name}</h4>
                        </div>
                        
                        {branch.address && (
                          <p className="text-sm text-gray-600 mb-4">{branch.address}</p>
                        )}

                        <div className="text-center">
                          {branchQrCodes[branch.id] && (
                            <img
                              src={branchQrCodes[branch.id]}
                              alt={`QR Code for ${branch.name}`}
                              className="mx-auto mb-4 border border-gray-200 rounded w-[150px] h-[150px]"
                            />
                          )}
                          
                          <div className="flex flex-col space-y-2">
                            <div className="flex space-x-2 justify-center">
                              <button
                                onClick={() => downloadBranchQR(branch.id, branch.name)}
                                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </button>
                              <button
                                onClick={() => copyBranchQRUrl(branch.id)}
                                className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy URL</span>
                              </button>
                            </div>
                            
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-500 break-all">
                              {typeof window !== 'undefined' && `${process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3002'}?org=${userProfile?.organization_id}&branch=${branch.id}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold">Organization Members ({members.length})</h2>
              </div>
              <button 
                onClick={() => setShowInviteModal(true)}
                className="btn-primary"
              >
                <Users className="w-4 h-4 mr-2" />
                Invite Member
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Manage member roles, assignments to branches and departments
            </p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Member</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Branch Assignment</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Department Assignment</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">
                                {member.name || 'Unknown'}
                              </p>
                              {!member.is_active && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value)}
                          className="input-field text-sm"
                          aria-label="Member role"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="employee">Employee</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={member.branch_id || ''}
                          onChange={(e) => updateMemberBranch(member.id, e.target.value || null)}
                          className="input-field text-sm"
                          aria-label="Branch assignment"
                        >
                          <option value="">No Branch</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-teal-500" />
                          <span className="text-sm text-gray-600">
                            {member.department_ids ? 'Assigned Departments' : 'No Department'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {new Date(member.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => removeMember(member.id)}
                            className="text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Invite New Member</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                  placeholder="Enter email address"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input-field"
                  aria-label="Select role for new member"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">
                  Test mode (skip email sending, avoid rate limits)
                </span>
              </label>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
                  setInviteRole('employee')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={inviting}
              >
                Cancel
              </button>
              <button
                onClick={inviteMember}
                disabled={inviting || !inviteEmail.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
