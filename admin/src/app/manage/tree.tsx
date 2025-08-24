"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { logger } from "@/lib/logger";
import { useAuth } from "@/lib/AuthContext";
import { useAppToast } from "@/hooks/useAppToast";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { Node, NodeFormData } from "./features/shared/types";
import {
  calculateAutoLayout,
  calculateChildrenPositions,
  calculateZoomToFitAll,
} from "./features/shared/utils";
import { useTreeData } from "./features/shared/useTreeData";
import { useTreeInteraction } from "./features/shared/useTreeInteraction";
import { useNodeOperations } from "./features/shared/useNodeOperations";
import { TreeControls } from "./features/tree-controls/TreeControls";
import { TreeCanvas } from "./features/tree-canvas/TreeCanvas";
import { NodeModal } from "./features/node-modal/NodeModal";
import { NodePanel } from "./features/node-panel/NodePanel";

export default function ManageTreePage() {
  const { user, userProfile } = useAuth();
  const { showSuccess } = useAppToast();
  const permissions = useRolePermissions();

  // Optimized node selection handler to prevent performance issues
  const handleNodeSelection = useCallback((node: Node | null) => {
    setSelectedNode(node);
  }, []);

  // State for UI
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [creatingNodeType, setCreatingNodeType] = useState<
    "branch" | "department" | "service" | null
  >(null);
  const [parentNodeForCreation, setParentNodeForCreation] =
    useState<Node | null>(null);
  const [moveChildrenWithParent, setMoveChildrenWithParent] = useState(false);

  // Custom hooks
  const {
    nodes,
    connections,
    loading,
    error,
    fetchData,
    updateNodePosition,
    updateMultipleNodePositions,
    saveCurrentPositions,
    autoRearrangeNodes,
  } = useTreeData();

  const {
    zoom,
    pan,
    isDragging,
    draggedNode,
    hasMouseMoved,
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
  } = useTreeInteraction();

  const { createNode, updateNode, deleteNode } = useNodeOperations();

  // Auth redirect effect
  useEffect(() => {
    if (user === undefined || userProfile === undefined) {
      return;
    }

    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (!userProfile?.organization_id) {
      window.location.href = "/signup";
      return;
    }
  }, [user, userProfile]);

  // Mouse event handlers
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const result = handleMouseMove(e);
      if (result && result.nodeId && result.position) {
        if (moveChildrenWithParent && draggedNode) {
          // Find the old position of the parent node
          const parentNode = nodes.find((n) => n.id === result.nodeId);
          if (parentNode) {
            // Calculate child positions
            const childPositions = calculateChildrenPositions(
              result.nodeId,
              parentNode.position,
              result.position,
              nodes
            );

            // Update parent position
            const allPositions = {
              [result.nodeId]: result.position,
              ...childPositions,
            };

            updateMultipleNodePositions(allPositions);
          }
        } else {
          // Just update the single node
          updateNodePosition(result.nodeId, result.position);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      const result = handleMouseUp();
      // Additional logic can be added here if needed based on result.wasDragging
    };

    if (isDragging || draggedNode) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [
    isDragging,
    draggedNode,
    handleMouseMove,
    handleMouseUp,
    updateNodePosition,
    updateMultipleNodePositions,
    moveChildrenWithParent,
    nodes,
  ]);

  // Modal and UI handlers
  const openCreateModal = useCallback(
    (type: "branch" | "department" | "service", parent?: Node) => {
      setCreatingNodeType(type);
      setParentNodeForCreation(parent || null);
      setEditingNode(null);
      setShowNodeModal(true);
    },
    []
  );

  const openEditModal = useCallback((node: Node) => {
    setEditingNode(node);
    setCreatingNodeType(null);
    setParentNodeForCreation(null);
    setShowNodeModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowNodeModal(false);
    setEditingNode(null);
    setCreatingNodeType(null);
    setParentNodeForCreation(null);
  }, []);

  const handleModalSubmit = useCallback(
    async (formData: NodeFormData) => {
      let success = false;

      if (editingNode) {
        success = await updateNode(editingNode, formData);
      } else if (creatingNodeType) {
        success = await createNode(
          creatingNodeType,
          formData,
          parentNodeForCreation || undefined
        );
      }

      if (success) {
        closeModal();
        fetchData(); // Refresh data
      }
    },
    [
      editingNode,
      creatingNodeType,
      parentNodeForCreation,
      updateNode,
      createNode,
      closeModal,
      fetchData,
    ]
  );

  const handleDeleteNode = useCallback(
    async (node: Node) => {
      const success = await deleteNode(node);
      if (success) {
        setSelectedNode(null);
        fetchData(); // Refresh data
      }
    },
    [deleteNode, fetchData]
  );

  // Handle wheel events
  const handleCanvasWheel = useCallback(
    (e: WheelEvent) => {
      const canvas = document.querySelector(".tree-canvas") as HTMLElement;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        handleWheel(e, rect);
      }
    },
    [handleWheel]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvas = e.currentTarget as HTMLElement;
      const rect = canvas.getBoundingClientRect();
      handleMouseDown(e, rect);
    },
    [handleMouseDown]
  );

  // Touch event wrappers
  const handleCanvasTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const canvas = e.currentTarget as HTMLElement;
      const rect = canvas.getBoundingClientRect();
      handleTouchStart(e, rect);
    },
    [handleTouchStart]
  );

  const handleCanvasTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const canvas = e.currentTarget as HTMLElement;
      const rect = canvas.getBoundingClientRect();
      const result = handleTouchMove(e, rect);

      // Handle node position updates from touch dragging
      if (result && result.nodeId && result.position) {
        if (moveChildrenWithParent && draggedNode) {
          // Find the old position of the parent node
          const parentNode = nodes.find((n) => n.id === result.nodeId);
          if (parentNode) {
            // Calculate child positions
            const childPositions = calculateChildrenPositions(
              result.nodeId,
              parentNode.position,
              result.position,
              nodes
            );

            // Update parent position
            const allPositions = {
              [result.nodeId]: result.position,
              ...childPositions,
            };

            updateMultipleNodePositions(allPositions);
          }
        } else {
          // Just update the single node
          updateNodePosition(result.nodeId, result.position);
        }
      }
    },
    [
      handleTouchMove,
      updateNodePosition,
      updateMultipleNodePositions,
      moveChildrenWithParent,
      draggedNode,
      nodes,
    ]
  );

  const handleCanvasTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      handleTouchEnd(e);
    },
    [handleTouchEnd]
  );

  const handleSaveLayout = useCallback(() => {
    saveCurrentPositions();
    showSuccess(
      "Layout saved! Your node positions and viewport settings will be remembered."
    );
  }, [saveCurrentPositions, showSuccess]);

  const handleAutoRearrange = useCallback(() => {
    if (nodes.length === 0) {
      return;
    }

    const newPositions = calculateAutoLayout(nodes);
    autoRearrangeNodes(newPositions);
    showSuccess("Nodes automatically rearranged in hierarchical layout!");
  }, [nodes, autoRearrangeNodes, showSuccess]);

  const toggleMoveChildrenWithParent = useCallback(() => {
    setMoveChildrenWithParent((prev) => !prev);
  }, []);

  const handleZoomExtents = useCallback(() => {
    if (nodes.length === 0) {
      return;
    }

    // Get canvas element dimensions
    const canvasElement = document.querySelector(".tree-canvas") as HTMLElement;
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;

    if (canvasElement) {
      const rect = canvasElement.getBoundingClientRect();
      viewportWidth = rect.width;
      viewportHeight = rect.height;
    }

    const { zoom: newZoom, pan: newPan } = calculateZoomToFitAll(
      nodes,
      viewportWidth,
      viewportHeight
    );
    handleZoomToFitAll(newZoom, newPan);
    showSuccess("Zoomed to fit all nodes!");
  }, [nodes, handleZoomToFitAll, showSuccess]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading organization structure...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 relative overflow-hidden">
      {/* Tree Controls */}
      <TreeControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        onZoomExtents={handleZoomExtents}
        onCreateBranch={() => openCreateModal("branch")}
        onSaveLayout={handleSaveLayout}
        onAutoRearrange={handleAutoRearrange}
        moveChildrenWithParent={moveChildrenWithParent}
        onToggleMoveChildren={toggleMoveChildrenWithParent}
        canCreateBranch={permissions.canCreateBranch}
      />

      {/* Node Panel */}
      <NodePanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onEdit={openEditModal}
        onDelete={handleDeleteNode}
        onCreate={openCreateModal}
        canEditNode={
          selectedNode && !permissions.loading
            ? (selectedNode.type === "branch" && permissions.canEditBranch) ||
              (selectedNode.type === "department" &&
                permissions.canEditDepartment) ||
              (selectedNode.type === "service" && permissions.canEditService)
            : false
        }
        canDeleteNode={
          selectedNode && !permissions.loading
            ? (selectedNode.type === "branch" && permissions.canDeleteBranch) ||
              (selectedNode.type === "department" &&
                permissions.canDeleteDepartment) ||
              (selectedNode.type === "service" && permissions.canDeleteService)
            : false
        }
        canCreateDepartment={permissions.canCreateDepartment}
        canCreateService={permissions.canCreateService}
      />

      {/* Tree Canvas */}
      <TreeCanvas
        nodes={nodes}
        connections={connections}
        zoom={zoom}
        pan={pan}
        selectedNode={selectedNode}
        hoveredNode={hoveredNode}
        hasMouseMoved={hasMouseMoved}
        onNodeSelect={handleNodeSelection}
        onNodeHover={setHoveredNode}
        onNodeEdit={openEditModal}
        onNodeDelete={handleDeleteNode}
        onNodeCreate={openCreateModal}
        onNodeMouseDown={handleNodeMouseDown}
        onMouseDown={handleCanvasMouseDown}
        onWheel={handleCanvasWheel}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleCanvasTouchMove}
        onTouchEnd={handleCanvasTouchEnd}
        startNodeDrag={startNodeDrag}
        startTouchNodeDrag={startTouchNodeDrag}
        canCreateDepartment={permissions.canCreateDepartment}
        canCreateService={permissions.canCreateService}
      />

      {/* Node Modal */}
      <NodeModal
        isOpen={showNodeModal}
        node={editingNode}
        nodeType={creatingNodeType}
        parentNode={parentNodeForCreation}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
