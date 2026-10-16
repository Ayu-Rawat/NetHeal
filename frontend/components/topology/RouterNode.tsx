'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';

interface RouterNodeData {
  label: string;
  status: 'UP' | 'DOWN';
  connectionCount: number;
  selected?: boolean;
}

function RouterNodeComponent({ data, selected }: NodeProps) {
  const nodeData = (data as unknown) as RouterNodeData;
  const isDown = nodeData.status === 'DOWN';

  return (
    <div
      className={cn(
        'relative px-3 py-2 rounded-lg border-2 min-w-[80px] text-center transition-all',
        isDown
          ? 'bg-navy-800/50 border-red-500/50 opacity-60'
          : 'bg-navy-700 border-navy-600',
        selected && !isDown && 'border-cyan-400 shadow-[0_0_12px_rgba(0,122,204,0.5)]',
        selected && isDown && 'border-red-400'
      )}
    >
      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-[#555555] !border-[#333333] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#555555] !border-[#333333] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-[#555555] !border-[#333333] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-[#555555] !border-[#333333] !w-2 !h-2" />

      {/* Status indicator */}
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isDown ? 'bg-red-500' : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
          )}
        />
        <span
          className={cn(
            'font-bold text-sm',
            isDown ? 'text-slate-500' : 'text-white'
          )}
        >
          {nodeData.label}
        </span>
      </div>

      {/* Status badge */}
      <div
        className={cn(
          'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
          isDown
            ? 'bg-red-500/20 text-red-400'
            : 'bg-emerald-500/20 text-emerald-400'
        )}
      >
        {nodeData.status}
      </div>

      {/* Connection count */}
      <div className="text-[9px] text-slate-500 mt-1">
        {nodeData.connectionCount} link{nodeData.connectionCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export const RouterNode = memo(RouterNodeComponent);
