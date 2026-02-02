import { memo } from 'react';
import { useReactFlow, Panel } from '@xyflow/react';
import { motion } from 'framer-motion';

interface MindMapControlsProps {
  onResetLayout?: () => void;
}

function MindMapControlsComponent({ onResetLayout }: MindMapControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const buttonClass = `
    w-10 h-10
    flex items-center justify-center
    bg-white/90 backdrop-blur-sm
    border border-slate-200/60
    text-slate-500
    hover:text-slate-700 hover:bg-white hover:border-slate-300
    active:scale-95
    transition-all duration-150
    first:rounded-t-xl last:rounded-b-xl
  `;

  return (
    <Panel position="bottom-right" className="mr-4 mb-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col shadow-lg shadow-slate-200/50 rounded-xl overflow-hidden"
      >
        <button
          onClick={() => zoomIn()}
          className={buttonClass}
          title="Zoom in"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <div className="h-px bg-slate-100" />

        <button
          onClick={() => zoomOut()}
          className={buttonClass}
          title="Zoom out"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <div className="h-px bg-slate-100" />

        <button
          onClick={() => fitView({ padding: 0.15, duration: 400 })}
          className={buttonClass}
          title="Fit to view"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>

        {onResetLayout && (
          <>
            <div className="h-px bg-slate-100" />
            <button
              onClick={onResetLayout}
              className={buttonClass}
              title="Reset layout"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </>
        )}
      </motion.div>
    </Panel>
  );
}

export const MindMapControls = memo(MindMapControlsComponent);
