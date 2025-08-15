import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Organization, OrganizationForm } from '../shared/types'

export const useOrganizationOperations = () => {
  const updateOrganization = useCallback(async (
    e: React.FormEvent,
    userProfile: any,
    orgForm: OrganizationForm,
    fetchOrganization: () => void,
    setLoading: (loading: boolean) => void,
    showSuccess: (title: string, message: string) => void,
    showError: (title: string, message: string) => void
  ) => {
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
  }, [])

  const uploadLogo = useCallback(async (
    file: File,
    userProfile: any,
    setUploading: (uploading: boolean) => void,
    setOrgForm: React.Dispatch<React.SetStateAction<OrganizationForm>>,
    fetchOrganization: () => void,
    showSuccess: (title: string, message: string) => void,
    showError: (title: string, message: string, action?: any) => void,
    showWarning: (title: string, message: string, action?: any) => void
  ) => {
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
      if (error?.message?.includes('row-level security policy')) {
        showError(
          'Storage Access Denied',
          'Please check if you have admin or manager role.',
          {
            label: 'Contact Admin',
            onClick: () => {}
          }
        )
      } else if (error?.message?.includes('duplicate') || error?.statusCode === 409) {
        showSuccess(
          'Logo Updated!',
          'Your logo file was updated successfully.'
        )
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
  }, [])

  const handleLogoUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    uploadLogo: (file: File) => void,
    showWarning: (title: string, message: string, action?: any) => void
  ) => {
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
  }, [])

  const removeLogo = useCallback(async (
    userProfile: any,
    orgForm: OrganizationForm,
    setUploading: (uploading: boolean) => void,
    setOrgForm: React.Dispatch<React.SetStateAction<OrganizationForm>>,
    fetchOrganization: () => void,
    showSuccess: (title: string, message: string) => void,
    showError: (title: string, message: string, action?: any) => void
  ) => {
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
          onClick: () => removeLogo(
            userProfile,
            orgForm,
            setUploading,
            setOrgForm,
            fetchOrganization,
            showSuccess,
            showError
          )
        }
      )
    } finally {
      setUploading(false)
    }
  }, [])

  return {
    updateOrganization,
    uploadLogo,
    handleLogoUpload,
    removeLogo
  }
}
