import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import type { MindMapNode, Document } from '../types';

interface MindMapState {
  // Document state
  document: Document | null;
  setDocument: (document: Document | null) => void;

  // Node data from API - using Record instead of Map for reference stability
  nodesData: Record<string, MindMapNode>;
  setNodeData: (nodeId: string, data: MindMapNode) => void;
  addNodesData: (nodes: MindMapNode[]) => void;
  getNode: (nodeId: string) => MindMapNode | undefined;

  // React Flow state
  flowNodes: Node[];
  flowEdges: Edge[];
  setFlowNodes: (nodes: Node[]) => void;
  setFlowEdges: (edges: Edge[]) => void;

  // Expanded nodes tracking - using Record instead of Set
  expandedNodes: Record<string, boolean>;
  toggleNodeExpanded: (nodeId: string) => void;
  setExpandedNodes: (nodeIds: string[]) => void;
  isNodeExpanded: (nodeId: string) => boolean;

  // Selected node
  selectedNodeId: string | null;
  setSelectedNodeId: (nodeId: string | null) => void;

  // Loading states - using Record instead of Set
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingNodes: Record<string, boolean>;
  setNodeLoading: (nodeId: string, loading: boolean) => void;
  isNodeLoading: (nodeId: string) => boolean;

  // Reset
  reset: () => void;
}

const initialState = {
  document: null,
  nodesData: {} as Record<string, MindMapNode>,
  flowNodes: [] as Node[],
  flowEdges: [] as Edge[],
  expandedNodes: {} as Record<string, boolean>,
  selectedNodeId: null,
  isLoading: false,
  loadingNodes: {} as Record<string, boolean>,
};

export const useMindMapStore = create<MindMapState>((set, get) => ({
  ...initialState,

  setDocument: (document) => set({ document }),

  setNodeData: (nodeId, data) => {
    set((state) => ({
      nodesData: { ...state.nodesData, [nodeId]: data },
    }));
  },

  addNodesData: (nodes) => {
    set((state) => {
      const newNodesData = { ...state.nodesData };
      nodes.forEach((node) => {
        newNodesData[node.id] = node;
      });
      return { nodesData: newNodesData };
    });
  },

  getNode: (nodeId) => get().nodesData[nodeId],

  setFlowNodes: (nodes) => set({ flowNodes: nodes }),
  setFlowEdges: (edges) => set({ flowEdges: edges }),

  toggleNodeExpanded: (nodeId) => {
    set((state) => ({
      expandedNodes: {
        ...state.expandedNodes,
        [nodeId]: !state.expandedNodes[nodeId],
      },
    }));
  },

  setExpandedNodes: (nodeIds) => {
    const expanded: Record<string, boolean> = {};
    nodeIds.forEach((id) => {
      expanded[id] = true;
    });
    set({ expandedNodes: expanded });
  },

  isNodeExpanded: (nodeId) => !!get().expandedNodes[nodeId],

  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setNodeLoading: (nodeId, loading) => {
    set((state) => ({
      loadingNodes: {
        ...state.loadingNodes,
        [nodeId]: loading,
      },
    }));
  },

  isNodeLoading: (nodeId) => !!get().loadingNodes[nodeId],

  reset: () => set(initialState),
}));

// Stable action getters - use these to avoid subscription issues
export const mindMapActions = {
  setDocument: (doc: Document | null) => useMindMapStore.getState().setDocument(doc),
  addNodesData: (nodes: MindMapNode[]) => useMindMapStore.getState().addNodesData(nodes),
  setFlowNodes: (nodes: Node[]) => useMindMapStore.getState().setFlowNodes(nodes),
  setFlowEdges: (edges: Edge[]) => useMindMapStore.getState().setFlowEdges(edges),
  toggleNodeExpanded: (nodeId: string) => useMindMapStore.getState().toggleNodeExpanded(nodeId),
  setExpandedNodes: (nodeIds: string[]) => useMindMapStore.getState().setExpandedNodes(nodeIds),
  setSelectedNodeId: (nodeId: string | null) => useMindMapStore.getState().setSelectedNodeId(nodeId),
  setNodeLoading: (nodeId: string, loading: boolean) => useMindMapStore.getState().setNodeLoading(nodeId, loading),
  reset: () => useMindMapStore.getState().reset(),
  getNode: (nodeId: string) => useMindMapStore.getState().nodesData[nodeId],
  isExpanded: (nodeId: string) => !!useMindMapStore.getState().expandedNodes[nodeId],
  isLoading: (nodeId: string) => !!useMindMapStore.getState().loadingNodes[nodeId],
};
