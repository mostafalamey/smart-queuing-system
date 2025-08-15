export interface Position {
  x: number;
  y: number;
}

export interface BaseNode {
  id: string;
  name: string;
  description: string;
  color: string;
  position: Position;
  children: string[];
}

export interface BranchNode extends BaseNode {
  type: 'branch';
  address?: string;
  phone?: string;
  email?: string;
}

export interface DepartmentNode extends BaseNode {
  type: 'department';
  branch_id: string;
  parentId: string;
}

export interface ServiceNode extends BaseNode {
  type: 'service';
  department_id: string;
  parentId: string;
  estimated_time?: number;
  is_active: boolean;
}

export type Node = BranchNode | DepartmentNode | ServiceNode;

export interface Connection {
  from: string;
  to: string;
}

export interface NodeFormData {
  name: string;
  description: string;
  address?: string;
  phone?: string;
  email?: string;
  estimated_time?: number;
  is_active?: boolean;
}

export interface TreeState {
  nodes: Node[];
  connections: Connection[];
  loading: boolean;
  error: string | null;
  zoom: number;
  pan: Position;
  isDragging: boolean;
  dragStart: Position;
  draggedNode: string | null;
  nodeDragStart: Position;
  selectedNode: Node | null;
  hoveredNode: string | null;
}

export interface NodeModalState {
  showNodeModal: boolean;
  editingNode: Node | null;
  creatingNodeType: 'branch' | 'department' | 'service' | null;
  parentNodeForCreation: Node | null;
}

export interface NodeDimensions {
  width: number;
  height: number;
}

export interface TreeInteractionHandlers {
  onNodeSelect: (node: Node | null) => void;
  onNodeEdit: (node: Node) => void;
  onNodeDelete: (node: Node) => void;
  onNodeCreate: (type: 'branch' | 'department' | 'service', parent?: Node) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}
