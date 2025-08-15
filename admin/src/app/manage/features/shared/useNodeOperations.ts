import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useAuth } from '@/lib/AuthContext'
import { useAppToast } from '@/hooks/useAppToast'
import { Node, NodeFormData } from './types'

export const useNodeOperations = () => {
  const { userProfile } = useAuth()
  const { showSuccess, showError } = useAppToast()

  const createNode = useCallback(async (
    type: 'branch' | 'department' | 'service',
    formData: NodeFormData,
    parentNode?: Node
  ) => {
    try {
      let table = ''
      let insertData: any = {
        name: formData.name
      }

      switch (type) {
        case 'branch':
          table = 'branches'
          insertData = {
            ...insertData,
            organization_id: userProfile?.organization_id,
            address: formData.address,
            phone: formData.phone,
            email: formData.email
          }
          break
        case 'department':
          table = 'departments'
          insertData = {
            ...insertData,
            description: formData.description,
            branch_id: parentNode?.id
          }
          break
        case 'service':
          try {
            table = 'services'
            insertData = {
              ...insertData,
              description: formData.description,
              department_id: parentNode?.id,
              estimated_time: formData.estimated_time,
              is_active: formData.is_active ?? true
            }
          } catch (error) {
            showError('Services table not yet created. Please run the database migration first.')
            return false
          }
          break
      }

      const { error } = await supabase
        .from(table)
        .insert([insertData])

      if (error) throw error
      
      showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`)
      return true
    } catch (error) {
      logger.error('Error creating node:', error)
      showError('Error creating item')
      return false
    }
  }, [userProfile?.organization_id, showSuccess, showError])

  const updateNode = useCallback(async (
    node: Node,
    formData: NodeFormData
  ) => {
    try {
      let table = ''
      let updateData: any = {
        name: formData.name,
        updated_at: new Date().toISOString()
      }

      switch (node.type) {
        case 'branch':
          table = 'branches'
          updateData = {
            ...updateData,
            address: formData.address,
            phone: formData.phone,
            email: formData.email
          }
          break
        case 'department':
          table = 'departments'
          updateData = {
            ...updateData,
            description: formData.description
          }
          break
        case 'service':
          try {
            table = 'services'
            updateData = {
              ...updateData,
              description: formData.description,
              estimated_time: formData.estimated_time,
              is_active: formData.is_active ?? true
            }
          } catch (error) {
            showError('Services table not yet created. Please run the database migration first.')
            return false
          }
          break
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', node.id)

      if (error) throw error
      
      showSuccess(`${node.type.charAt(0).toUpperCase() + node.type.slice(1)} updated successfully`)
      return true
    } catch (error) {
      logger.error('Error updating node:', error)
      showError('Error updating item')
      return false
    }
  }, [showSuccess, showError])

  const deleteNode = useCallback(async (node: Node) => {
    try {
      let table = ''
      switch (node.type) {
        case 'branch': table = 'branches'; break
        case 'department': table = 'departments'; break
        case 'service': table = 'services'; break
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', node.id)

      if (error) throw error
      
      showSuccess(`${node.type.charAt(0).toUpperCase() + node.type.slice(1)} deleted successfully`)
      return true
    } catch (error) {
      logger.error('Error deleting node:', error)
      showError('Error deleting item')
      return false
    }
  }, [showSuccess, showError])

  return {
    createNode,
    updateNode,
    deleteNode
  }
}
