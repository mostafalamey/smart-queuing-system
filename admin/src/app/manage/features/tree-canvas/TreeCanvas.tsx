import { useRef, useEffect } from 'react'
import { Building, Edit, Trash2, Plus } from 'lucide-react'
import { Node, Connection, Position } from '../shared/types'
import { getNodeIcon, getNodeDimensions, getNodeStats, canCreateChild } from '../shared/utils'

interface TreeCanvasProps {
  nodes: Node[]
  connections: Connection[]
  zoom: number
  pan: Position
  selectedNode: Node | null
  hoveredNode: string | null
  hasMouseMoved: boolean
  onNodeSelect: (node: Node | null) => void
  onNodeHover: (nodeId: string | null) => void
  onNodeEdit: (node: Node) => void
  onNodeDelete: (node: Node) => void
  onNodeCreate: (type: 'branch' | 'department' | 'service', parent?: Node) => void
  onNodeMouseDown: (e: React.MouseEvent, nodeId: string, position: Position) => void
  onMouseDown: (e: React.MouseEvent) => void
  onWheel: (e: WheelEvent) => void
  onTouchStart?: (e: React.TouchEvent) => void
  onTouchMove?: (e: React.TouchEvent) => void | { nodeId: string; position: Position } | null
  onTouchEnd?: (e: React.TouchEvent) => void
  onNodeTouchStart?: (e: React.TouchEvent, nodeId: string, position: Position) => void
  startNodeDrag?: (nodeId: string) => void
}

