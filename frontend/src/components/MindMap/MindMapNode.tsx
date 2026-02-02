import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { motion } from 'framer-motion';
import type { MindMapNode as MindMapNodeType } from '../../types';

export interface MindMapNodeData extends MindMapNodeType {
  isExpanded: boolean;
  isLoading: boolean;
  isSelected: boolean;
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
    isSelected,
    color,
    key_concepts,
    onExpand,
    onClick,
  } = data;

  const isRoot = node_type === 'root';
  const nodeWidth = isRoot ? 280 : 240;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`
        rounded-lg shadow-lg border-2 transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
        ${isRoot ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white' : 'bg-white'}
      `}
      style={{
        width: nodeWidth,
        borderColor: isSelected ? color : isRoot ? 'transparent' : '#e2e8f0',
      }}
      onClick={() => onClick?.(id)}
    >
      {/* Incoming handle */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-slate-400"
        />
      )}

      {/* Node content */}
      <div className="p-4">
        {/* Header with type badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3
            className={`font-semibold text-sm leading-tight ${
              isRoot ? 'text-white' : 'text-slate-800'
            }`}
          >
            {title}
          </h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              backgroundColor: isRoot ? 'rgba(255,255,255,0.2)' : `${color}20`,
              color: isRoot ? 'white' : color,
            }}
          >
            {node_type}
          </span>
        </div>

        {/* Summary */}
        <p
          className={`text-xs leading-relaxed mb-3 ${
            isRoot ? 'text-blue-100' : 'text-slate-600'
          }`}
        >
          {summary.length > 120 ? `${summary.substring(0, 120)}...` : summary}
        </p>

        {/* Key concepts */}
        {key_concepts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {key_concepts.slice(0, 3).map((concept: string, idx: number) => (
              <span
                key={idx}
                className={`text-xs px-2 py-0.5 rounded ${
                  isRoot
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {concept}
              </span>
            ))}
          </div>
        )}

        {/* Expand button */}
        {has_children && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand?.(id);
            }}
            disabled={isLoading}
            className={`
              w-full py-1.5 rounded text-xs font-medium transition-colors
              ${
                isRoot
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }
              ${isLoading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Loading...
              </span>
            ) : isExpanded ? (
              'Collapse'
            ) : (
              'Expand'
            )}
          </button>
        )}
      </div>

      {/* Outgoing handle */}
      {has_children && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-slate-400"
        />
      )}
    </motion.div>
  );
}

export const MindMapNode = memo(MindMapNodeComponent);
