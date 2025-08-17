import { useState, useCallback, useEffect } from 'react'
import { Position } from './types'

export const useTreeInteraction = () => {
  const VIEWPORT_STORAGE_KEY = 'tree-viewport-state'
  
  // Load initial state from localStorage (only on client-side)
  const loadViewportState = () => {
    if (typeof window === 'undefined') {
      return { zoom: 1, pan: { x: 0, y: 0 } }
    }
    try {
      const saved = localStorage.getItem(VIEWPORT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          zoom: parsed.zoom || 1,
          pan: parsed.pan || { x: 0, y: 0 }
        }
      }
    } catch (error) {
      console.warn('Failed to load viewport state:', error)
    }
    return { zoom: 1, pan: { x: 0, y: 0 } }
  }

  const initialState = loadViewportState()
  const [zoom, setZoom] = useState(initialState.zoom)
  const [pan, setPan] = useState<Position>(initialState.pan)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 })
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [nodeDragStart, setNodeDragStart] = useState<Position>({ x: 0, y: 0 })
  const [mouseDownPosition, setMouseDownPosition] = useState<Position>({ x: 0, y: 0 })
  const [hasMouseMoved, setHasMouseMoved] = useState(false)
  
  // Touch-specific state - simplified for two-finger pan only
  const [isTwoFingerTouch, setIsTwoFingerTouch] = useState(false)
  const [touchStartDistance, setTouchStartDistance] = useState(0)
  const [touchStartZoom, setTouchStartZoom] = useState(1)
  const [touchStartPan, setTouchStartPan] = useState<Position>({ x: 0, y: 0 })
  const [lastTouchCenter, setLastTouchCenter] = useState<Position>({ x: 0, y: 0 })
  
  // Touch node dragging state
  const [touchNodeDragStart, setTouchNodeDragStart] = useState<Position>({ x: 0, y: 0 })
  const [isTouchDragging, setIsTouchDragging] = useState(false)

  // Save viewport state to localStorage whenever zoom or pan changes (only on client-side)
  const saveViewportState = useCallback((newZoom: number, newPan: Position) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(VIEWPORT_STORAGE_KEY, JSON.stringify({
        zoom: newZoom,
        pan: newPan
      }))
    } catch (error) {
      console.warn('Failed to save viewport state:', error)
    }
  }, [])

  useEffect(() => {
    saveViewportState(zoom, pan)
  }, [zoom, pan, saveViewportState])

  // Touch utility functions
  const getTouchCenter = useCallback((touches: React.TouchList | TouchList): Position => {
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY }
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    }
  }, [])

  const getTouchDistance = useCallback((touches: React.TouchList | TouchList): number => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom((prevZoom: number) => Math.min(prevZoom * 1.2, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prevZoom: number) => Math.max(prevZoom / 1.2, 0.3))
  }, [])

  const handleResetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleZoomToFitAll = useCallback((zoomLevel: number, panPosition: Position) => {
    setZoom(zoomLevel)
    setPan(panPosition)
    saveViewportState(zoomLevel, panPosition)
  }, [saveViewportState])

  const handleWheel = useCallback((e: WheelEvent, canvasRect: DOMRect) => {
    e.preventDefault()
    
    // Calculate mouse position relative to canvas center
    const mouseX = e.clientX - canvasRect.left - canvasRect.width / 2
    const mouseY = e.clientY - canvasRect.top - canvasRect.height / 2
    
    // Calculate zoom change
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.3, Math.min(3, zoom * zoomDelta))
    
    // Calculate pan adjustment to zoom towards mouse position
    const zoomChange = newZoom / zoom
    const newPanX = pan.x - mouseX * (zoomChange - 1)
    const newPanY = pan.y - mouseY * (zoomChange - 1)
    
    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [zoom, pan])

  const handleMouseDown = useCallback((e: React.MouseEvent, canvasRect: DOMRect) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true)
      setMouseDownPosition({ x: e.clientX, y: e.clientY })
      setHasMouseMoved(false)
      setDragStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      })
    }
  }, [pan])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Check if mouse has moved significantly (more than 5 pixels)
    if (!hasMouseMoved) {
      const deltaX = Math.abs(e.clientX - mouseDownPosition.x)
      const deltaY = Math.abs(e.clientY - mouseDownPosition.y)
      if (deltaX > 5 || deltaY > 5) {
        setHasMouseMoved(true)
      }
    }

    if (isDragging && !draggedNode) {
      // Canvas panning
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    } else if (draggedNode) {
      // Node dragging
      const newX = (e.clientX - dragStart.x - pan.x) / zoom
      const newY = (e.clientY - dragStart.y - pan.y) / zoom
      
      return { nodeId: draggedNode, position: { x: newX, y: newY } }
    }
    return null
  }, [isDragging, draggedNode, dragStart, pan, zoom, hasMouseMoved, mouseDownPosition])

  const handleMouseUp = useCallback(() => {
    const wasDragging = hasMouseMoved
    setIsDragging(false)
    setDraggedNode(null)
    setHasMouseMoved(false)
    return { wasDragging }
  }, [hasMouseMoved])

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string, nodePosition: Position) => {
    e.stopPropagation()
    setDraggedNode(nodeId)
    setNodeDragStart(nodePosition)
    setMouseDownPosition({ x: e.clientX, y: e.clientY })
    setHasMouseMoved(false)
    setDragStart({
      x: e.clientX - nodePosition.x * zoom - pan.x,
      y: e.clientY - nodePosition.y * zoom - pan.y
    })
  }, [zoom, pan])

  // Method to start touch node dragging (called from long-press detection)
  const startTouchNodeDrag = useCallback((nodeId: string, touchPosition: Position, nodePosition: Position) => {
    setDraggedNode(nodeId)
    setIsTouchDragging(true)
    setTouchNodeDragStart(touchPosition)
    setNodeDragStart(nodePosition)
    setHasMouseMoved(true) // Mark as moved to prevent click events
  }, [])

  // Touch event handlers - improved pan/zoom and node dragging
  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent, canvasRect: DOMRect) => {
    const touches = e.touches
    
    // Only handle two-finger touches for pan/zoom
    if (touches.length === 2) {
      e.preventDefault()
      setIsTwoFingerTouch(true)
      setTouchStartDistance(getTouchDistance(touches))
      setTouchStartZoom(zoom)
      setTouchStartPan(pan)
      setLastTouchCenter(getTouchCenter(touches))
    }
    // Single finger touches are ignored at canvas level - let them bubble to nodes for clicks
  }, [pan, zoom, getTouchDistance, getTouchCenter])

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent, canvasRect: DOMRect) => {
    const touches = e.touches
    
    // Handle two-finger pan/zoom
    if (touches.length === 2 && isTwoFingerTouch) {
      e.preventDefault()
      
      const currentDistance = getTouchDistance(touches)
      const currentCenter = getTouchCenter(touches)
      
      if (touchStartDistance > 0) {
        // Calculate zoom
        const zoomChange = currentDistance / touchStartDistance
        const newZoom = Math.max(0.3, Math.min(3, touchStartZoom * zoomChange))
        
        // Simplified pan calculation - directly follow center movement
        const centerDeltaX = currentCenter.x - lastTouchCenter.x
        const centerDeltaY = currentCenter.y - lastTouchCenter.y
        
        // Apply pan movement directly
        const newPanX = pan.x + centerDeltaX
        const newPanY = pan.y + centerDeltaY
        
        // For zoom, also account for zoom centering
        if (Math.abs(zoomChange - 1) > 0.01) {
          // Zooming - adjust pan to zoom towards pinch center
          const canvasCenterX = canvasRect.left + canvasRect.width / 2
          const canvasCenterY = canvasRect.top + canvasRect.height / 2
          
          const pinchCenterX = currentCenter.x - canvasCenterX
          const pinchCenterY = currentCenter.y - canvasCenterY
          
          const zoomChangeRatio = newZoom / zoom
          const zoomPanAdjustX = pinchCenterX * (1 - zoomChangeRatio)
          const zoomPanAdjustY = pinchCenterY * (1 - zoomChangeRatio)
          
          setPan({ x: newPanX + zoomPanAdjustX, y: newPanY + zoomPanAdjustY })
        } else {
          // Pure panning
          setPan({ x: newPanX, y: newPanY })
        }
        
        setZoom(newZoom)
        setLastTouchCenter(currentCenter)
      }
    }
    
    // Handle single-finger node dragging
    if (touches.length === 1 && draggedNode) {
      e.preventDefault()
      const touch = touches[0]
      
      // Calculate new node position accounting for pan and zoom
      const newX = (touch.clientX - canvasRect.left - canvasRect.width / 2 - pan.x) / zoom
      const newY = (touch.clientY - canvasRect.top - canvasRect.height / 2 - pan.y) / zoom
      
      return { nodeId: draggedNode, position: { x: newX, y: newY } }
    }
    
    return null
  }, [isTwoFingerTouch, touchStartDistance, touchStartZoom, touchStartPan, lastTouchCenter, draggedNode, pan, zoom, getTouchDistance, getTouchCenter])

  const handleTouchEnd = useCallback((e: React.TouchEvent | TouchEvent) => {
    const touches = e.touches
    
    // Check if we were dragging
    const wasDragging = isTouchDragging || hasMouseMoved
    
    if (touches.length < 2) {
      // Reset two-finger gesture state when going below 2 fingers
      setIsTwoFingerTouch(false)
      setTouchStartDistance(0)
    }
    
    // Reset touch dragging state
    if (touches.length === 0) {
      setIsTouchDragging(false)
      setDraggedNode(null)
      setHasMouseMoved(false)
    }
    
    return { wasDragging }
  }, [isTouchDragging, hasMouseMoved])

  // Simplified node touch handler - only for drag initiation, not for clicks
  const handleNodeTouchStart = useCallback((e: React.TouchEvent | TouchEvent, nodeId: string, nodePosition: Position) => {
    // Only handle single finger for potential drag
    if (e.touches.length === 1) {
      // For nodes, we'll handle drag initiation in a separate touch move handler
      // This allows clicks to work normally through the browser's native click events
    }
  }, [])

  const startNodeDrag = useCallback((nodeId: string) => {
    setDraggedNode(nodeId)
    setHasMouseMoved(true)
  }, [])

  return {
    zoom,
    pan,
    isDragging,
    draggedNode,
    hasMouseMoved,
    isTwoFingerTouch,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
    handleZoomToFitAll,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleNodeMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleNodeTouchStart,
    startNodeDrag,
    startTouchNodeDrag,
    setZoom,
    setPan,
    setIsDragging,
    setDraggedNode
  }
}
