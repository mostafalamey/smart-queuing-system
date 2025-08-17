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

// Layout configuration constants
export const LAYOUT_CONFIG = {
  HORIZONTAL_SPACING: 50, // Increased spacing to make changes more visible
  VERTICAL_LEVEL_SPACING: 200, // Increased vertical spacing
  CANVAS_MARGIN: 150, // Increased margin
  CENTER_OFFSET: { x: 0, y: 0 } // Offset to center the entire tree structure
}

// Helper function to calculate the total width required by a node and all its descendants
const calculateNodeSubtreeWidth = (
  nodeId: string,
  nodes: Node[],
  nodesByParent: Record<string, Node[]>
): number => {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) return 0

  const children = nodesByParent[nodeId] || []
  if (children.length === 0) {
    // Leaf node - return its own width
    return getNodeDimensions(node.type).width
  }

  // Calculate total width of all children including spacing
  const childrenWidths = children.map(child => 
    calculateNodeSubtreeWidth(child.id, nodes, nodesByParent)
  )
  const totalChildrenWidth = childrenWidths.reduce((sum, width) => sum + width, 0) + 
    (children.length - 1) * LAYOUT_CONFIG.HORIZONTAL_SPACING

  // Return the maximum of node width or total children width
  const nodeWidth = getNodeDimensions(node.type).width
  return Math.max(nodeWidth, totalChildrenWidth)
}

// Auto-layout algorithm with bottom-up hierarchical spacing calculation
export const calculateAutoLayout = (nodes: Node[]): Record<string, { x: number; y: number }> => {
  const positions: Record<string, { x: number; y: number }> = {}
  
  // Group nodes by type and create parent-child relationships
  const branches = nodes.filter(n => n.type === 'branch')
  const departments = nodes.filter(n => n.type === 'department')
  const services = nodes.filter(n => n.type === 'service')
  
  if (branches.length === 0) return positions
  
  // Create lookup tables for efficient parent-child relationships
  const nodesByParent: Record<string, Node[]> = {}
  nodes.forEach(node => {
    if ('parentId' in node && node.parentId) {
      if (!nodesByParent[node.parentId]) {
        nodesByParent[node.parentId] = []
      }
      nodesByParent[node.parentId].push(node)
    }
  })

  // Calculate subtree widths for all branches (bottom-up approach)
  const branchSubtreeWidths = branches.map(branch => ({
    branch,
    width: calculateNodeSubtreeWidth(branch.id, nodes, nodesByParent)
  }))

  // Calculate total width needed for all branches
  const totalBranchesWidth = branchSubtreeWidths.reduce((sum, item) => sum + item.width, 0) + 
    (branches.length - 1) * LAYOUT_CONFIG.HORIZONTAL_SPACING

  // Center all branches horizontally
  let currentX = -totalBranchesWidth / 2
  const branchY = -200 // Move branches higher up to make change more visible

  // Position each branch and its descendants
  branchSubtreeWidths.forEach(({ branch, width }) => {
    // Position the branch at the center of its subtree width
    const branchWidth = getNodeDimensions(branch.type).width
    const branchCenterX = currentX + width / 2
    const branchX = branchCenterX - branchWidth / 2
    
    positions[branch.id] = { x: branchX, y: branchY }

    // Position departments for this branch
    const branchDepartments = nodesByParent[branch.id] || []
    if (branchDepartments.length > 0) {
      const deptY = branchY + getNodeDimensions(branch.type).height + LAYOUT_CONFIG.VERTICAL_LEVEL_SPACING
      
      // Calculate department positions within the branch's subtree width
      const departmentSubtreeWidths = branchDepartments.map(dept => ({
        dept,
        width: calculateNodeSubtreeWidth(dept.id, nodes, nodesByParent)
      }))
      
      const totalDeptWidth = departmentSubtreeWidths.reduce((sum, item) => sum + item.width, 0) + 
        (branchDepartments.length - 1) * LAYOUT_CONFIG.HORIZONTAL_SPACING
      
      let deptCurrentX = branchCenterX - totalDeptWidth / 2
      
      departmentSubtreeWidths.forEach(({ dept, width: deptWidth }) => {
        // Position the department at the center of its subtree width
        const deptDimensions = getNodeDimensions(dept.type)
        const deptCenterX = deptCurrentX + deptWidth / 2
        const deptX = deptCenterX - deptDimensions.width / 2
        
        positions[dept.id] = { x: deptX, y: deptY }

        // Position services for this department
        const deptServices = nodesByParent[dept.id] || []
        if (deptServices.length > 0) {
          const serviceY = deptY + deptDimensions.height + LAYOUT_CONFIG.VERTICAL_LEVEL_SPACING
          const serviceDimensions = getNodeDimensions('service')
          
          const totalServiceWidth = deptServices.length * serviceDimensions.width + 
            (deptServices.length - 1) * LAYOUT_CONFIG.HORIZONTAL_SPACING
          
          let serviceCurrentX = deptCenterX - totalServiceWidth / 2
          
          deptServices.forEach((service, serviceIndex) => {
            positions[service.id] = { x: serviceCurrentX, y: serviceY }
            serviceCurrentX += serviceDimensions.width + LAYOUT_CONFIG.HORIZONTAL_SPACING
          })
        }
        
        deptCurrentX += deptWidth + LAYOUT_CONFIG.HORIZONTAL_SPACING
      })
    }
    
    currentX += width + LAYOUT_CONFIG.HORIZONTAL_SPACING
  })
  
  return positions
}

