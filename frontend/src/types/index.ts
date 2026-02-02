export type NodeType = 'root' | 'section' | 'subsection' | 'topic' | 'detail';

export interface MindMapNode {
  id: string;
  document_id: string;
  parent_id: string | null;
  title: string;
  summary: string;
  full_content: string | null;
  node_type: NodeType;
  depth: number;
  children_ids: string[];
  key_concepts: string[];
  has_children: boolean;
  page_start: number | null;
  page_end: number | null;
  position_x: number;
  position_y: number;
}

export interface MindMapResponse {
  document_id: string;
  nodes: MindMapNode[];
  root_id: string;
}

export interface NodeExpandResponse {
  node: MindMapNode;
  children: MindMapNode[];
}

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  page_count: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface DocumentStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  progress: number | null;
}

export interface QARequest {
  question: string;
  context_node_id?: string;
}

export interface QAResponse {
  answer: string;
  source_nodes: string[];
  confidence: number;
}

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
}
