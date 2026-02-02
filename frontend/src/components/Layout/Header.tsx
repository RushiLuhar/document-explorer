import { useMindMapStore } from '../../store/mindMapStore';
import { DocumentNav } from '../DocumentNav';
import type { DocumentListItem } from '../../types';

interface HeaderProps {
  documents: DocumentListItem[];
  currentHash: string | null;
  onSelectDocument: (contentHash: string) => void;
  onShowList: () => void;
  onUploadNew: () => void;
}

export function Header({
  documents,
  currentHash,
  onSelectDocument,
  onShowList,
  onUploadNew,
}: HeaderProps) {
  const { document } = useMindMapStore();

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-slate-800">
          Document Explorer
        </h1>
        <span className="text-slate-300">|</span>
        <DocumentNav
          documents={documents}
          currentHash={currentHash}
          onSelectDocument={onSelectDocument}
          onShowList={onShowList}
        />
        {document && (
          <span className="text-sm text-slate-400">
            ({document.page_count} pages)
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onShowList}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
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
          All Documents
        </button>
        <button
          onClick={onUploadNew}
          className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Upload New
        </button>
      </div>
    </header>
  );
}
