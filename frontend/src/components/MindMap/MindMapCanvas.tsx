import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MindMapNode } from './MindMapNode';
import { MindMapControls } from './MindMapControls';
import { useMindMap } from '../../hooks/useMindMap';
import { useMindMapStore } from '../../store/mindMapStore';

interface MindMapCanvasProps {
  documentId: string;
}

export function MindMapCanvas({ documentId }: MindMapCanvasProps) {
  const {
    flowNodes,
    flowEdges,
    isLoading,
    error,
    handleNodeClick,
    handleNodeExpand,
    expandedNodes,
    loadingNodes,
  } = useMindMap(documentId);

  const { selectedNodeId } = useMindMapStore();

  // React Flow state with explicit typing
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([] as Edge[]);

  // Update nodes with handlers and state
  useEffect(() => {
    const updatedNodes: Node[] = flowNodes.map((node) => ({
      ...node,
      data: {
        ...(node.data as Record<string, unknown>),
        isExpanded: expandedNodes.has(node.id),
        isLoading: loadingNodes.has(node.id),
        isSelected: node.id === selectedNodeId,
        onExpand: handleNodeExpand,
        onClick: handleNodeClick,
      },
    }));
    setNodes(updatedNodes);
  }, [
    flowNodes,
    expandedNodes,
    loadingNodes,
    selectedNodeId,
    handleNodeExpand,
    handleNodeClick,
    setNodes,
  ]);

  useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  // Custom node types - use type assertion to satisfy NodeTypes
  const nodeTypes: NodeTypes = useMemo(
    () =>
      ({
        mindMapNode: MindMapNode,
      }) as NodeTypes,
    []
  );

  const handleNodeClickWrapper = useCallback(
    (_: React.MouseEvent, node: Node) => {
      handleNodeClick(node.id);
    },
    [handleNodeClick]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading mind-map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="text-center text-red-600">
          <p>Failed to load mind-map</p>
          <p className="text-sm text-slate-500 mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClickWrapper}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <MindMapControls />
      </ReactFlow>
    </div>
  );
}
