import { Edit, Trash2, Plus, X, Minus, Maximize2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Node } from "../shared/types";
import { getNodeIcon, getNodeTypeLabel, canCreateChild } from "../shared/utils";
import { usePlanLimits } from "../../../../hooks/usePlanLimits";
import { useAppToast } from "../../../../hooks/useAppToast";

interface NodePanelProps {
  node: Node | null;
  onClose: () => void;
  onEdit: (node: Node) => void;
  onDelete: (node: Node) => void;
  onCreate: (type: "department" | "service", parent: Node) => void;
  // Role permissions
  canEditNode?: boolean;
  canDeleteNode?: boolean;
  canCreateDepartment?: boolean;
  canCreateService?: boolean;
}

export const NodePanel = ({
  node,
  onClose,
  onEdit,
  onDelete,
  onCreate,
  canEditNode = true,
  canDeleteNode = true,
  canCreateDepartment = true,
  canCreateService = true,
}: NodePanelProps) => {
  const { checkLimits, getLimitMessage } = usePlanLimits();
  const { showWarning } = useAppToast();

  const [isMinimized, setIsMinimized] = useState(() => {
    // Load minimized state from localStorage (only on client-side)
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("node-panel-minimized");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Optimized delete handler to avoid performance issues
  const handleDelete = useCallback(() => {
    if (!node) return;

    showWarning(
      `Delete ${node.name}?`,
      `Are you sure you want to delete "${node.name}"? This action cannot be undone.`,
      {
        label: "Delete",
        onClick: () => {
          onDelete(node);
        },
      }
    );
  }, [node, onDelete, showWarning]);

  // Optimized edit handler
  const handleEdit = useCallback(() => {
    if (!node) return;
    onEdit(node);
  }, [node, onEdit]);

  // Save minimized state to localStorage (only on client-side)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("node-panel-minimized", JSON.stringify(isMinimized));
    } catch {
      // Ignore localStorage errors
    }
  }, [isMinimized]);

  if (!node) return null;

  const Icon = getNodeIcon(node.type);
  const childType = canCreateChild(node.type);

  return (
    <div
      className={`absolute top-4 left-4 bg-white/10 backdrop-blur-md rounded-xl shadow-xl border border-white/20 z-10 transition-all duration-300 ${
        isMinimized ? "w-64" : "w-80"
      }`}
    >
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg node-icon">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">{node.name}</h3>
              <p className="text-sm text-white/70">
                {getNodeTypeLabel(node.type)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
              aria-label={isMinimized ? "Expand panel" : "Minimize panel"}
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
              aria-label="Close panel"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible content */}
      {!isMinimized && (
        <div className="p-4 space-y-4">
          {/* Description */}
          <div>
            <h4 className="text-sm font-medium text-white/90 mb-1">
              Description
            </h4>
            <p className="text-sm text-white/70">
              {node.description || "No description provided"}
            </p>
          </div>

          {/* Branch-specific details */}
          {node.type === "branch" && (
            <div className="space-y-3">
              {(node as any).address && (
                <div>
                  <h4 className="text-sm font-medium text-white/90 mb-1">
                    Address
                  </h4>
                  <p className="text-sm text-white/70">
                    {(node as any).address}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {(node as any).phone && (
                  <div>
                    <h4 className="text-sm font-medium text-white/90 mb-1">
                      Phone
                    </h4>
                    <p className="text-sm text-white/70">
                      {(node as any).phone}
                    </p>
                  </div>
                )}
                {(node as any).email && (
                  <div>
                    <h4 className="text-sm font-medium text-white/90 mb-1">
                      Email
                    </h4>
                    <p className="text-sm text-white/70">
                      {(node as any).email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Service-specific details */}
          {node.type === "service" && (
            <div className="space-y-3">
              {(node as any).estimated_time && (
                <div>
                  <h4 className="text-sm font-medium text-white/90 mb-1">
                    Estimated Time
                  </h4>
                  <p className="text-sm text-white/70">
                    {(node as any).estimated_time} minutes
                  </p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-white/90 mb-1">
                  Status
                </h4>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    (node as any).is_active
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {(node as any).is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          )}

          {/* Children count */}
          <div>
            <h4 className="text-sm font-medium text-white/90 mb-1">
              {node.type === "branch"
                ? "Departments"
                : node.type === "department"
                ? "Services"
                : "Children"}
            </h4>
            <p className="text-sm text-white/70">
              {node.children.length} item{node.children.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/20">
            {canEditNode && (
              <button
                onClick={handleEdit}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit {getNodeTypeLabel(node.type)}
              </button>
            )}

            {childType &&
              (() => {
                const limits = checkLimits();
                const canCreateByPlan =
                  childType === "department"
                    ? limits.canCreateDepartment
                    : limits.canCreateService;
                const canCreateByRole =
                  childType === "department"
                    ? canCreateDepartment
                    : canCreateService;
                const canCreate = canCreateByPlan && canCreateByRole;

                return (
                  <button
                    onClick={() => {
                      if (canCreate) {
                        onCreate(childType as "department" | "service", node);
                      } else {
                        // Show toast when clicking disabled button
                        const message = canCreateByRole
                          ? getLimitMessage(
                              childType as "department" | "service"
                            )
                          : "You do not have permission to create this item";
                        showWarning(
                          `${
                            childType === "department"
                              ? "Department"
                              : "Service"
                          } ${
                            canCreateByRole ? "Limit Reached" : "Access Denied"
                          }`,
                          message,
                          canCreateByRole
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
                        : !canCreateByRole
                        ? "Access denied"
                        : getLimitMessage(childType as "department" | "service")
                    }
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      canCreate
                        ? "text-blue-300 hover:text-blue-200 hover:bg-blue-500/20"
                        : "text-white/40 cursor-not-allowed opacity-25 bg-red-500/20 border-2 border-red-500"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Add {getNodeTypeLabel(childType)}
                  </button>
                );
              })()}

            {canDeleteNode && (
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete {getNodeTypeLabel(node.type)}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
