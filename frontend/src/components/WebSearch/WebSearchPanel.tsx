import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQA } from '../../hooks/useQA';
import { useMindMapStore } from '../../store/mindMapStore';

export function WebSearchPanel() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { searchResults, isSearching, handleSearch } = useQA();
  const { selectedNodeId, nodesData } = useMindMapStore();

  const selectedNode = selectedNodeId ? nodesData.get(selectedNodeId) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;
    handleSearch(query.trim());
  };

  const searchWithNodeContext = () => {
    if (selectedNode) {
      const searchQuery = `${selectedNode.title} ${selectedNode.key_concepts.slice(0, 2).join(' ')}`;
      setQuery(searchQuery);
      handleSearch(searchQuery);
    }
  };

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-6 left-6 z-40
          p-4 rounded-full shadow-lg transition-all
          ${isOpen ? 'bg-slate-700' : 'bg-emerald-600 hover:bg-emerald-700'}
        `}
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          )}
        </svg>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-96 bg-white shadow-2xl z-30 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b bg-slate-50">
              <h2 className="font-semibold text-slate-800">Web Search</h2>
              <p className="text-sm text-slate-500 mt-1">
                Find related information online
              </p>
            </div>

            {/* Search form */}
            <form onSubmit={handleSubmit} className="p-4 border-b">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the web..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={isSearching}
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isSearching}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    'Search'
                  )}
                </button>
              </div>

              {/* Quick search from node */}
              {selectedNode && (
                <button
                  type="button"
                  onClick={searchWithNodeContext}
                  className="mt-2 text-sm text-emerald-600 hover:text-emerald-700"
                >
                  Search for "{selectedNode.title}"
                </button>
              )}
            </form>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {searchResults.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <p>Search results will appear here</p>
                </div>
              ) : (
                searchResults.map((result, index) => (
                  <motion.a
                    key={index}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="block p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <h3 className="font-medium text-blue-600 hover:underline">
                      {result.title}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {result.snippet}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 truncate">
                      {result.url}
                    </p>
                  </motion.a>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