// Function to calculate child positions when parent is moved
export const calculateChildrenPositions = (
  parentId: string,
  oldParentPosition: { x: number; y: number },
  newParentPosition: { x: number; y: number },
  nodes: Node[]
): Record<string, { x: number; y: number }> => {
  const childPositions: Record<string, { x: number; y: number }> = {}
  
  // Calculate the movement delta
  const deltaX = newParentPosition.x - oldParentPosition.x
  const deltaY = newParentPosition.y - oldParentPosition.y
  
  // Function to recursively move all descendants
  const moveDescendants = (nodeId: string) => {
    const children = nodes.filter(node => 'parentId' in node && node.parentId === nodeId)
    
    children.forEach(child => {
      // Move the child by the same delta
      childPositions[child.id] = {
        x: child.position.x + deltaX,
        y: child.position.y + deltaY
      }
      
      // Recursively move grandchildren
      moveDescendants(child.id)
    })
  }
  
  moveDescendants(parentId)
  return childPositions
}

// Simple zoom to fit all nodes function
export const calculateZoomToFitAll = (
  nodes: Node[],
  viewportWidth: number,
  viewportHeight: number,
  padding: number = 100
): { zoom: number; pan: { x: number; y: number } } => {
  if (nodes.length === 0) {
    return { zoom: 1, pan: { x: 0, y: 0 } }
  }

  // Find the bounding box of all nodes
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  nodes.forEach(node => {
    const dimensions = getNodeDimensions(node.type)
    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + dimensions.width)
    maxY = Math.max(maxY, node.position.y + dimensions.height)
  })

  // Add padding
  const contentWidth = maxX - minX + 2 * padding
  const contentHeight = maxY - minY + 2 * padding
  const contentCenterX = (minX + maxX) / 2
  const contentCenterY = (minY + maxY) / 2

  // Calculate zoom to fit content in viewport
  const zoomX = viewportWidth / contentWidth
  const zoomY = viewportHeight / contentHeight
  const zoom = Math.min(zoomX, zoomY) * 0.9 // 90% to leave some margin
  
  // Clamp zoom
  const clampedZoom = Math.min(Math.max(zoom, 0.1), 3.0)

  // Calculate pan to center the content
  // We want: contentCenterX * zoom + panX = viewportWidth / 2
  const panX = (viewportWidth / 2) - (contentCenterX * clampedZoom)
  const panY = (viewportHeight / 2) - (contentCenterY * clampedZoom)

  return { zoom: clampedZoom, pan: { x: panX, y: panY } }
}
