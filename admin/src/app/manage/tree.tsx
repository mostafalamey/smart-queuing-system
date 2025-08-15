'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger'
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  Building, 
  Plus, 
  Edit, 
  Trash2, 
  ZoomIn,
  ZoomOut,
  Home,
  X,
  Briefcase,
  Activity
} from 'lucide-react';
import { useAppToast } from '@/hooks/useAppToast';

interface Position {
  x: number;
  y: number;
}

interface BaseNode {
  id: string;
  name: string;
  description: string;
  color: string;
  position: Position;
  children: string[];
}

interface BranchNode extends BaseNode {
  type: 'branch';
  address?: string;
  phone?: string;
  email?: string;
}

interface DepartmentNode extends BaseNode {
  type: 'department';
  branch_id: string;
  parentId: string;
}

interface ServiceNode extends BaseNode {
  type: 'service';
  department_id: string;
  parentId: string;
  estimated_time?: number;
  is_active: boolean;
}

type Node = BranchNode | DepartmentNode | ServiceNode;

interface Connection {
  from: string;
  to: string;
}

interface NodeFormData {
  name: string;
  description: string;
  address?: string;
  phone?: string;
  email?: string;
  estimated_time?: number;
  is_active?: boolean;
}

export default function ManageTreePage() {
  const { user, userProfile } = useAuth();

  const canvasRef = useRef<HTMLDivElement>(null);
  const { showSuccess, showError } = useAppToast();
  
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState<Position>({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [creatingNodeType, setCreatingNodeType] = useState<'branch' | 'department' | 'service' | null>(null);
  const [parentNodeForCreation, setParentNodeForCreation] = useState<Node | null>(null);

  useEffect(() => {
 
    // Don't redirect if we're loading auth state
    if (user === undefined || userProfile === undefined) {
      return;
    }
    
    if (!user || !userProfile?.organization_id) {
      setError('Please log in to view the organization tree');
      setLoading(false);
      return;
    }

    fetchData();
  }, [user, userProfile]);

  // Add native wheel event listener to handle preventDefault properly
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Calculate zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(3, zoom * zoomFactor));

      // Calculate new pan to zoom towards mouse position
      const zoomPointX = (mouseX - pan.x) / zoom;
      const zoomPointY = (mouseY - pan.y) / zoom;
      
      const newPanX = mouseX - zoomPointX * newZoom;
      const newPanY = mouseY - zoomPointY * newZoom;

      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleNativeWheel);
  }, [zoom, pan]);

  // localStorage functions for persistent node positions
  const saveNodePositions = (nodes: Node[]) => {
    if (!userProfile?.organization_id) return;
    
    const positions = nodes.reduce((acc, node) => {
      acc[node.id] = node.position;
      return acc;
    }, {} as Record<string, { x: number; y: number }>);
    
    localStorage.setItem(`tree-positions-${userProfile.organization_id}`, JSON.stringify(positions));
  };

  const loadNodePositions = (nodes: Node[]): Node[] => {
    if (!userProfile?.organization_id) return nodes;
    
    try {
      const savedPositions = localStorage.getItem(`tree-positions-${userProfile.organization_id}`);
      if (!savedPositions) return nodes;
      
      const positions = JSON.parse(savedPositions) as Record<string, { x: number; y: number }>;
      
      return nodes.map(node => ({
        ...node,
        position: positions[node.id] || node.position
      }));
    } catch (error) {
      logger.warn('Error loading node positions:', error);
      return nodes;
    }
  };

  const fetchData = async () => {
    if (!userProfile?.organization_id) {
      setError('No organization ID found');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch branches
      const { data: branches, error: branchError } = await supabase
        .from('branches')
        .select('*')
        .eq('organization_id', userProfile.organization_id);

      if (branchError) {
        logger.error('Branch error:', branchError);
        throw branchError;
      }

      // Fetch departments
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .in('branch_id', branches?.map(b => b.id) || []);

      if (deptError) {
        logger.error('Department error:', deptError);
        throw deptError;
      }

      // Fetch services (with error handling for missing table)
      let services: any[] = [];
      try {
        const { data: servicesData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .in('department_id', departments?.map(d => d.id) || []);
        
        if (serviceError) {
          logger.warn('Services table not found, skipping services:', serviceError.message);
        } else {
          services = servicesData || [];
        }
      } catch (error) {
        logger.warn('Services table not yet created, continuing without services');
      }

      // Convert to node format and calculate positions
      const allNodes: Node[] = [];
      const allConnections: Connection[] = [];

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
        };
        allNodes.push(branchNode);
      });

      // Add departments with improved curved positioning
      departments?.forEach((dept, index) => {
        const branchNode = allNodes.find(n => n.id === dept.branch_id);
        if (branchNode) {
          const childIndex = branchNode.children.indexOf(dept.id);
          const totalChildren = branchNode.children.length;
          
          // Calculate angle to spread departments in a semi-circle below the branch
          const angleSpread = Math.min(120, totalChildren * 30); // Max 120 degrees spread
          const startAngle = 90 - angleSpread / 2; // Center around 90 degrees (straight down)
          const angle = startAngle + (childIndex * angleSpread) / Math.max(1, totalChildren - 1);
          const distance = 280; // Distance from branch
          
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
          };
          
          allNodes.push(deptNode);
          allConnections.push({ from: dept.branch_id, to: dept.id });
        }
      });

      // Add services with improved positioning
      services?.forEach((service, index) => {
        const deptNode = allNodes.find(n => n.id === service.department_id) as DepartmentNode;
        if (deptNode) {
          const childIndex = deptNode.children.indexOf(service.id);
          const totalChildren = deptNode.children.length;
          
          // Arrange services in a small arc around the department
          const angleSpread = Math.min(90, totalChildren * 25); // Max 90 degrees
          const startAngle = 60 - angleSpread / 2; // Center around 60 degrees
          const angle = startAngle + (childIndex * angleSpread) / Math.max(1, totalChildren - 1);
          const distance = 200; // Distance from department
          
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
          };
          
          allNodes.push(serviceNode);
          allConnections.push({ from: service.department_id, to: service.id });
        }
      });

      setNodes(loadNodePositions(allNodes));
      setConnections(allConnections);

    } catch (error) {
      logger.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
      showError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Only start panning if clicking on the canvas, SVG elements, or background
    if (
      target === canvasRef.current || 
      target.classList.contains('canvas-area') ||
      target.tagName === 'svg' || 
      target.tagName === 'g' || 
      target.tagName === 'path' ||
      target.tagName === 'circle' ||
      (target.closest && !target.closest('.tree-node'))
    ) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging && !draggedNode) {
      // Calculate new pan position
      const newPanX = e.clientX - dragStart.x;
      const newPanY = e.clientY - dragStart.y;
      
      // Add pan limits to prevent excessive scrolling
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const maxPanX = canvasRect.width * 0.5;
        const maxPanY = canvasRect.height * 0.5;
        const minPanX = -canvasRect.width * 0.5;
        const minPanY = -canvasRect.height * 0.5;
        
        setPan({
          x: Math.max(minPanX, Math.min(maxPanX, newPanX)),
          y: Math.max(minPanY, Math.min(maxPanY, newPanY))
        });
      } else {
        setPan({ x: newPanX, y: newPanY });
      }
    } else if (draggedNode) {
      // Handle node dragging
      const newX = (e.clientX - pan.x - dragStart.x) / zoom;
      const newY = (e.clientY - pan.y - dragStart.y) / zoom;
      
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === draggedNode 
            ? { ...node, position: { x: newX, y: newY } }
            : node
        )
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    if (draggedNode) {
      // Save positions when a node is moved
      saveNodePositions(nodes);
    }
    setDraggedNode(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggedNode(nodeId);
      setDragStart({
        x: e.clientX - pan.x - node.position.x * zoom,
        y: e.clientY - pan.y - node.position.y * zoom
      });
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const resetView = () => {
    setZoom(0.8); // Slightly zoomed out for better overview
    // Center the view based on current viewport
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    setPan({ x: centerX - 300, y: centerY - 200 }); // Offset to center the tree better
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'branch': return Building;
      case 'department': return Briefcase;
      case 'service': return Activity;
      default: return Building;
    }
  };

  // Helper function to get node dimensions
  const getNodeDimensions = (type: string) => {
    switch (type) {
      case 'branch': return { width: 224, height: 160 }; // w-56, much taller to account for content
      case 'department': return { width: 192, height: 140 }; // w-48, much taller to account for content
      case 'service': return { width: 160, height: 100 }; // w-40, much taller to account for content
      default: return { width: 192, height: 140 };
    }
  };

  const getNodeStats = (node: Node) => {
    switch (node.type) {
      case 'branch':
        return `${node.children.length} departments`;
      case 'department':
        return `${node.children.length} services`;
      case 'service':
        const serviceNode = node as ServiceNode;
        return serviceNode.estimated_time ? `~${serviceNode.estimated_time}min` : 'No time set';
      default:
        return '';
    }
  };

  const createNode = (type: 'branch' | 'department' | 'service', parentNode?: Node) => {
    setCreatingNodeType(type);
    setParentNodeForCreation(parentNode || null);
    setEditingNode(null);
    setShowNodeModal(true);
  };

  const editNode = (node: Node) => {
    setEditingNode(node);
    setCreatingNodeType(null);
    setParentNodeForCreation(null);
    setShowNodeModal(true);
  };

  const handleNodeSubmit = async (formData: NodeFormData) => {
    try {
      if (editingNode) {
        // Update existing node
        let table = '';
        let updateData: any = {
          name: formData.name,
          description: formData.description
        };

        switch (editingNode.type) {
          case 'branch':
            table = 'branches';
            updateData = {
              name: formData.name,
              address: formData.address,
              phone: formData.phone,
              email: formData.email
            };
            break;
          case 'department':
            table = 'departments';
            updateData = {
              name: formData.name,
              description: formData.description
            };
            break;
          case 'service':
            // Only try to update services if the table exists
            try {
              table = 'services';
              updateData = {
                ...updateData,
                estimated_time: formData.estimated_time,
                is_active: formData.is_active
              };
            } catch (error) {
              showError('Services table not yet created. Please run the database migration first.');
              return;
            }
            break;
        }

        const { error } = await supabase
          .from(table)
          .update(updateData)
          .eq('id', editingNode.id);

        if (error) throw error;
        showSuccess(`${editingNode.type} updated successfully`);
      } else if (creatingNodeType) {
        // Create new node
        let table = '';
        let insertData: any = {
          name: formData.name
        };

        switch (creatingNodeType) {
          case 'branch':
            table = 'branches';
            insertData = {
              ...insertData,
              organization_id: userProfile?.organization_id,
              address: formData.address,
              phone: formData.phone,
              email: formData.email
            };
            break;
          case 'department':
            table = 'departments';
            insertData = {
              ...insertData,
              description: formData.description,
              branch_id: parentNodeForCreation?.id
            };
            break;
          case 'service':
            // Only try to create services if the table exists
            try {
              table = 'services';
              insertData = {
                ...insertData,
                department_id: parentNodeForCreation?.id,
                estimated_time: formData.estimated_time,
                is_active: formData.is_active ?? true
              };
            } catch (error) {
              showError('Services table not yet created. Please run the database migration first.');
              return;
            }
            break;
        }

        const { error } = await supabase
          .from(table)
          .insert([insertData]);

        if (error) throw error;
        showSuccess(`${creatingNodeType} created successfully`);
      }

      setShowNodeModal(false);
      setEditingNode(null);
      setCreatingNodeType(null);
      setParentNodeForCreation(null);
      fetchData(); // Refresh data
    } catch (error) {
      logger.error('Error saving node:', error);
      showError('Error saving changes');
    }
  };

  const deleteNode = async (node: Node) => {
    try {
      let table = '';
      switch (node.type) {
        case 'branch': table = 'branches'; break;
        case 'department': table = 'departments'; break;
        case 'service': table = 'services'; break;
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', node.id);

      if (error) throw error;
      showSuccess(`${node.type} deleted successfully`);
      fetchData(); // Refresh data
    } catch (error) {
      logger.error('Error deleting node:', error);
      showError('Error deleting item');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-96 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading organization structure...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-96 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-xl">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Unable to Load Tree View</h3>
          <p className="text-white/70 text-sm mb-4">{error}</p>
          {error.includes('log in') && (
            <p className="text-white/60 text-xs mb-4">Please refresh the page or log in again</p>
          )}
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 flex gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            title="Reset View"
            aria-label="Reset View"
          >
            <Home className="w-4 h-4 text-white" />
          </button>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 flex gap-2">
          <button
            onClick={() => createNode('branch')}
            className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors text-white"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute top-16 right-4 z-10 bg-white/10 backdrop-blur-md rounded-lg p-4 text-white max-w-xs">
        <h3 className="font-semibold mb-2">Organization Tree</h3>
        <div className="text-sm space-y-1 opacity-80">
          <p>🏢 {nodes.filter(n => n.type === 'branch').length} Branches</p>
          <p>🏬 {nodes.filter(n => n.type === 'department').length} Departments</p>
          <p>⚡ {nodes.filter(n => n.type === 'service').length} Services</p>
          <hr className="border-white/20 my-2" />
          <p>🔍 Zoom: {Math.round(zoom * 100)}%</p>
          <p className="text-xs opacity-60">Scroll to zoom • Drag to pan</p>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`w-full h-full touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* Background area for better panning */}
        <div className="canvas-area absolute inset-0 w-full h-full" />
        
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
                onClick={() => createNode('branch')}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create First Branch
              </button>
            </div>
          </div>
        )}
        
        {/* SVG for connections - properly contained */}
        <svg
          className="tree-svg-container tree-svg-transformed"
          ref={(el) => {
            if (el) {
              el.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
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
            const fromNode = nodes.find(n => n.id === connection.from);
            const toNode = nodes.find(n => n.id === connection.to);
            
            if (!fromNode || !toNode) return null;

            // Get dimensions for proper edge calculation
            const fromDimensions = getNodeDimensions(fromNode.type);
            const toDimensions = getNodeDimensions(toNode.type);

            // Start from middle bottom edge of parent node
            const startX = fromNode.position.x + fromDimensions.width / 2;
            const startY = fromNode.position.y + fromDimensions.height;
            // End at middle top edge of child node
            const endX = toNode.position.x + toDimensions.width / 2;
            const endY = toNode.position.y;

            // Calculate distance between nodes
            const dx = endX - startX;
            const dy = endY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Create curved path with better visual flow from bottom edge
            // Start with a more vertical direction from the bottom edge
            const verticalOffset = Math.min(60, Math.abs(dy) * 0.4);
            const controlX1 = startX; // Keep start control point directly below start
            const controlY1 = startY + verticalOffset;
            const controlX2 = endX; // Keep end control point directly above end  
            const controlY2 = endY - verticalOffset;

            return (
              <g key={`connection-${index}`}>
                {/* Connection shadow for depth */}
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
                  className="tree-connection tree-connection-path"
                  filter="url(#connectionGlow)"
                />
                {/* End point indicator */}
                <circle
                  cx={endX}
                  cy={endY}
                  r="5"
                  fill="url(#connectionGradient)"
                  className="tree-connection tree-connection-end"
                  filter="url(#connectionGlow)"
                />
                {/* Start point indicator */}
                <circle
                  cx={startX}
                  cy={startY}
                  r="3"
                  fill="url(#connectionGradient)"
                  className="tree-connection tree-connection-start"
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
            return (
              <div
                key={node.id}
                className="tree-node-wrapper tree-node-positioned"
                ref={(el) => {
                  if (el) {
                    el.style.left = `${node.position.x}px`;
                    el.style.top = `${node.position.y}px`;
                  }
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              >
                <div
                  className={`tree-node ${node.type} ${selectedNode?.id === node.id ? 'tree-node-selected' : ''}`}
                  onClick={() => setSelectedNode(node)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2 node-header">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg node-icon">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                          {node.type}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editNode(node);
                          }}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          title="Edit"
                          aria-label={`Edit ${node.name}`}
                        >
                          <Edit className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete ${node.name}?`)) {
                              deleteNode(node);
                            }
                          }}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          title="Delete"
                          aria-label={`Delete ${node.name}`}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
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
                      
                      {(node.type === 'branch' || node.type === 'department') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const childType = node.type === 'branch' ? 'department' : 'service';
                            createNode(childType, node);
                          }}
                          className="p-1 rounded-full add-child-btn transition-colors"
                          title={`Add ${node.type === 'branch' ? 'Department' : 'Service'}`}
                          aria-label={`Add ${node.type === 'branch' ? 'Department' : 'Service'} to ${node.name}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Node Modal */}
      <NodeModal
        isOpen={showNodeModal}
        onClose={() => {
          setShowNodeModal(false);
          setEditingNode(null);
          setCreatingNodeType(null);
          setParentNodeForCreation(null);
        }}
        onSubmit={handleNodeSubmit}
        node={editingNode}
        nodeType={creatingNodeType}
        parentNode={parentNodeForCreation}
      />
    </div>
  );
}

// Node Modal Component
interface NodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NodeFormData) => void;
  node?: Node | null;
  nodeType?: 'branch' | 'department' | 'service' | null;
  parentNode?: Node | null;
}

function NodeModal({ isOpen, onClose, onSubmit, node, nodeType, parentNode }: NodeModalProps) {
  const [formData, setFormData] = useState<NodeFormData>({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    estimated_time: 30,
    is_active: true
  });

  useEffect(() => {
    if (node) {
      setFormData({
        name: node.name,
        description: node.description,
        address: (node as BranchNode).address || '',
        phone: (node as BranchNode).phone || '',
        email: (node as BranchNode).email || '',
        estimated_time: (node as ServiceNode).estimated_time || 30,
        is_active: (node as ServiceNode).is_active ?? true
      });
    } else {
      setFormData({
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        estimated_time: 30,
        is_active: true
      });
    }
  }, [node, nodeType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const currentType = node?.type || nodeType;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {node ? 'Edit' : 'Create'} {currentType}
              {parentNode && ` under ${parentNode.name}`}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="Enter name"
              />
            </div>

            {currentType !== 'branch' && (
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
            )}

            {currentType === 'branch' && (
              <>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Email address"
                    />
                  </div>
                </div>
              </>
            )}

            {currentType === 'service' && (
              <>
                <div>
                  <label htmlFor="estimated_time" className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Time (minutes)
                  </label>
                  <input
                    id="estimated_time"
                    type="number"
                    value={formData.estimated_time}
                    onChange={(e) => setFormData({ ...formData, estimated_time: parseInt(e.target.value) })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    placeholder="Minutes"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                    Service is active
                  </label>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {node ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
