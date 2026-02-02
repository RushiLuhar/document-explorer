import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Node, Edge } from '@xyflow/react';
import { useMindMapStore, mindMapActions } from '../store/mindMapStore';
import { getMindMap, expandNode } from '../services/api';
import type { MindMapNode } from '../types';

// Refined color palette
const NODE_TYPE_COLORS: Record<string, string> = {
  root: '#1a1a2e',
  section: '#7c3aed',
  subsection: '#0891b2',
  topic: '#059669',
  detail: '#d97706',
};

// Tree layout configuration
const LAYOUT_CONFIG = {
  nodeWidth: 280,
  nodeHeight: 140,
  horizontalSpacing: 60,
  verticalSpacing: 80,
};

/**
 * Get only the nodes that should be visible based on expansion state.
 * A node is visible if:
 * - It's the root node, OR
 * - Its parent is expanded
 */
function getVisibleNodes(
  allNodes: Record<string, MindMapNode>,
  expandedNodes: Record<string, boolean>
): MindMapNode[] {
  const visible: MindMapNode[] = [];
  const nodesList = Object.values(allNodes);

  for (const node of nodesList) {
    // Root is always visible
    if (node.node_type === 'root') {
      visible.push(node);
      continue;
    }

    // Node is visible if its parent is expanded
    if (node.parent_id && expandedNodes[node.parent_id]) {
      visible.push(node);
    }
  }

  return visible;
}

/**
 * Calculate tree layout positions for visible nodes.
 */
function calculateTreeLayout(
  visibleNodes: MindMapNode[],
  expandedNodes: Record<string, boolean>
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const nodeMap = new Map(visibleNodes.map((n) => [n.id, n]));

  const rootNode = visibleNodes.find((n) => n.node_type === 'root');
  if (!rootNode) return positions;

  // Get children of a node that are in the visible set
  function getVisibleChildren(nodeId: string): MindMapNode[] {
    const node = nodeMap.get(nodeId);
    if (!node || !expandedNodes[nodeId]) return [];

    return node.children_ids
      .map((id) => nodeMap.get(id))
      .filter((n): n is MindMapNode => n !== undefined);
  }

  // Calculate the width needed for a subtree
  function getSubtreeWidth(nodeId: string): number {
    const children = getVisibleChildren(nodeId);
    if (children.length === 0) {
      return LAYOUT_CONFIG.nodeWidth;
    }

    const childrenWidth = children.reduce(
      (sum, child) => sum + getSubtreeWidth(child.id) + LAYOUT_CONFIG.horizontalSpacing,
      -LAYOUT_CONFIG.horizontalSpacing
    );

    return Math.max(LAYOUT_CONFIG.nodeWidth, childrenWidth);
  }

  // Position a node and its visible children
  function positionNode(nodeId: string, x: number, y: number) {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    positions.set(nodeId, { x, y });

    const children = getVisibleChildren(nodeId);
    if (children.length === 0) return;

    const childWidths = children.map((child) => getSubtreeWidth(child.id));
    const totalWidth = childWidths.reduce(
      (sum, w) => sum + w + LAYOUT_CONFIG.horizontalSpacing,
      -LAYOUT_CONFIG.horizontalSpacing
    );

    let currentX = x - totalWidth / 2;
    const childY = y + LAYOUT_CONFIG.nodeHeight + LAYOUT_CONFIG.verticalSpacing;

    children.forEach((child, i) => {
      const childWidth = childWidths[i];
      const childX = currentX + childWidth / 2;
      positionNode(child.id, childX, childY);
      currentX += childWidth + LAYOUT_CONFIG.horizontalSpacing;
    });
  }

  positionNode(rootNode.id, 0, 0);
  return positions;
}

/**
 * Build flow elements (nodes and edges) from visible nodes.
 */
function buildFlowElements(
  allNodes: Record<string, MindMapNode>,
  expandedNodes: Record<string, boolean>
): { flowNodes: Node[]; flowEdges: Edge[] } {
  // First, get only the visible nodes
  const visibleNodes = getVisibleNodes(allNodes, expandedNodes);

  // Calculate positions for visible nodes
  const positions = calculateTreeLayout(visibleNodes, expandedNodes);

  // Create flow nodes
  const flowNodes: Node[] = visibleNodes.map((node) => {
    const position = positions.get(node.id) || { x: 0, y: 0 };
    return {
      id: node.id,
      type: 'mindMapNode',
      position,
      data: {
        ...node,
        color: NODE_TYPE_COLORS[node.node_type] || '#6b7280',
      } as Record<string, unknown>,
    };
  });

  // Create edges only between visible nodes
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const flowEdges: Edge[] = visibleNodes
    .filter((node) => node.parent_id && visibleNodeIds.has(node.parent_id))
    .map((node) => ({
      id: `${node.parent_id}-${node.id}`,
      source: node.parent_id!,
      target: node.id,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#cbd5e1', strokeWidth: 2 },
    }));

  return { flowNodes, flowEdges };
}

