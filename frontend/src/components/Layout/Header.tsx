import { useMindMapStore } from '../../store/mindMapStore';

interface HeaderProps {
  onReset: () => void;
}

export function Header({ onReset }: HeaderProps) {
  const { document } = useMindMapStore();

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-slate-800">
          Claude Constitution Explorer
        </h1>
        {document && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">{document.original_filename}</span>
            <span className="text-sm text-slate-400">
              ({document.page_count} pages)
            </span>
          </>
        )}
      </div>
      <button
        onClick={onReset}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        Upload New Document
      </button>
    </header>
  );
}