export const TreeCanvas = ({
  nodes,
  connections,
  zoom,
  pan,
  selectedNode,
  hoveredNode,
  hasMouseMoved,
  onNodeSelect,
  onNodeHover,
  onNodeEdit,
  onNodeDelete,
  onNodeCreate,
  onNodeMouseDown,
  onMouseDown,
  onWheel,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onNodeTouchStart,
  startNodeDrag
}: TreeCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleNativeWheel = (e: WheelEvent) => {
      const rect = canvas.getBoundingClientRect()
      onWheel(e)
    }

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleNativeWheel)
  }, [onWheel])

  // Native touch event handlers to prevent passive event listener issues
  useEffect(() => {
    const touchCanvas = canvasRef.current
    if (!touchCanvas) return
    
    // Only enable touch handlers on actual touch devices, not desktop mobile simulation
    const isActualTouchDevice = (() => {
      // Check if touch is supported
      const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      if (!hasTouchSupport) return false
      
      // Check user agent for actual mobile/tablet indicators
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
      
      // Additional check: if it's a desktop browser pretending to be mobile, 
      // it usually has a mouse cursor and large screen
      const hasMouseCursor = window.matchMedia('(pointer: fine)').matches
      const isLargeScreen = window.innerWidth > 1024 || window.innerHeight > 768
      
      // If it has fine pointer control (mouse) AND large screen, probably desktop simulation
      if (hasMouseCursor && isLargeScreen && !isMobile) {
        return false
      }
      
      return true
    })()
    
    if (!isActualTouchDevice) {
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return

    const handleNativeTouchStart = (e: TouchEvent) => {
      // Check if this event was already handled by a node (event bubbling from node)
      if (e.target && e.target !== touchCanvas && touchCanvas.contains(e.target as unknown as globalThis.Node)) {
        const targetElement = e.target as HTMLElement
        if (targetElement.closest('.tree-node-wrapper')) {
          return // Don't handle canvas touch if it came from a node
        }
      }
      
      e.preventDefault()
      
      // Create a proper React.TouchEvent-like object with explicit touch properties
      const reactEvent = {
        touches: e.touches,
        changedTouches: e.changedTouches,
        targetTouches: e.targetTouches,
        currentTarget: touchCanvas,
        target: e.target,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        nativeEvent: e,
        bubbles: e.bubbles,
        cancelable: e.cancelable,
        defaultPrevented: e.defaultPrevented,
        eventPhase: e.eventPhase,
        isTrusted: e.isTrusted,
        timeStamp: e.timeStamp,
        type: e.type,
        altKey: e.altKey || false,
        ctrlKey: e.ctrlKey || false,
        metaKey: e.metaKey || false,
        shiftKey: e.shiftKey || false,
        getModifierState: () => false,
        isDefaultPrevented: () => e.defaultPrevented,
        isPropagationStopped: () => false,
        persist: () => {},
        detail: 0,
        view: null
      } as unknown as React.TouchEvent
      
      onTouchStart && onTouchStart(reactEvent)
    }

    const handleNativeTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      
      const reactEvent = {
        touches: e.touches,
        changedTouches: e.changedTouches,
        targetTouches: e.targetTouches,
        currentTarget: touchCanvas,
        target: e.target,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        nativeEvent: e,
        bubbles: e.bubbles,
        cancelable: e.cancelable,
        defaultPrevented: e.defaultPrevented,
        eventPhase: e.eventPhase,
        isTrusted: e.isTrusted,
        timeStamp: e.timeStamp,
        type: e.type,
        altKey: e.altKey || false,
        ctrlKey: e.ctrlKey || false,
        metaKey: e.metaKey || false,
        shiftKey: e.shiftKey || false,
        getModifierState: () => false,
        isDefaultPrevented: () => e.defaultPrevented,
        isPropagationStopped: () => false,
        persist: () => {},
        detail: 0,
        view: null
      } as unknown as React.TouchEvent
      
      onTouchMove && onTouchMove(reactEvent)
    }

    const handleNativeTouchEnd = (e: TouchEvent) => {
      e.preventDefault()
      
      const reactEvent = {
        touches: e.touches,
        changedTouches: e.changedTouches,
        targetTouches: e.targetTouches,
        currentTarget: touchCanvas,
        target: e.target,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        nativeEvent: e,
        bubbles: e.bubbles,
        cancelable: e.cancelable,
        defaultPrevented: e.defaultPrevented,
        eventPhase: e.eventPhase,
        isTrusted: e.isTrusted,
        timeStamp: e.timeStamp,
        type: e.type,
        altKey: e.altKey || false,
        ctrlKey: e.ctrlKey || false,
        metaKey: e.metaKey || false,
        shiftKey: e.shiftKey || false,
        getModifierState: () => false,
        isDefaultPrevented: () => e.defaultPrevented,
        isPropagationStopped: () => false,
        persist: () => {},
        detail: 0,
        view: null
      } as unknown as React.TouchEvent
      
      onTouchEnd && onTouchEnd(reactEvent)
    }

    if (onTouchStart) {
      touchCanvas.addEventListener('touchstart', handleNativeTouchStart, { passive: false })
    }
    if (onTouchMove) {
      touchCanvas.addEventListener('touchmove', handleNativeTouchMove, { passive: false })
    }
    if (onTouchEnd) {
      touchCanvas.addEventListener('touchend', handleNativeTouchEnd, { passive: false })
    }

    return () => {
      touchCanvas.removeEventListener('touchstart', handleNativeTouchStart)
      touchCanvas.removeEventListener('touchmove', handleNativeTouchMove)
      touchCanvas.removeEventListener('touchend', handleNativeTouchEnd)
    }
  }, [onTouchStart, onTouchMove, onTouchEnd])

  const handleMouseDownEvent = (e: React.MouseEvent) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    onMouseDown(e)
  }

  return (
    <div
      ref={canvasRef}
      className="tree-canvas"
      onMouseDown={handleMouseDownEvent}
    >
      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Organization Structure</h3>
            <p className="text-white/70 mb-4">Start by creating your first branch</p>
            <button
              onClick={() => onNodeCreate('branch')}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create First Branch
            </button>
          </div>
        </div>
      )}

      {/* SVG for connections */}
      <svg
        className="tree-svg-container tree-svg-transformed"
        ref={(el) => {
          if (el) {
            el.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }
        }}
      >
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
          </linearGradient>
          <filter id="connectionGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {connections.map((connection, index) => {
          const fromNode = nodes.find(n => n.id === connection.from)
          const toNode = nodes.find(n => n.id === connection.to)
          
          if (!fromNode || !toNode) return null

          const fromDimensions = getNodeDimensions(fromNode.type)
          const toDimensions = getNodeDimensions(toNode.type)

          // Start from middle bottom edge of parent node
          const startX = fromNode.position.x + fromDimensions.width / 2
          const startY = fromNode.position.y + fromDimensions.height
          // End at middle top edge of child node
          const endX = toNode.position.x + toDimensions.width / 2
          const endY = toNode.position.y

          // Create curved path
          const verticalOffset = Math.min(60, Math.abs(endY - startY) * 0.4)
          const controlX1 = startX
          const controlY1 = startY + verticalOffset
          const controlX2 = endX
          const controlY2 = endY - verticalOffset

          return (
            <g key={`connection-${index}`}>
              {/* Connection shadow */}
              <path
                d={`M ${startX} ${startY} C ${controlX1} ${controlY1} ${controlX2} ${controlY2} ${endX} ${endY}`}
                stroke="#000000"
                strokeWidth="4"
                fill="none"
                opacity="0.1"
                transform="translate(2, 2)"
              />
              {/* Main connection line */}
              <path
                d={`M ${startX} ${startY} C ${controlX1} ${controlY1} ${controlX2} ${controlY2} ${endX} ${endY}`}
                stroke="url(#connectionGradient)"
                strokeWidth="3"
                fill="none"
                filter="url(#connectionGlow)"
              />
              {/* End point indicator */}
              <circle
                cx={endX}
                cy={endY}
                r="5"
                fill="url(#connectionGradient)"
                filter="url(#connectionGlow)"
              />
              {/* Start point indicator */}
              <circle
                cx={startX}
                cy={startY}
                r="3"
                fill="url(#connectionGradient)"
              />
            </g>
          )
        })}
      </svg>

      {/* Nodes */}
      <div
        className="tree-nodes-container tree-nodes-transformed"
        ref={(el) => {
          if (el) {
            el.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          }
        }}
      >
        {nodes.map((node) => {
          const Icon = getNodeIcon(node.type)
          const childType = canCreateChild(node.type)
          
          return (
            <div
              key={node.id}
              className="tree-node-wrapper tree-node-positioned"
              ref={(el) => {
                if (el) {
                  el.style.left = `${node.position.x}px`
                  el.style.top = `${node.position.y}px`
                  
                  // Clean up any existing touch listener first
                  if ((el as any)._touchCleanup) {
                    ;(el as any)._touchCleanup()
                  }
                  
                  // Add touch event listener with proper device detection
                  if (onNodeTouchStart && !(el as any)._hasTouch) {
                    // Only enable touch handlers on actual touch devices, not desktop mobile simulation
                    const isActualTouchDevice = (() => {
                      // Check if touch is supported
                      const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0
                      
                      if (!hasTouchSupport) return false
                      
                      // Check user agent for actual mobile/tablet indicators
                      const userAgent = navigator.userAgent.toLowerCase()
                      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
                      
                      // Additional check: if it's a desktop browser pretending to be mobile, 
                      // it usually has a mouse cursor and large screen
                      const hasMouseCursor = window.matchMedia('(pointer: fine)').matches
                      const isLargeScreen = window.innerWidth > 1024 || window.innerHeight > 768
                      
                      // If it has fine pointer control (mouse) AND large screen, probably desktop simulation
                      if (hasMouseCursor && isLargeScreen && !isMobile) {
                        return false
                      }
                      
                      return true
                    })()
                    
                    if (isActualTouchDevice) {
                      let touchStartTime = 0
                      let touchStartPos = { x: 0, y: 0 }
                      let isDragDetected = false
                      
                      const handleNodeTouchStart = (e: Event) => {
                        const touchEvent = e as TouchEvent
                        
                        touchStartTime = Date.now()
                        touchStartPos = { x: touchEvent.touches[0].clientX, y: touchEvent.touches[0].clientY }
                        isDragDetected = false
                        
                        // Don't prevent default yet - let click events work for short taps
                        touchEvent.stopPropagation()
                        
                        const reactEvent = {
                          touches: touchEvent.touches,
                          changedTouches: touchEvent.changedTouches,
                          targetTouches: touchEvent.targetTouches,
                          currentTarget: el,
                          target: touchEvent.target,
                          preventDefault: () => touchEvent.preventDefault(),
                          stopPropagation: () => touchEvent.stopPropagation(),
                          nativeEvent: touchEvent,
                          bubbles: touchEvent.bubbles,
                          cancelable: touchEvent.cancelable,
                          defaultPrevented: touchEvent.defaultPrevented,
                          eventPhase: touchEvent.eventPhase,
                          isTrusted: touchEvent.isTrusted,
                          timeStamp: touchEvent.timeStamp,
                          type: touchEvent.type,
                          altKey: touchEvent.altKey || false,
                          ctrlKey: touchEvent.ctrlKey || false,
                          metaKey: touchEvent.metaKey || false,
                          shiftKey: touchEvent.shiftKey || false,
                          getModifierState: () => false,
                          isDefaultPrevented: () => touchEvent.defaultPrevented,
                          isPropagationStopped: () => false,
                          persist: () => {},
                          detail: 0,
                          view: null
                        } as unknown as React.TouchEvent
                        
                        onNodeTouchStart(reactEvent, node.id, node.position)
                      }
                      
                      const handleNodeTouchMove = (e: Event) => {
                        const touchEvent = e as TouchEvent
                        if (touchEvent.touches.length === 1) {
                          const touch = touchEvent.touches[0]
                          const deltaX = Math.abs(touch.clientX - touchStartPos.x)
                          const deltaY = Math.abs(touch.clientY - touchStartPos.y)
                          
                          // If moved more than 10 pixels, it's a drag
                          if (deltaX > 10 || deltaY > 10) {
                            isDragDetected = true
                            touchEvent.preventDefault() // Now prevent default to enable dragging
                            touchEvent.stopPropagation()
                            
                            // Start the actual drag operation
                            if (startNodeDrag) {
                              startNodeDrag(node.id)
                            }
                          }
                        }
                      }
                      
                      const handleNodeTouchEnd = (e: Event) => {
                        const touchEvent = e as TouchEvent
                        const touchDuration = Date.now() - touchStartTime
                        
                        // If it was a short tap (less than 200ms) and no significant movement
                        if (!isDragDetected && touchDuration < 200) {
                          // Don't prevent default - let the click event fire naturally
                          return
                        }
                        
                        // For longer touches or drags, prevent click events
                        if (isDragDetected) {
                          touchEvent.preventDefault()
                        }
                      }
                      
                      el.addEventListener('touchstart', handleNodeTouchStart, { passive: false, capture: false })
                      el.addEventListener('touchmove', handleNodeTouchMove, { passive: false, capture: false })
                      el.addEventListener('touchend', handleNodeTouchEnd, { passive: false, capture: false })
                      ;(el as any)._hasTouch = true
                      
                      // Store cleanup function
                      ;(el as any)._touchCleanup = () => {
                        el.removeEventListener('touchstart', handleNodeTouchStart, { capture: false })
                        el.removeEventListener('touchmove', handleNodeTouchMove, { capture: false })
                        el.removeEventListener('touchend', handleNodeTouchEnd, { capture: false })
                        ;(el as any)._hasTouch = false
                      }
                    }
                  }
                } else {
                  // Cleanup when element is removed
                  if ((el as any)?._touchCleanup) {
                    ;(el as any)._touchCleanup()
                  }
                }
              }}
              onMouseEnter={() => onNodeHover(node.id)}
              onMouseLeave={() => onNodeHover(null)}
              onMouseDown={(e) => onNodeMouseDown(e, node.id, node.position)}
            >
              <div
                className={`tree-node ${node.type} ${selectedNode?.id === node.id ? 'tree-node-selected' : ''}`}
                onClick={() => {
                  // Only select the node if it wasn't dragged
                  if (!hasMouseMoved) {
                    onNodeSelect(node)
                  }
                }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2 node-header">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg node-icon">
                            <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                            {node.type}
                        </span>
                        <div className="flex gap-1">
                        <button
                            onClick={(e) => {
                            e.stopPropagation()
                            onNodeEdit(node)
                            }}
                            className="p-1 rounded hover:bg-gray-100 transition-colors flex items-center justify-center"
                            title="Edit"
                            aria-label={`Edit ${node.name}`}
                        >
                            <Edit className="w-5 h-5 text-gray-500" />
                        </button>
                        <button
                            onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Delete ${node.name}?`)) {
                                onNodeDelete(node)
                            }
                            }}
                            className="p-1 rounded hover:bg-gray-100 transition-colors flex items-center justify-center"
                            title="Delete"
                            aria-label={`Delete ${node.name}`}
                        >
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                        </div>
                    </div>
                    
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">
                    {node.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {node.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {getNodeStats(node)}
                    </span>
                    
                    {childType && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onNodeCreate(childType as 'department' | 'service', node)
                        }}
                        className="p-1 rounded-full hover:bg-blue-50 transition-colors group flex items-center justify-center"
                        title={`Add ${childType}`}
                        aria-label={`Add ${childType} to ${node.name}`}
                      >
                        <Plus className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
