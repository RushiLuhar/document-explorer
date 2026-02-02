import { useState, useRef, useEffect } from 'react';
import type { DocumentListItem } from '../../types';

interface DocumentNavProps {
  documents: DocumentListItem[];
  currentHash: string | null;
  onSelectDocument: (contentHash: string) => void;
  onShowList: () => void;
}

export function DocumentNav({
  documents,
  currentHash,
  onSelectDocument,
  onShowList,
}: DocumentNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentDoc = documents.find((d) => d.content_hash === currentHash);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentDoc || documents.length === 0) {
    return null;
  }

  const otherDocs = documents.filter((d) => d.content_hash !== currentHash);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <span className="max-w-[200px] truncate">{currentDoc.original_filename}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
          {/* Current document indicator */}
          <div className="px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
            Current Document
          </div>
          <div className="px-3 py-2 flex items-center gap-2 bg-blue-50">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm font-medium text-blue-700 truncate">
              {currentDoc.original_filename}
            </span>
            <span className="text-xs text-blue-500 ml-auto">
              {currentDoc.page_count} pages
            </span>
          </div>

          {/* Other documents */}
          {otherDocs.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-slate-400 uppercase tracking-wider border-t border-slate-100 mt-1">
                Switch To
              </div>
              {otherDocs.map((doc) => (
                <button
                  key={doc.content_hash}
                  onClick={() => {
                    onSelectDocument(doc.content_hash);
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm text-slate-700 truncate flex-1">
                    {doc.original_filename}
                  </span>
                  <span className="text-xs text-slate-400">
                    {doc.page_count} pages
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Actions */}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={() => {
                onShowList();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-600"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              <span className="text-sm">View All Documents</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
