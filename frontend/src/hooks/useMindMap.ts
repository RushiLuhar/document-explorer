import { useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Node, Edge } from '@xyflow/react';
import { useMindMapStore } from '../store/mindMapStore';
import { getMindMap, expandNode } from '../services/api';
import type { MindMapNode } from '../types';

const NODE_TYPE_COLORS: Record<string, string> = {
  root: '#3b82f6',
  section: '#8b5cf6',
  subsection: '#06b6d4',
  topic: '#10b981',
  detail: '#f59e0b',
};

export function useMindMap(documentId: string | null) {
  const {
    nodesData,
    addNodesData,
    flowNodes,
    flowEdges,
    setFlowNodes,
    setFlowEdges,
    expandedNodes,
    toggleNodeExpanded,
    setNodeLoading,
    loadingNodes,
    selectedNodeId,
    setSelectedNodeId,
  } = useMindMapStore();

  // Convert MindMapNodes to React Flow nodes and edges
  const updateFlowElements = useCallback(
    (nodes: MindMapNode[]) => {
      const newFlowNodes: Node[] = nodes.map((node) => ({
        id: node.id,
        type: 'mindMapNode',
        position: { x: node.position_x, y: node.position_y },
        data: {
          ...node,
          isExpanded: expandedNodes.has(node.id),
          isLoading: loadingNodes.has(node.id),
          isSelected: node.id === selectedNodeId,
          color: NODE_TYPE_COLORS[node.node_type] || '#6b7280',
        } as Record<string, unknown>,
      }));

      const newFlowEdges: Edge[] = nodes
        .filter((node) => node.parent_id)
        .map((node) => ({
          id: `${node.parent_id}-${node.id}`,
          source: node.parent_id!,
          target: node.id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        }));

      setFlowNodes(newFlowNodes);
      setFlowEdges(newFlowEdges);
    },
    [expandedNodes, loadingNodes, selectedNodeId, setFlowNodes, setFlowEdges]
  );

  // Fetch initial mind-map
  const { isLoading, error, refetch } = useQuery({
    queryKey: ['mindmap', documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const response = await getMindMap(documentId, 2);
      addNodesData(response.nodes);
      updateFlowElements(response.nodes);
      return response;
    },
    enabled: !!documentId,
  });

  // Expand node mutation
  const expandMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      setNodeLoading(nodeId, true);
      const response = await expandNode(nodeId);
      return { nodeId, response };
    },
    onSuccess: ({ nodeId, response }) => {
      // Add new nodes to store
      addNodesData([response.node, ...response.children]);
      toggleNodeExpanded(nodeId);

      // Update flow elements to include new children
      const allNodes = Array.from(nodesData.values());
      allNodes.push(response.node);
      response.children.forEach((child) => {
        if (!nodesData.has(child.id)) {
          allNodes.push(child);
        }
      });
      updateFlowElements(allNodes);
      setNodeLoading(nodeId, false);
    },
    onError: (_, nodeId) => {
      setNodeLoading(nodeId, false);
    },
  });

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
    },
    [setSelectedNodeId]
  );

  const handleNodeExpand = useCallback(
    (nodeId: string) => {
      const node = nodesData.get(nodeId);
      if (!node || !node.has_children) return;

      if (expandedNodes.has(nodeId)) {
        // Collapse: just toggle state
        toggleNodeExpanded(nodeId);
        // Remove children from flow
        const nodesToKeep = Array.from(nodesData.values()).filter(
          (n) => n.parent_id !== nodeId
        );
        updateFlowElements(nodesToKeep);
      } else {
        // Expand: fetch children if not already loaded
        const childrenLoaded = node.children_ids.every((id) => nodesData.has(id));
        if (childrenLoaded) {
          toggleNodeExpanded(nodeId);
          updateFlowElements(Array.from(nodesData.values()));
        } else {
          expandMutation.mutate(nodeId);
        }
      }
    },
    [nodesData, expandedNodes, toggleNodeExpanded, updateFlowElements, expandMutation]
  );

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodesData.get(selectedNodeId) || null;
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
