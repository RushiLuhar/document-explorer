import axios from 'axios';
import type {
  Document,
  DocumentStatus,
  DocumentListItem,
  AuditEntry,
  MindMapResponse,
  MindMapNode,
  NodeExpandResponse,
  QARequest,
  QAResponse,
  WebSearchResponse,
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Document endpoints
export const uploadDocument = async (file: File): Promise<Document> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<Document>('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getDocument = async (documentId: string): Promise<Document> => {
  const response = await api.get<Document>(`/documents/${documentId}`);
  return response.data;
};

export const getDocumentStatus = async (documentId: string): Promise<DocumentStatus> => {
  const response = await api.get<DocumentStatus>(`/documents/${documentId}/status`);
  return response.data;
};

// Mind-map endpoints
export const getMindMap = async (documentId: string, depth = 1): Promise<MindMapResponse> => {
  const response = await api.get<MindMapResponse>(`/mindmap/${documentId}`, {
    params: { depth },
  });
  return response.data;
};

// Node endpoints
export const getNode = async (nodeId: string): Promise<MindMapNode> => {
  const response = await api.get<MindMapNode>(`/nodes/${nodeId}`);
  return response.data;
};

export const expandNode = async (
  nodeId: string,
  includeContent = true
): Promise<NodeExpandResponse> => {
  const response = await api.post<NodeExpandResponse>(`/nodes/${nodeId}/expand`, {
    include_content: includeContent,
  });
  return response.data;
};

// Q&A endpoints
export const askQuestion = async (
  documentId: string,
  request: QARequest
): Promise<QAResponse> => {
  const response = await api.post<QAResponse>(`/qa/${documentId}`, request);
  return response.data;
};

export const askQuestionAboutNode = async (
  documentId: string,
  nodeId: string,
  question: string
): Promise<QAResponse> => {
  const response = await api.post<QAResponse>(`/qa/${documentId}/node/${nodeId}`, {
    question,
  });
  return response.data;
};

// Web search endpoint
export const searchWeb = async (
  query: string,
  maxResults = 5
): Promise<WebSearchResponse> => {
  const response = await api.post<WebSearchResponse>('/search/web', {
    query,
    max_results: maxResults,
  });
  return response.data;
};

// Document list/persistence endpoints
export const getDocuments = async (): Promise<DocumentListItem[]> => {
  const response = await api.get<DocumentListItem[]>('/documents/');
  return response.data;
};

export const loadDocument = async (contentHash: string): Promise<Document> => {
  const response = await api.get<Document>(`/documents/${contentHash}/load`);
  return response.data;
};

export const getAuditLog = async (contentHash: string): Promise<AuditEntry[]> => {
  const response = await api.get<AuditEntry[]>(`/documents/${contentHash}/audit`);
  return response.data;
};

export const deleteDocument = async (contentHash: string): Promise<void> => {
  await api.delete(`/documents/${contentHash}`);
};

export default api;
