import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMindMapStore } from '../../store/mindMapStore';
import type { MindMapNode as MindMapNodeType } from '../../types';

export interface MindMapNodeData extends MindMapNodeType {
  isExpanded: boolean;
  isLoading: boolean;
  color: string;
  onExpand?: (nodeId: string) => void;
  onClick?: (nodeId: string) => void;
}

interface MindMapNodeProps {
  id: string;
  data: MindMapNodeData;
}

function MindMapNodeComponent({ data, id }: MindMapNodeProps) {
  const {
    title,
    summary,
    node_type,
    has_children,
    isExpanded,
    isLoading,
    color,
    key_concepts,
    onExpand,
    onClick,
  } = data;

  // Subscribe to selection state directly from store
  const isSelected = useMindMapStore((state) => state.selectedNodeId === id);

  const [isHovered, setIsHovered] = useState(false);
  const isRoot = node_type === 'root';

  // Progressive disclosure: only show details when expanded or hovered
  const showDetails = isExpanded || isHovered || isSelected;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.8
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group"
      style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* Connection handle - incoming */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2 !h-2 !bg-transparent !border-0"
          style={{ top: -1 }}
        />
      )}

      {/* Main node container */}
      <motion.div
        layout
        onClick={() => onClick?.(id)}
        className={`
          relative overflow-hidden cursor-pointer
          ${isRoot
            ? 'rounded-2xl'
            : 'rounded-xl'
          }
        `}
        style={{
          width: isRoot ? 320 : showDetails ? 280 : 200,
          background: isRoot
            ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
            : isSelected
              ? '#ffffff'
              : '#fafafa',
          boxShadow: isSelected
            ? `0 0 0 2px ${color}, 0 20px 40px -12px rgba(0,0,0,0.15)`
            : isHovered
              ? '0 20px 40px -12px rgba(0,0,0,0.12)'
              : '0 4px 20px -4px rgba(0,0,0,0.08)',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
        }}
      >
        {/* Accent bar */}
        {!isRoot && (
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: color }}
          />
        )}

        {/* Content */}
        <div className={`${isRoot ? 'p-6' : 'p-4'}`}>
          {/* Header */}
          <div className="flex items-start gap-3">
            {/* Expand indicator */}
            {has_children && !isRoot && (
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  onExpand?.(id);
                }}
                disabled={isLoading}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex-shrink-0 mt-0.5
                  w-6 h-6 rounded-lg
                  flex items-center justify-center
                  transition-colors duration-200
                `}
                style={{
                  backgroundColor: isExpanded ? color : `${color}15`,
                  color: isExpanded ? '#ffffff' : color,
                }}
              >
                {isLoading ? (
                  <motion.svg
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12" cy="12" r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray="32"
                      strokeLinecap="round"
                    />
                  </motion.svg>
                ) : (
                  <motion.svg
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </motion.svg>
                )}
              </motion.button>
            )}

            {/* Title and type */}
            <div className="flex-1 min-w-0">
              <h3
                className={`
                  font-semibold leading-snug tracking-tight
                  ${isRoot
                    ? 'text-base text-white'
                    : 'text-sm text-slate-800'
                  }
                `}
              >
                {title}
              </h3>

              {/* Type badge - compact */}
              <span
                className={`
                  inline-block mt-1.5
                  text-[10px] font-medium uppercase tracking-wider
                  px-2 py-0.5 rounded-full
                `}
                style={{
                  backgroundColor: isRoot ? 'rgba(255,255,255,0.12)' : `${color}12`,
                  color: isRoot ? 'rgba(255,255,255,0.7)' : color,
                }}
              >
                {node_type}
              </span>
            </div>
          </div>

          {/* Progressive disclosure content */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {/* Summary */}
                <p
                  className={`
                    mt-3 text-xs leading-relaxed
                    ${isRoot ? 'text-slate-300' : 'text-slate-500'}
                  `}
                >
                  {summary.length > 150 ? `${summary.substring(0, 150)}...` : summary}
                </p>

                {/* Key concepts */}
                {key_concepts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {key_concepts.slice(0, 4).map((concept: string, idx: number) => (
                      <span
                        key={idx}
                        className={`
                          text-[10px] font-medium
                          px-2 py-1 rounded-md
                          ${isRoot
                            ? 'bg-white/10 text-white/80'
                            : 'bg-slate-100 text-slate-600'
                          }
                        `}
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Root expand button */}
          {isRoot && has_children && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onExpand?.(id);
              }}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                w-full mt-4 py-2.5 rounded-xl
                text-xs font-semibold tracking-wide
                transition-all duration-200
                ${isLoading ? 'opacity-60' : ''}
              `}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Loading...
                </span>
              ) : isExpanded ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                  Collapse
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  Explore Topics
                </span>
              )}
            </motion.button>
          )}
        </div>

        {/* Hover glow effect */}
        {!isRoot && isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${color}08 0%, transparent 70%)`,
            }}
          />
        )}
      </motion.div>

      {/* Connection handle - outgoing */}
      {has_children && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-transparent !border-0"
          style={{ bottom: -1 }}
        />
      )}
    </motion.div>
  );
}

export const MindMapNode = memo(MindMapNodeComponent);
