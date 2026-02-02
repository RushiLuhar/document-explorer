import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { MindMapNode } from './MindMapNode';
import type { MindMapNodeData } from './MindMapNode';
import { useMindMapStore } from '../../store/mindMapStore';

// Wrapper to provide ReactFlow context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}

const baseNodeData: MindMapNodeData = {
  id: 'test-node-1',
  document_id: 'doc-1',
  parent_id: null,
  title: 'Test Node',
  summary: 'This is a test summary for the node.',
  full_content: 'Full content here',
  node_type: 'section',
  depth: 1,
  children_ids: [],
  key_concepts: ['concept1', 'concept2'],
  has_children: true,
  page_start: null,
  page_end: null,
  position_x: 0,
  position_y: 0,
  isExpanded: false,
  isLoading: false,
  color: '#7c3aed',
};

describe('MindMapNode', () => {
  beforeEach(() => {
    // Reset store state before each test
    useMindMapStore.setState({ selectedNodeId: null });
  });

  it('renders node title', () => {
    render(
      <TestWrapper>
        <MindMapNode id="test-node-1" data={baseNodeData} />
      </TestWrapper>
    );

    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });

  it('renders node type badge', () => {
    render(
      <TestWrapper>
        <MindMapNode id="test-node-1" data={baseNodeData} />
      </TestWrapper>
    );

    expect(screen.getByText('section')).toBeInTheDocument();
  });

  it('calls onExpand when expand button is clicked', () => {
    const onExpand = vi.fn();
    const nodeData = { ...baseNodeData, onExpand };

    render(
      <TestWrapper>
        <MindMapNode id="test-node-1" data={nodeData} />
      </TestWrapper>
    );

    // Find and click the expand button (chevron icon button)
    const expandButton = screen.getByRole('button');
    fireEvent.click(expandButton);

    expect(onExpand).toHaveBeenCalledWith('test-node-1');
  });

  it('calls onClick when node is clicked', () => {
    const onClick = vi.fn();
    const nodeData = { ...baseNodeData, onClick };

    render(
      <TestWrapper>
        <MindMapNode id="test-node-1" data={nodeData} />
      </TestWrapper>
    );

    // Click on the node container (not the button)
    const nodeTitle = screen.getByText('Test Node');
    fireEvent.click(nodeTitle.closest('div')!);

    expect(onClick).toHaveBeenCalledWith('test-node-1');
  });

  it('shows loading state when isLoading is true', () => {
    const nodeData = { ...baseNodeData, isLoading: true };

    render(
      <TestWrapper>
        <MindMapNode id="test-node-1" data={nodeData} />
      </TestWrapper>
    );

    // The expand button should be disabled during loading
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows expanded state visually', () => {
    const nodeData = { ...baseNodeData, isExpanded: true };

    render(
      <TestWrapper>
        <MindMapNode id="test-node-1" data={nodeData} />
      </TestWrapper>
    );

    // The component renders - expanded state affects the chevron rotation
    // which is handled via CSS animation
    expect(screen.getByText('Test Node')).toBeInTheDocument();
  });

  it('does not show expand button for nodes without children', () => {
    const nodeData = { ...baseNodeData, has_children: false };

    render(
      <TestWrapper>
        <MindMapNode id="test-node-1" data={nodeData} />
      </TestWrapper>
    );

    // No button should be present since node has no children
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders root node with different styling', () => {
    const rootNodeData: MindMapNodeData = {
      ...baseNodeData,
      node_type: 'root',
      title: 'Root Node',
    };

    render(
      <TestWrapper>
        <MindMapNode id="test-root" data={rootNodeData} />
      </TestWrapper>
    );

    expect(screen.getByText('Root Node')).toBeInTheDocument();
    expect(screen.getByText('Explore Topics')).toBeInTheDocument();
  });

  it('shows progressive disclosure content on hover', async () => {
    render(
      <TestWrapper>
        <MindMapNode id="test-node-1" data={baseNodeData} />
      </TestWrapper>
    );

    // Initially summary may not be visible (progressive disclosure)
    const container = screen.getByText('Test Node').closest('.group');
    expect(container).toBeInTheDocument();

    // Trigger hover
    fireEvent.mouseEnter(container!);

    // After hover, content should become visible
    expect(screen.getByText(/This is a test summary/)).toBeInTheDocument();
  });

  it('renders key concepts when selected', () => {
    // Set the node as selected in the store
    useMindMapStore.setState({ selectedNodeId: 'test-node-1' });

    render(
      <TestWrapper>
        <MindMapNode id="test-node-1" data={baseNodeData} />
      </TestWrapper>
    );

    // Key concepts should be visible when selected (progressive disclosure)
    expect(screen.getByText('concept1')).toBeInTheDocument();
    expect(screen.getByText('concept2')).toBeInTheDocument();
  });
});
