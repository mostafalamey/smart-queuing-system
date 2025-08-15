import { Building, Briefcase, Activity } from 'lucide-react'
import { Node } from './types'

export const getNodeIcon = (type: string) => {
  switch (type) {
    case 'branch':
      return Building
    case 'department':
      return Briefcase
    case 'service':
      return Activity
    default:
      return Building
  }
}

export const getNodeDimensions = (type: string) => {
  switch (type) {
    case 'branch':
      // w-56 = 224px, estimated height based on content + padding
      return { width: 224, height: 160 }
    case 'department':
      // w-60 = 240px, estimated height based on content + padding
      return { width: 240, height: 140 }
    case 'service':
      // w-52 = 208px, estimated height based on content + padding
      return { width: 208, height: 120 }
    default:
      return { width: 160, height: 120 }
  }
}

export const getNodeStats = (node: Node) => {
  switch (node.type) {
    case 'branch':
      return `${node.children.length} department${node.children.length === 1 ? '' : 's'}`
    case 'department':
      return `${node.children.length} service${node.children.length === 1 ? '' : 's'}`
    case 'service':
      const serviceNode = node as any
      return serviceNode.estimated_time ? `${serviceNode.estimated_time} min` : 'No time set'
    default:
      return ''
  }
}

export const getNodeTypeLabel = (type: string) => {
  switch (type) {
    case 'branch':
      return 'Branch'
    case 'department':
      return 'Department'
    case 'service':
      return 'Service'
    default:
      return type
  }
}

export const getNodeColor = (type: string) => {
  switch (type) {
    case 'branch':
      return '#3B82F6'
    case 'department':
      return '#10B981'
    case 'service':
      return '#F59E0B'
    default:
      return '#6B7280'
  }
}

export const canCreateChild = (parentType: string) => {
  switch (parentType) {
    case 'branch':
      return 'department'
    case 'department':
      return 'service'
    default:
      return null
  }
}

export const validateNodeForm = (type: string, formData: any) => {
  const errors: string[] = []

  if (!formData.name?.trim()) {
    errors.push('Name is required')
  }

  if (type === 'branch') {
    // Branch-specific validations can be added here
  } else if (type === 'department') {
    // Department-specific validations can be added here
  } else if (type === 'service') {
    if (formData.estimated_time && (formData.estimated_time < 1 || formData.estimated_time > 480)) {
      errors.push('Estimated time must be between 1 and 480 minutes')
    }
  }

  return errors
}
