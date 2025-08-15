import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Member } from '../shared/types'

export const useMemberOperations = () => {
  const [isUpdatingRole, setIsUpdatingRole] = useState<Record<string, boolean>>({})
  const [isRemovingMember, setIsRemovingMember] = useState<Record<string, boolean>>({})

  const updateMemberRole = useCallback(async (
    memberId: string,
    newRole: 'admin' | 'manager' | 'employee',
    setMembers: React.Dispatch<React.SetStateAction<Member[]>>,
    showSuccess: (title: string, message: string) => void,
    showError: (title: string, message: string) => void
  ) => {
    setIsUpdatingRole(prev => ({ ...prev, [memberId]: true }))
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      // Update local state
      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      ))

      showSuccess(
        'Role Updated Successfully!',
        `Member role has been updated to ${newRole}.`
      )
      
      logger.info('Member role updated:', { memberId, newRole })
    } catch (error) {
      logger.error('Error updating member role:', error)
      showError(
        'Update Failed',
        'Unable to update member role. Please try again.'
      )
    } finally {
      setIsUpdatingRole(prev => ({ ...prev, [memberId]: false }))
    }
  }, [])

  const removeMember = useCallback(async (
    memberId: string,
    memberName: string,
    setMembers: React.Dispatch<React.SetStateAction<Member[]>>,
    showSuccess: (title: string, message: string) => void,
    showError: (title: string, message: string) => void
  ) => {
    setIsRemovingMember(prev => ({ ...prev, [memberId]: true }))
    
    try {
      // First, set organization_id to null
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          organization_id: null,
          role: null
        })
        .eq('id', memberId)

      if (updateError) throw updateError

      // Remove from local state
      setMembers(prev => prev.filter(member => member.id !== memberId))

      showSuccess(
        'Member Removed Successfully!',
        `${memberName} has been removed from the organization.`
      )
      
      logger.info('Member removed from organization:', { memberId, memberName })
    } catch (error) {
      logger.error('Error removing member:', error)
      showError(
        'Removal Failed',
        'Unable to remove member. Please try again.'
      )
    } finally {
      setIsRemovingMember(prev => ({ ...prev, [memberId]: false }))
    }
  }, [])

  const inviteMember = useCallback(async (
    email: string,
    role: 'admin' | 'manager' | 'employee',
    organizationId: string,
    organizationName: string,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    showSuccess: (title: string, message: string) => void,
    showError: (title: string, message: string) => void,
    onClose: () => void
  ) => {
    setIsLoading(true)
    
    try {
      // First check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('email', email)
        .single()

      if (existingProfile?.organization_id) {
        showError(
          'User Already in Organization',
          'This user is already a member of an organization.'
        )
        return
      }

      // Send invitation
      const { error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email,
          role,
          organizationId,
          organizationName
        }
      })

      if (error) throw error

      showSuccess(
        'Invitation Sent Successfully!',
        `An invitation has been sent to ${email}.`
      )
      
      onClose()
      logger.info('Invitation sent:', { email, role, organizationId })
    } catch (error) {
      logger.error('Error sending invitation:', error)
      showError(
        'Invitation Failed',
        'Unable to send invitation. Please check the email and try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resendInvitation = useCallback(async (
    email: string,
    role: 'admin' | 'manager' | 'employee',
    organizationId: string,
    organizationName: string,
    showSuccess: (title: string, message: string) => void,
    showError: (title: string, message: string) => void
  ) => {
    try {
      const { error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email,
          role,
          organizationId,
          organizationName
        }
      })

      if (error) throw error

      showSuccess(
        'Invitation Resent!',
        `A new invitation has been sent to ${email}.`
      )
      
      logger.info('Invitation resent:', { email, role, organizationId })
    } catch (error) {
      logger.error('Error resending invitation:', error)
      showError(
        'Resend Failed',
        'Unable to resend invitation. Please try again.'
      )
    }
  }, [])

  const bulkInviteMembers = useCallback(async (
    invitations: Array<{ email: string; role: 'admin' | 'manager' | 'employee' }>,
    organizationId: string,
    organizationName: string,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    showSuccess: (title: string, message: string) => void,
    showError: (title: string, message: string) => void,
    showInfo: (title: string, message: string) => void,
    onClose: () => void
  ) => {
    setIsLoading(true)
    
    try {
      const results = []
      
      for (const invitation of invitations) {
        try {
          // Check if user already exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, organization_id')
            .eq('email', invitation.email)
            .single()

          if (existingProfile?.organization_id) {
            results.push({
              email: invitation.email,
              success: false,
              reason: 'Already in organization'
            })
            continue
          }

          // Send invitation
          const { error } = await supabase.functions.invoke('send-invitation', {
            body: {
              email: invitation.email,
              role: invitation.role,
              organizationId,
              organizationName
            }
          })

          results.push({
            email: invitation.email,
            success: !error,
            reason: error?.message
          })
        } catch (error) {
          results.push({
            email: invitation.email,
            success: false,
            reason: 'Failed to send'
          })
        }
      }

      const successful = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      if (successful.length > 0) {
        showSuccess(
          'Bulk Invitations Sent!',
          `Successfully sent ${successful.length} invitation${successful.length === 1 ? '' : 's'}.`
        )
      }

      if (failed.length > 0) {
        showInfo(
          'Some Invitations Failed',
          `${failed.length} invitation${failed.length === 1 ? '' : 's'} could not be sent. Please review and try again.`
        )
      }
      
      onClose()
      logger.info('Bulk invitations processed:', { successful: successful.length, failed: failed.length })
    } catch (error) {
      logger.error('Error sending bulk invitations:', error)
      showError(
        'Bulk Invitation Failed',
        'Unable to process bulk invitations. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    updateMemberRole,
    removeMember,
    inviteMember,
    resendInvitation,
    bulkInviteMembers,
    isUpdatingRole,
    isRemovingMember
  }
}
