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
  
  // Touch-specific state
  const [isTouching, setIsTouching] = useState(false)
  const [touchStartDistance, setTouchStartDistance] = useState(0)
  const [touchStartZoom, setTouchStartZoom] = useState(1)
  const [touchStartPan, setTouchStartPan] = useState<Position>({ x: 0, y: 0 })
  const [lastTouchCenter, setLastTouchCenter] = useState<Position>({ x: 0, y: 0 })

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

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent, canvasRect: DOMRect) => {
    e.preventDefault()
    const touches = e.touches
    
    if (touches.length === 1) {
      // Single touch - start panning
      setIsTouching(true)
      const touch = touches[0]
      setMouseDownPosition({ x: touch.clientX, y: touch.clientY })
      setHasMouseMoved(false)
      setDragStart({
        x: touch.clientX - pan.x,
        y: touch.clientY - pan.y
      })
    } else if (touches.length === 2) {
      // Two finger touch - start pinch zoom
      setIsTouching(true)
      setTouchStartDistance(getTouchDistance(touches))
      setTouchStartZoom(zoom)
      setTouchStartPan(pan)
      setLastTouchCenter(getTouchCenter(touches))
    }
  }, [pan, zoom, getTouchDistance, getTouchCenter])

  const handleTouchMove = useCallback((e: React.TouchEvent | TouchEvent, canvasRect: DOMRect) => {
    e.preventDefault()
    const touches = e.touches
    
    if (touches.length === 1 && !draggedNode) {
      // Single touch panning
      const touch = touches[0]
      
      // Check if touch has moved significantly
      if (!hasMouseMoved) {
        const deltaX = Math.abs(touch.clientX - mouseDownPosition.x)
        const deltaY = Math.abs(touch.clientY - mouseDownPosition.y)
        if (deltaX > 5 || deltaY > 5) {
          setHasMouseMoved(true)
        }
      }
      
      // Update pan position
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      })
    } else if (touches.length === 1 && draggedNode) {
      // Single touch node dragging
      const touch = touches[0]
      const newX = (touch.clientX - dragStart.x - pan.x) / zoom
      const newY = (touch.clientY - dragStart.y - pan.y) / zoom
      
      return { nodeId: draggedNode, position: { x: newX, y: newY } }
    } else if (touches.length === 2) {
      // Two finger pinch zoom
      const currentDistance = getTouchDistance(touches)
      const currentCenter = getTouchCenter(touches)
      
      if (touchStartDistance > 0) {
        // Calculate zoom
        const zoomChange = currentDistance / touchStartDistance
        const newZoom = Math.max(0.3, Math.min(3, touchStartZoom * zoomChange))
        
        // Calculate pan to zoom towards center of pinch
        const centerDeltaX = currentCenter.x - lastTouchCenter.x
        const centerDeltaY = currentCenter.y - lastTouchCenter.y
        
        const canvasCenterX = canvasRect.left + canvasRect.width / 2
        const canvasCenterY = canvasRect.top + canvasRect.height / 2
        
        const pinchCenterX = currentCenter.x - canvasCenterX
        const pinchCenterY = currentCenter.y - canvasCenterY
        
        const zoomChangeRatio = newZoom / touchStartZoom
        const newPanX = touchStartPan.x - pinchCenterX * (zoomChangeRatio - 1) + centerDeltaX
        const newPanY = touchStartPan.y - pinchCenterY * (zoomChangeRatio - 1) + centerDeltaY
        
        setZoom(newZoom)
        setPan({ x: newPanX, y: newPanY })
      }
    }
    
    return null
  }, [draggedNode, hasMouseMoved, mouseDownPosition, dragStart, pan, zoom, touchStartDistance, touchStartZoom, touchStartPan, lastTouchCenter, getTouchDistance, getTouchCenter])

  const handleTouchEnd = useCallback((e: React.TouchEvent | TouchEvent) => {
    e.preventDefault()
    
    if (e.touches.length === 0) {
      // All touches ended
      const wasDragging = hasMouseMoved
      setIsTouching(false)
      setDraggedNode(null)
      setHasMouseMoved(false)
      setTouchStartDistance(0)
      setIsDragging(false)
      return { wasDragging }
    } else if (e.touches.length === 1) {
      // Went from two touches to one - reset single touch state
      const touch = e.touches[0]
      setMouseDownPosition({ x: touch.clientX, y: touch.clientY })
      setHasMouseMoved(false)
      setDragStart({
        x: touch.clientX - pan.x,
        y: touch.clientY - pan.y
      })
      setTouchStartDistance(0)
    }
    
    return { wasDragging: false }
  }, [hasMouseMoved, pan])

  const handleNodeTouchStart = useCallback((e: React.TouchEvent | TouchEvent, nodeId: string, nodePosition: Position) => {
    e.stopPropagation()
    
    // Reset any previous drag state first
    setDraggedNode(null)
    setHasMouseMoved(false)
    setIsDragging(false)
    
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      
      // Store initial touch info but don't set drag state immediately
      // This allows short taps to work as clicks
      setMouseDownPosition({ x: touch.clientX, y: touch.clientY })
      setNodeDragStart(nodePosition)
      setDragStart({
        x: touch.clientX - nodePosition.x * zoom - pan.x,
        y: touch.clientY - nodePosition.y * zoom - pan.y
      })
      
      // Only set drag state after a small delay or movement detection
      // This is handled by the TreeCanvas touch handlers now
    }
  }, [zoom, pan, draggedNode, isDragging, hasMouseMoved])

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
    isTouching,
    handleZoomIn,
    handleZoomOut,
    handleResetView,
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
    setZoom,
    setPan,
    setIsDragging,
    setDraggedNode
  }
}
