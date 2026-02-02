import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQA } from '../../hooks/useQA';
import { useMindMapStore } from '../../store/mindMapStore';

export function QAPanel() {
  const [question, setQuestion] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use individual selectors
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);
  const nodesData = useMindMapStore((state) => state.nodesData);

  const {
    messages,
    isAsking,
    handleAsk,
    isPanelOpen,
    togglePanel,
  } = useQA();

  const selectedNode = selectedNodeId ? nodesData[selectedNodeId] : null;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isAsking) return;
    handleAsk(question.trim());
    setQuestion('');
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={togglePanel}
        className={`
          fixed bottom-6 right-6 z-40
          p-4 rounded-full shadow-lg transition-all
          ${isPanelOpen ? 'bg-slate-700' : 'bg-blue-600 hover:bg-blue-700'}
        `}
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isPanelOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          )}
        </svg>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-30 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b bg-slate-50">
              <h2 className="font-semibold text-slate-800">Ask Questions</h2>
              {selectedNode && (
                <p className="text-sm text-slate-500 mt-1">
                  Context: {selectedNode.title}
                </p>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <p>Ask a question about the document</p>
                  <p className="text-sm mt-2">
                    {selectedNode
                      ? `Questions will focus on "${selectedNode.title}"`
                      : 'Select a node to focus your question'}
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`
                      p-3 rounded-lg
                      ${
                        message.type === 'question'
                          ? 'bg-blue-100 ml-8'
                          : 'bg-slate-100 mr-8'
                      }
                    `}
                  >
                    <p className="text-sm text-slate-800">{message.content}</p>
                    {message.confidence !== undefined && (
                      <p className="text-xs text-slate-500 mt-2">
                        Confidence: {Math.round(message.confidence * 100)}%
                      </p>
                    )}
                  </div>
                ))
              )}
              {isAsking && (
                <div className="p-3 rounded-lg bg-slate-100 mr-8">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                    <span className="text-sm text-slate-600">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAsking}
                />
                <button
                  type="submit"
                  disabled={!question.trim() || isAsking}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
