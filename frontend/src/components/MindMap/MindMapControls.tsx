import { memo } from 'react';
import { useReactFlow, Panel } from '@xyflow/react';

function MindMapControlsComponent() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel position="bottom-right" className="flex gap-2">
      <button
        onClick={() => zoomIn()}
        className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-colors"
        title="Zoom In"
      >
        <svg
          className="w-5 h-5 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
          />
        </svg>
      </button>
      <button
        onClick={() => zoomOut()}
        className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-colors"
        title="Zoom Out"
      >
        <svg
          className="w-5 h-5 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
          />
        </svg>
      </button>
      <button
        onClick={() => fitView({ padding: 0.2 })}
        className="p-2 bg-white rounded-lg shadow-md hover:bg-slate-50 transition-colors"
        title="Fit View"
      >
        <svg
          className="w-5 h-5 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>
    </Panel>
  );
}

export const MindMapControls = memo(MindMapControlsComponent);
