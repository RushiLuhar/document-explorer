import { useState, useCallback, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { DocumentList } from './components/DocumentList';
import { DocumentUpload } from './components/DocumentUpload';
import { MindMapCanvas } from './components/MindMap';
import { QAPanel } from './components/QA';
import { WebSearchPanel } from './components/WebSearch';
import { Header, NodeDetailPanel } from './components/Layout';
import { mindMapActions } from './store/mindMapStore';
import { useQAStore } from './store/qaStore';
import { getDocuments, loadDocument } from './services/api';
import type { DocumentListItem } from './types';

type AppView = 'list' | 'upload' | 'mindmap';

function App() {
  const [view, setView] = useState<AppView>('list');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [contentHash, setContentHash] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  // Fetch documents on mount
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const docs = await getDocuments();
        setDocuments(docs);
        // If no documents exist, show upload view
        if (docs.length === 0) {
          setView('upload');
        }
      } catch (err) {
        console.error('Failed to fetch documents:', err);
        // On error, show upload view
        setView('upload');
      }
    };
    fetchDocs();
  }, []);

  const handleSelectDocument = useCallback(async (hash: string) => {
    setIsLoadingDocument(true);
    try {
      const doc = await loadDocument(hash);
      setDocumentId(doc.id);
      setContentHash(hash);
      setView('mindmap');
    } catch (err) {
      console.error('Failed to load document:', err);
    } finally {
      setIsLoadingDocument(false);
    }
  }, []);

  const handleDocumentReady = useCallback(async (id: string, hash?: string) => {
    setDocumentId(id);
    if (hash) {
      setContentHash(hash);
    }
    // Refresh documents list
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to refresh documents:', err);
    }
    setView('mindmap');
  }, []);

  const handleShowList = useCallback(() => {
    setView('list');
    setDocumentId(null);
    setContentHash(null);
    mindMapActions.reset();
    useQAStore.getState().clear();
  }, []);

  const handleShowUpload = useCallback(() => {
    setView('upload');
  }, []);

  const handleBackFromUpload = useCallback(async () => {
    // Refresh documents list and go back to list
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to refresh documents:', err);
    }
    setView('list');
  }, []);

  // Loading overlay for document loading
  if (isLoadingDocument) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading document...</p>
        </div>
      </div>
    );
  }

  // Document list view
  if (view === 'list') {
    return (
      <DocumentList
        onSelectDocument={handleSelectDocument}
        onUploadNew={handleShowUpload}
      />
    );
  }

  // Upload view
  if (view === 'upload') {
    return (
      <DocumentUpload
        onDocumentReady={handleDocumentReady}
        onBack={documents.length > 0 ? handleBackFromUpload : undefined}
      />
    );
  }

  // Mind-map view
  if (!documentId) {
    return null;
  }

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-slate-100">
        <Header
          documents={documents}
          currentHash={contentHash}
          onSelectDocument={handleSelectDocument}
          onShowList={handleShowList}
          onUploadNew={handleShowUpload}
        />

        <main className="flex-1 relative">
          <MindMapCanvas documentId={documentId} />
          <NodeDetailPanel />
        </main>

        <QAPanel />
        <WebSearchPanel />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
