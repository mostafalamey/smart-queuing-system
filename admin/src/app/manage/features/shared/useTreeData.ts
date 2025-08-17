import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useAuth } from '@/lib/AuthContext'
import { useAppToast } from '@/hooks/useAppToast'
import { Node, Connection, BranchNode, DepartmentNode, ServiceNode, Position } from './types'
import { getNodeDimensions } from './utils'

export const useTreeData = () => {
  const { user, userProfile } = useAuth()
  const { showSuccess, showError } = useAppToast()
  
  const [nodes, setNodes] = useState<Node[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const NODE_POSITIONS_STORAGE_KEY = `tree-node-positions-${userProfile?.organization_id}`

  // Load saved node positions from localStorage
  const loadSavedPositions = useCallback(() => {
    try {
      const saved = localStorage.getItem(NODE_POSITIONS_STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved) as Record<string, Position>
      }
    } catch (error) {
      console.warn('Failed to load saved node positions:', error)
    }
    return {}
  }, [NODE_POSITIONS_STORAGE_KEY])

  // Save node positions to localStorage
  const saveNodePositions = useCallback((nodes: Node[]) => {
    try {
      const positions: Record<string, Position> = {}
      nodes.forEach(node => {
        positions[node.id] = node.position
      })
      localStorage.setItem(NODE_POSITIONS_STORAGE_KEY, JSON.stringify(positions))
    } catch (error) {
      console.warn('Failed to save node positions:', error)
    }
  }, [NODE_POSITIONS_STORAGE_KEY])

  const fetchData = useCallback(async () => {
    if (!userProfile?.organization_id) {
      setError('No organization found')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch branches
      const { data: branches, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .order('created_at')

      if (branchError) {
        logger.error('Branch error:', branchError)
        throw branchError
      }

      if (!branches || branches.length === 0) {
        setNodes([])
        setConnections([])
        setLoading(false)
        return
      }

      // Fetch departments
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .in('branch_id', branches.map(b => b.id))
        .order('created_at')

      if (deptError) {
        logger.error('Department error:', deptError)
        throw deptError
      }

      // Fetch services (with error handling for missing table)
      let services: any[] = []
      try {
        const { data: servicesData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .in('department_id', departments?.map(d => d.id) || [])

        if (serviceError) {
          logger.warn('Services table not found, skipping services:', serviceError.message)
        } else {
          services = servicesData || []
        }
      } catch (error) {
        logger.warn('Services table not yet created, continuing without services')
      }

      // Convert to node format and calculate positions
      const allNodes: Node[] = []
      const allConnections: Connection[] = []

      // Add branches with better positioning for full-screen view
      branches?.forEach((branch, index) => {
        const branchNode: BranchNode = {
          id: branch.id,
          type: 'branch',
          name: branch.name,
          description: branch.address || 'No address set',
          color: '#3B82F6',
          position: { 
            x: 200 + (index % 3) * 600,  // Spread branches horizontally
            y: 50 + Math.floor(index / 3) * 500  // Stack rows vertically
          },
          children: departments?.filter(d => d.branch_id === branch.id).map(d => d.id) || [],
          address: branch.address,
          phone: branch.phone,
          email: branch.email
        }
        allNodes.push(branchNode)
      })

      // Add departments with improved curved positioning
      departments?.forEach((dept, index) => {
        const branchNode = allNodes.find(n => n.id === dept.branch_id)
        if (branchNode) {
          const childIndex = branchNode.children.indexOf(dept.id)
          const totalChildren = branchNode.children.length
          
          // Calculate angle to spread departments in a semi-circle below the branch
          const angleSpread = Math.min(120, totalChildren * 30) // Max 120 degrees spread
          const startAngle = 90 - angleSpread / 2 // Center around 90 degrees (straight down)
          const angle = startAngle + (childIndex * angleSpread) / Math.max(1, totalChildren - 1)
          const distance = 280 // Distance from branch
          
          const deptNode: DepartmentNode = {
            id: dept.id,
            type: 'department',
            name: dept.name,
            description: dept.description || 'Department services',
            color: '#10B981',
            position: {
              x: branchNode.position.x + distance * Math.cos(angle * Math.PI / 180),
              y: branchNode.position.y + distance * Math.sin(angle * Math.PI / 180)
            },
            parentId: dept.branch_id,
            branch_id: dept.branch_id,
            children: services?.filter(s => s.department_id === dept.id).map(s => s.id) || []
          }
          
          allNodes.push(deptNode)
          allConnections.push({ from: dept.branch_id, to: dept.id })
        }
      })

      // Add services with improved positioning
      services?.forEach((service, index) => {
        const deptNode = allNodes.find(n => n.id === service.department_id) as DepartmentNode
        if (deptNode) {
          const childIndex = deptNode.children.indexOf(service.id)
          const totalChildren = deptNode.children.length
          
          // Arrange services in a small arc around the department
          const angleSpread = Math.min(90, totalChildren * 25) // Max 90 degrees
          const startAngle = 60 - angleSpread / 2 // Center around 60 degrees
          const angle = startAngle + (childIndex * angleSpread) / Math.max(1, totalChildren - 1)
          const distance = 200 // Distance from department
          
          const serviceNode: ServiceNode = {
            id: service.id,
            type: 'service',
            name: service.name,
            description: service.description || 'Service details',
            color: '#F59E0B',
            position: {
              x: deptNode.position.x + distance * Math.cos(angle * Math.PI / 180),
              y: deptNode.position.y + distance * Math.sin(angle * Math.PI / 180)
            },
            parentId: service.department_id,
            department_id: service.department_id,
            children: [],
            estimated_time: service.estimated_time,
            is_active: service.is_active
          }
          
          allNodes.push(serviceNode)
          allConnections.push({ from: service.department_id, to: service.id })
        }
      })

      // Apply saved positions if they exist
      const savedPositions = loadSavedPositions()
      if (Object.keys(savedPositions).length > 0) {
        allNodes.forEach(node => {
          if (savedPositions[node.id]) {
            node.position = savedPositions[node.id]
          }
        })
      }

      setNodes(allNodes)
      setConnections(allConnections)
    } catch (error) {
      logger.error('Error fetching tree data:', error)
      setError('Failed to load organization structure')
    } finally {
      setLoading(false)
    }
  }, [userProfile?.organization_id])

  const updateNodePosition = useCallback((nodeId: string, newPosition: Position) => {
    setNodes(prevNodes => {
      const updatedNodes = prevNodes.map(node => 
        node.id === nodeId ? { ...node, position: newPosition } : node
      )
      // Save positions whenever a node is moved
      saveNodePositions(updatedNodes)
      return updatedNodes
    })
  }, [saveNodePositions])

  const updateMultipleNodePositions = useCallback((positionUpdates: Record<string, Position>) => {
    setNodes(prevNodes => {
      const updatedNodes = prevNodes.map(node => {
        if (positionUpdates[node.id]) {
          return { ...node, position: positionUpdates[node.id] }
        }
        return node
      })
      // Save positions after batch update
      saveNodePositions(updatedNodes)
      return updatedNodes
    })
  }, [saveNodePositions])

  const saveCurrentPositions = useCallback(() => {
    saveNodePositions(nodes)
  }, [nodes, saveNodePositions])

  const addNode = useCallback((node: Node) => {
    setNodes(prevNodes => [...prevNodes, node])
  }, [])

  const updateNode = useCallback((updatedNode: Node) => {
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      )
    )
  }, [])

  const removeNode = useCallback((nodeId: string) => {
    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId))
    setConnections(prevConnections => 
      prevConnections.filter(conn => conn.from !== nodeId && conn.to !== nodeId)
    )
  }, [])

  const addConnection = useCallback((connection: Connection) => {
    setConnections(prevConnections => [...prevConnections, connection])
  }, [])

  const removeConnection = useCallback((from: string, to: string) => {
    setConnections(prevConnections => 
      prevConnections.filter(conn => !(conn.from === from && conn.to === to))
    )
  }, [])

  const autoRearrangeNodes = useCallback((newPositions: Record<string, Position>) => {
    setNodes(prevNodes => {
      const updatedNodes = prevNodes.map(node => {
        if (newPositions[node.id]) {
          return { ...node, position: newPositions[node.id] }
        }
        return node
      })
      // Save positions after rearrangement
      saveNodePositions(updatedNodes)
      return updatedNodes
    })
  }, [saveNodePositions])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    nodes,
    connections,
    loading,
    error,
    fetchData,
    updateNodePosition,
    updateMultipleNodePositions,
    saveCurrentPositions,
    autoRearrangeNodes,
    addNode,
    updateNode,
    removeNode,
    addConnection,
    removeConnection,
    setNodes,
    setConnections
  }
}
