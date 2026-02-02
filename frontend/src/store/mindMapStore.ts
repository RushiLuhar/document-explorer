import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { MindMapNode, Document } from '../types';

interface MindMapState {
  // Document state
  document: Document | null;
  setDocument: (document: Document | null) => void;

  // Node data from API
  nodesData: Map<string, MindMapNode>;
  setNodeData: (nodeId: string, data: MindMapNode) => void;
  addNodesData: (nodes: MindMapNode[]) => void;

  // React Flow state
  flowNodes: Node[];
  flowEdges: Edge[];
  setFlowNodes: (nodes: Node[]) => void;
  setFlowEdges: (edges: Edge[]) => void;

  // Expanded nodes tracking
  expandedNodes: Set<string>;
  toggleNodeExpanded: (nodeId: string) => void;
  isNodeExpanded: (nodeId: string) => boolean;

  // Selected node
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingNodes: Set<string>;
  setNodeLoading: (nodeId: string, loading: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  document: null,
  nodesData: new Map<string, MindMapNode>(),
  flowNodes: [],
  flowEdges: [],
  expandedNodes: new Set<string>(),
  selectedNodeId: null,
  isLoading: false,
  loadingNodes: new Set<string>(),
};

export const useMindMapStore = create<MindMapState>((set, get) => ({
  ...initialState,

  setDocument: (document) => set({ document }),

  setNodeData: (nodeId, data) => {
    set((state) => {
      const newNodesData = new Map(state.nodesData);
      newNodesData.set(nodeId, data);
      return { nodesData: newNodesData };
    });
  },

  addNodesData: (nodes) => {
    set((state) => {
      const newNodesData = new Map(state.nodesData);
      nodes.forEach((node) => {
        newNodesData.set(node.id, node);
      });
      return { nodesData: newNodesData };
    });
  },

  setFlowNodes: (nodes) => set({ flowNodes: nodes }),
  setFlowEdges: (edges) => set({ flowEdges: edges }),

  toggleNodeExpanded: (nodeId) => {
    set((state) => {
      const newExpanded = new Set(state.expandedNodes);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return { expandedNodes: newExpanded };
    });
  },

  isNodeExpanded: (nodeId) => get().expandedNodes.has(nodeId),

  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setNodeLoading: (nodeId, loading) => {
    set((state) => {
      const newLoadingNodes = new Set(state.loadingNodes);
      if (loading) {
        newLoadingNodes.add(nodeId);
      } else {
        newLoadingNodes.delete(nodeId);
      }
      return { loadingNodes: newLoadingNodes };
    });
  },

  reset: () => set(initialState),
}));
