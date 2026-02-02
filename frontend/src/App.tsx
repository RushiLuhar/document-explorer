import { useState, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { DocumentUpload } from './components/DocumentUpload';
import { MindMapCanvas } from './components/MindMap';
import { QAPanel } from './components/QA';
import { WebSearchPanel } from './components/WebSearch';
import { Header, NodeDetailPanel } from './components/Layout';
import { useMindMapStore } from './store/mindMapStore';
import { useQAStore } from './store/qaStore';

function App() {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const { reset: resetMindMap } = useMindMapStore();
  const { clear: clearQA } = useQAStore();

  const handleDocumentReady = useCallback((id: string) => {
    setDocumentId(id);
  }, []);

  const handleReset = useCallback(() => {
    setDocumentId(null);
    resetMindMap();
    clearQA();
  }, [resetMindMap, clearQA]);

  // Show upload screen if no document
  if (!documentId) {
    return <DocumentUpload onDocumentReady={handleDocumentReady} />;
  }

  // Show mind-map explorer
  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-slate-100">
        <Header onReset={handleReset} />

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
