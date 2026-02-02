import { motion, AnimatePresence } from 'framer-motion';
import { useMindMapStore } from '../../store/mindMapStore';

export function NodeDetailPanel() {
  const { selectedNodeId, nodesData, setSelectedNodeId } = useMindMapStore();

  const selectedNode = selectedNodeId ? nodesData.get(selectedNodeId) : null;

  if (!selectedNode) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl border overflow-hidden z-20"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div>
            <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              {selectedNode.node_type}
            </span>
            <h3 className="font-semibold text-lg text-slate-800">
              {selectedNode.title}
            </h3>
          </div>
          <button
            onClick={() => setSelectedNodeId(null)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-64 overflow-y-auto">
          {selectedNode.full_content ? (
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
              {selectedNode.full_content}
            </p>
          ) : (
            <p className="text-slate-600">{selectedNode.summary}</p>
          )}
        </div>

        {/* Footer with concepts and page info */}
        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {selectedNode.key_concepts.map((concept, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                >
                  {concept}
                </span>
              ))}
            </div>
            {selectedNode.page_start && (
              <span className="text-sm text-slate-500">
                Pages {selectedNode.page_start}
                {selectedNode.page_end && selectedNode.page_end !== selectedNode.page_start
                  ? `-${selectedNode.page_end}`
                  : ''}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
