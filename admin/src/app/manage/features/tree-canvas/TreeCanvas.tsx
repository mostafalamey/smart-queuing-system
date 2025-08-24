import { useRef, useEffect } from "react";
import { Building, Edit, Trash2, Plus } from "lucide-react";
import { Node, Connection, Position } from "../shared/types";
import {
  getNodeIcon,
  getNodeDimensions,
  getNodeStats,
  canCreateChild,
} from "../shared/utils";
import { usePlanLimits } from "../../../../hooks/usePlanLimits";
import { useAppToast } from "../../../../hooks/useAppToast";

interface TreeCanvasProps {
  nodes: Node[];
  connections: Connection[];
  zoom: number;
  pan: Position;
  selectedNode: Node | null;
  hoveredNode: string | null;
  hasMouseMoved: boolean;
  onNodeSelect: (node: Node | null) => void;
  onNodeHover: (nodeId: string | null) => void;
  onNodeEdit: (node: Node) => void;
  onNodeDelete: (node: Node) => void;
  onNodeCreate: (
    type: "branch" | "department" | "service",
    parent?: Node
  ) => void;
  onNodeMouseDown: (
    e: React.MouseEvent,
    nodeId: string,
    position: Position
  ) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onWheel: (e: WheelEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (
    e: React.TouchEvent
  ) => void | { nodeId: string; position: Position } | null;
  onTouchEnd?: (e: React.TouchEvent) => void;
  startNodeDrag?: (nodeId: string) => void;
  startTouchNodeDrag?: (
    nodeId: string,
    touchPosition: Position,
    nodePosition: Position
  ) => void;
  // Role permissions
  canCreateDepartment?: boolean;
  canCreateService?: boolean;
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
  startNodeDrag,
  startTouchNodeDrag,
  canCreateDepartment = true,
  canCreateService = true,
}: TreeCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const { checkLimits, getLimitMessage } = usePlanLimits();
  const { showWarning } = useAppToast();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      onWheel(e);
    };

    canvas.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleNativeWheel);
  }, [onWheel]);

  // Native touch event handlers - simplified for two-finger pan only
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if this is an actual touch device
    const hasTouchSupport =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (!hasTouchSupport) return;

    const handleNativeTouchStart = (e: TouchEvent) => {
      // Only handle two-finger touches at canvas level
      if (e.touches.length === 2) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const reactEvent = createTouchEventProxy(e, canvas);
        onTouchStart && onTouchStart(reactEvent);
      }
      // Single finger touches are ignored - let them bubble to nodes for clicks
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      // Only handle two-finger gestures
      if (e.touches.length === 2) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const reactEvent = createTouchEventProxy(e, canvas);
        onTouchMove && onTouchMove(reactEvent);
      }
    };

    const handleNativeTouchEnd = (e: TouchEvent) => {
      // Handle end of two-finger gestures
      if (e.touches.length < 2) {
        const reactEvent = createTouchEventProxy(e, canvas);
        onTouchEnd && onTouchEnd(reactEvent);
      }
    };

    // Helper function to create touch event proxy
    const createTouchEventProxy = (e: TouchEvent, target: Element) => {
      return {
        touches: e.touches,
        changedTouches: e.changedTouches,
        targetTouches: e.targetTouches,
        currentTarget: target,
        target: e.target,
        preventDefault: () => e.preventDefault(),
        stopPropagation: () => e.stopPropagation(),
        nativeEvent: e,
      } as unknown as React.TouchEvent;
    };

    canvas.addEventListener("touchstart", handleNativeTouchStart, {
      passive: false,
    });
    canvas.addEventListener("touchmove", handleNativeTouchMove, {
      passive: false,
    });
    canvas.addEventListener("touchend", handleNativeTouchEnd, {
      passive: false,
    });

    return () => {
      canvas.removeEventListener("touchstart", handleNativeTouchStart);
      canvas.removeEventListener("touchmove", handleNativeTouchMove);
      canvas.removeEventListener("touchend", handleNativeTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  const handleMouseDownEvent = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    onMouseDown(e);
  };

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
            <h3 className="text-xl font-semibold mb-2">
              No Organization Structure
            </h3>
            <p className="text-white/70 mb-4">
              Start by creating your first branch
            </p>
            <button
              onClick={() => onNodeCreate("branch")}
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
            el.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
          }
        }}
      >
        <defs>
          <linearGradient
            id="connectionGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
          </linearGradient>
          <filter
            id="connectionGlow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {connections.map((connection, index) => {
          const fromNode = nodes.find((n) => n.id === connection.from);
          const toNode = nodes.find((n) => n.id === connection.to);

          if (!fromNode || !toNode) return null;

          const fromDimensions = getNodeDimensions(fromNode.type);
          const toDimensions = getNodeDimensions(toNode.type);

          // Start from middle bottom edge of parent node
          const startX = fromNode.position.x + fromDimensions.width / 2;
          const startY = fromNode.position.y + fromDimensions.height;
          // End at middle top edge of child node
          const endX = toNode.position.x + toDimensions.width / 2;
          const endY = toNode.position.y;

          // Create curved path
          const verticalOffset = Math.min(60, Math.abs(endY - startY) * 0.4);
          const controlX1 = startX;
          const controlY1 = startY + verticalOffset;
          const controlX2 = endX;
          const controlY2 = endY - verticalOffset;

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
          );
        })}
      </svg>

      {/* Nodes */}
      <div
        className="tree-nodes-container tree-nodes-transformed"
        ref={(el) => {
          if (el) {
            el.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
          }
        }}
      >
        {nodes.map((node) => {
          const Icon = getNodeIcon(node.type);
          const childType = canCreateChild(node.type);

          return (
            <div
              key={node.id}
              className="tree-node-wrapper tree-node-positioned"
              ref={(el) => {
                if (el) {
                  el.style.left = `${node.position.x}px`;
                  el.style.top = `${node.position.y}px`;

                  // Clean up any existing touch listener first
                  if ((el as any)._touchCleanup) {
                    (el as any)._touchCleanup();
                  }

                  // For touch devices, add long-press detection that integrates with canvas touch move
                  const hasTouchSupport =
                    "ontouchstart" in window || navigator.maxTouchPoints > 0;

                  if (hasTouchSupport && !(el as any)._hasTouch) {
                    let longPressTimer: NodeJS.Timeout | null = null;
                    let touchStartPos = { x: 0, y: 0 };
                    let hasMovedDuringTouch = false;

                    const handleNodeTouchStart = (e: TouchEvent) => {
                      // Only handle single finger touches
                      if (e.touches.length === 1) {
                        const touch = e.touches[0];
                        touchStartPos = { x: touch.clientX, y: touch.clientY };
                        hasMovedDuringTouch = false;

                        // Start a long press timer for drag initiation
                        longPressTimer = setTimeout(() => {
                          if (!hasMovedDuringTouch && startTouchNodeDrag) {
                            // Long press detected - start drag mode with proper integration
                            startTouchNodeDrag(
                              node.id,
                              touchStartPos,
                              node.position
                            );

                            // Add haptic feedback if available
                            if (navigator.vibrate) {
                              navigator.vibrate(50);
                            }
                          }
                        }, 300); // 300ms long press
                      }
                    };

                    const handleNodeTouchMove = (e: TouchEvent) => {
                      if (e.touches.length === 1) {
                        const touch = e.touches[0];
                        const deltaX = Math.abs(
                          touch.clientX - touchStartPos.x
                        );
                        const deltaY = Math.abs(
                          touch.clientY - touchStartPos.y
                        );

                        // If moved more than 10 pixels during long press, cancel it
                        if (deltaX > 10 || deltaY > 10) {
                          hasMovedDuringTouch = true;
                          if (longPressTimer) {
                            clearTimeout(longPressTimer);
                            longPressTimer = null;
                          }
                        }
                      }
                    };

                    const handleNodeTouchEnd = (e: TouchEvent) => {
                      // Clean up long press timer
                      if (longPressTimer) {
                        clearTimeout(longPressTimer);
                        longPressTimer = null;
                      }

                      // For short taps without movement, let normal click events handle it
                      // Don't preventDefault here so native click events can fire
                    };

                    el.addEventListener("touchstart", handleNodeTouchStart, {
                      passive: false,
                    });
                    el.addEventListener("touchmove", handleNodeTouchMove, {
                      passive: false,
                    });
                    el.addEventListener("touchend", handleNodeTouchEnd, {
                      passive: false,
                    });
                    (el as any)._hasTouch = true;

                    // Store cleanup function
                    (el as any)._touchCleanup = () => {
                      if (longPressTimer) {
                        clearTimeout(longPressTimer);
                      }
                      el.removeEventListener(
                        "touchstart",
                        handleNodeTouchStart
                      );
                      el.removeEventListener("touchmove", handleNodeTouchMove);
                      el.removeEventListener("touchend", handleNodeTouchEnd);
                      (el as any)._hasTouch = false;
                    };
                  }
                } else {
                  // Cleanup when element is removed
                  if ((el as any)?._touchCleanup) {
                    (el as any)._touchCleanup();
                  }
                }
              }}
              onMouseEnter={() => onNodeHover(node.id)}
              onMouseLeave={() => onNodeHover(null)}
              onMouseDown={(e) => onNodeMouseDown(e, node.id, node.position)}
            >
              <div
                className={`tree-node ${node.type} ${
                  selectedNode?.id === node.id ? "tree-node-selected" : ""
                }`}
                onClick={() => {
                  // Only select the node if it wasn't dragged
                  if (!hasMouseMoved) {
                    onNodeSelect(node);
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
                            e.stopPropagation();
                            onNodeEdit(node);
                          }}
                          className="p-1 rounded hover:bg-gray-100 transition-colors flex items-center justify-center"
                          title="Edit"
                          aria-label={`Edit ${node.name}`}
                        >
                          <Edit className="w-5 h-5 text-gray-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            showWarning(
                              `Delete ${node.name}?`,
                              `Are you sure you want to delete "${node.name}"? This action cannot be undone.`,
                              {
                                label: "Delete",
                                onClick: () => {
                                  onNodeDelete(node);
                                },
                              }
                            );
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

                    {childType &&
                      (() => {
                        const limits = checkLimits();
                        const hasPlanAllowance =
                          childType === "department"
                            ? limits.canCreateDepartment
                            : limits.canCreateService;
                        const hasRolePermission =
                          childType === "department"
                            ? canCreateDepartment
                            : canCreateService;
                        const canCreate = hasPlanAllowance && hasRolePermission;

                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canCreate) {
                                onNodeCreate(
                                  childType as "department" | "service",
                                  node
                                );
                              } else {
                                // Show toast when clicking disabled button
                                const message = !hasRolePermission
                                  ? `You do not have permission to create ${childType}s`
                                  : getLimitMessage(
                                      childType as "department" | "service"
                                    );
                                showWarning(
                                  `${
                                    childType === "department"
                                      ? "Department"
                                      : "Service"
                                  } ${
                                    !hasRolePermission
                                      ? "Access Denied"
                                      : "Limit Reached"
                                  }`,
                                  message,
                                  hasRolePermission && !hasPlanAllowance
                                    ? {
                                        label: "Upgrade Plan",
                                        onClick: () => {
                                          window.location.href =
                                            "/manage/organization?tab=plan-billing";
                                        },
                                      }
                                    : undefined
                                );
                              }
                            }}
                            disabled={!canCreate}
                            title={
                              canCreate
                                ? `Add ${childType}`
                                : !hasRolePermission
                                ? `You do not have permission to create ${childType}s`
                                : getLimitMessage(
                                    childType as "department" | "service"
                                  )
                            }
                            className={`p-1 rounded-full transition-colors group flex items-center justify-center ${
                              canCreate
                                ? "hover:bg-blue-50 cursor-pointer"
                                : "cursor-not-allowed opacity-50 bg-red-50"
                            }`}
                            aria-label={
                              canCreate
                                ? `Add ${childType} to ${node.name}`
                                : !hasRolePermission
                                ? `Cannot add ${childType} - access denied`
                                : `Cannot add ${childType} - limit reached`
                            }
                          >
                            <Plus
                              className={`w-5 h-5 ${
                                canCreate
                                  ? "text-gray-400 group-hover:text-blue-600"
                                  : "text-red-400"
                              }`}
                            />
                          </button>
                        );
                      })()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
