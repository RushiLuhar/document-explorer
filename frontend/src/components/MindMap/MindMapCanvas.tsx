import { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  useReactFlow,
  ReactFlowProvider,
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
import { useQAStore } from '../../store/qaStore';

interface MindMapCanvasProps {
  documentId: string;
}

function MindMapCanvasInner({ documentId }: MindMapCanvasProps) {
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

  const { fitView } = useReactFlow();
  const prevNodesCountRef = useRef(0);

  // Use React Flow's built-in state management for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // Store callbacks in refs to avoid dependency issues
  const handleNodeClickRef = useRef(handleNodeClick);
  const handleNodeExpandRef = useRef(handleNodeExpand);
  handleNodeClickRef.current = handleNodeClick;
  handleNodeExpandRef.current = handleNodeExpand;

  // Stable callback wrappers
  const stableOnClick = useCallback((nodeId: string) => {
    handleNodeClickRef.current(nodeId);
  }, []);

  const stableOnExpand = useCallback((nodeId: string) => {
    handleNodeExpandRef.current(nodeId);
  }, []);

  // Open chat panel when clicking the chat button on a node
  const stableOnOpenChat = useCallback((nodeId: string) => {
    // First select the node (to set context)
    handleNodeClickRef.current(nodeId);
    // Then open the QA panel
    useQAStore.getState().setIsPanelOpen(true);
  }, []);

  // Node types - stable reference
  const nodeTypes: NodeTypes = useMemo(
    () => ({ mindMapNode: MindMapNode }) as NodeTypes,
    []
  );

  // Sync nodes from layout when flowNodes change
  // flowNodes includes position data from layout algorithm
  const prevFlowNodesRef = useRef<typeof flowNodes | null>(null);
  useEffect(() => {
    // Only sync when flowNodes actually changes (new array reference)
    if (flowNodes === prevFlowNodesRef.current) return;
    prevFlowNodesRef.current = flowNodes;

    if (flowNodes.length === 0) return;

    const newNodes: Node[] = flowNodes.map((node) => ({
      ...node,
      data: {
        ...(node.data as Record<string, unknown>),
        isExpanded: !!expandedNodes[node.id],
        isLoading: !!loadingNodes[node.id],
        onExpand: stableOnExpand,
        onClick: stableOnClick,
        onOpenChat: stableOnOpenChat,
      },
    }));

    setNodes(newNodes);
  }, [flowNodes, expandedNodes, loadingNodes, stableOnExpand, stableOnClick, stableOnOpenChat, setNodes]);

  // Sync edges when flowEdges change
  const prevFlowEdgesRef = useRef<typeof flowEdges | null>(null);
  useEffect(() => {
    if (flowEdges === prevFlowEdgesRef.current) return;
    prevFlowEdgesRef.current = flowEdges;
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  // Fit view when node count changes
  useEffect(() => {
    if (nodes.length > 0 && nodes.length !== prevNodesCountRef.current) {
      prevNodesCountRef.current = nodes.length;
      const timer = setTimeout(() => {
        fitView({ padding: 0.15, duration: 300 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      handleNodeClickRef.current(node.id);
    },
    []
  );

  // Reset layout to auto-calculated positions
  const handleResetLayout = useCallback(() => {
    if (prevFlowNodesRef.current) {
      const resetNodes: Node[] = prevFlowNodesRef.current.map((node) => ({
        ...node,
        data: {
          ...(node.data as Record<string, unknown>),
          isExpanded: !!expandedNodes[node.id],
          isLoading: !!loadingNodes[node.id],
          onExpand: stableOnExpand,
          onClick: stableOnClick,
          onOpenChat: stableOnOpenChat,
        },
      }));
      setNodes(resetNodes);
    }
    setTimeout(() => {
      fitView({ padding: 0.15, duration: 300 });
    }, 50);
  }, [expandedNodes, loadingNodes, stableOnExpand, stableOnClick, stableOnOpenChat, setNodes, fitView]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-4 border-slate-800 border-t-transparent animate-spin" />
          </div>
          <p className="text-slate-600 font-medium tracking-wide">
            Building mind-map...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-red-50">
        <div className="text-center max-w-md px-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            Failed to load mind-map
          </h3>
          <p className="text-sm text-slate-500">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(148, 163, 184, 0.08) 0%, transparent 70%)',
        }}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={1.5}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#cbd5e1', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={40} size={1} style={{ opacity: 0.5 }} />
        <MindMapControls onResetLayout={handleResetLayout} />
      </ReactFlow>
    </div>
  );
}

export function MindMapCanvas({ documentId }: MindMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <MindMapCanvasInner documentId={documentId} />
    </ReactFlowProvider>
  );
}