export function useMindMap(documentId: string | null) {
  // Subscribe only to specific state slices
  const flowNodes = useMindMapStore((state) => state.flowNodes);
  const flowEdges = useMindMapStore((state) => state.flowEdges);
  const expandedNodes = useMindMapStore((state) => state.expandedNodes);
  const loadingNodes = useMindMapStore((state) => state.loadingNodes);

  // Fetch initial mind-map
  const { isLoading, error, refetch } = useQuery({
    queryKey: ['mindmap', documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const response = await getMindMap(documentId, 2);

      // Add all nodes to store
      mindMapActions.addNodesData(response.nodes);

      // Auto-expand root node
      const rootNode = response.nodes.find((n) => n.node_type === 'root');
      const initialExpandedIds = rootNode ? [rootNode.id] : [];
      mindMapActions.setExpandedNodes(initialExpandedIds);

      // Build initial expanded state
      const initialExpanded: Record<string, boolean> = {};
      initialExpandedIds.forEach((id) => { initialExpanded[id] = true; });

      // Build nodes data record
      const nodesRecord: Record<string, MindMapNode> = {};
      response.nodes.forEach((n) => { nodesRecord[n.id] = n; });

      // Build and set flow elements
      const { flowNodes, flowEdges } = buildFlowElements(nodesRecord, initialExpanded);
      mindMapActions.setFlowNodes(flowNodes);
      mindMapActions.setFlowEdges(flowEdges);

      return response;
    },
    enabled: !!documentId,
    staleTime: Infinity,
  });

  // Expand node mutation
  const expandMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      mindMapActions.setNodeLoading(nodeId, true);
      const response = await expandNode(nodeId);
      return { nodeId, response };
    },
    onSuccess: ({ nodeId, response }) => {
      // Add new nodes to store
      mindMapActions.addNodesData([response.node, ...response.children]);
      mindMapActions.toggleNodeExpanded(nodeId);

      // Get updated state and rebuild
      const updatedState = useMindMapStore.getState();
      const { flowNodes, flowEdges } = buildFlowElements(
        updatedState.nodesData,
        updatedState.expandedNodes
      );

      mindMapActions.setFlowNodes(flowNodes);
      mindMapActions.setFlowEdges(flowEdges);
      mindMapActions.setNodeLoading(nodeId, false);
    },
    onError: (_, nodeId) => {
      mindMapActions.setNodeLoading(nodeId, false);
    },
  });

  // Stable callbacks
  const handleNodeClick = useCallback((nodeId: string) => {
    mindMapActions.setSelectedNodeId(nodeId);
  }, []);

  const handleNodeExpand = useCallback((nodeId: string) => {
    const state = useMindMapStore.getState();
    const node = state.nodesData[nodeId];

    if (!node || !node.has_children) return;

    if (state.expandedNodes[nodeId]) {
      // Collapse - toggle and rebuild
      mindMapActions.toggleNodeExpanded(nodeId);

      const updatedState = useMindMapStore.getState();
      const { flowNodes, flowEdges } = buildFlowElements(
        updatedState.nodesData,
        updatedState.expandedNodes
      );

      mindMapActions.setFlowNodes(flowNodes);
      mindMapActions.setFlowEdges(flowEdges);
    } else {
      // Expand - check if children are loaded
      const childrenLoaded = node.children_ids.every((id) => state.nodesData[id]);

      if (childrenLoaded) {
        // Children already loaded, just toggle and rebuild
        mindMapActions.toggleNodeExpanded(nodeId);

        const updatedState = useMindMapStore.getState();
        const { flowNodes, flowEdges } = buildFlowElements(
          updatedState.nodesData,
          updatedState.expandedNodes
        );

        mindMapActions.setFlowNodes(flowNodes);
        mindMapActions.setFlowEdges(flowEdges);
      } else {
        // Need to fetch children
        expandMutation.mutate(nodeId);
      }
    }
  }, [expandMutation]);

  // Memoized selected node
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const nodesData = useMindMapStore((state) => state.nodesData);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodesData[selectedNodeId] || null;
  }, [selectedNodeId, nodesData]);

  return {
    flowNodes,
    flowEdges,
    isLoading,
    error,
    refetch,
    handleNodeClick,
    handleNodeExpand,
    selectedNode,
    expandedNodes,
    loadingNodes,
  };
}
