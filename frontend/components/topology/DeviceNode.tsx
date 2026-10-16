'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Router, Monitor, Printer, Server, Wifi, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DeviceKind = 'router' | 'pc' | 'printer' | 'server' | 'switch' | 'storage';

interface DeviceNodeData {
  label: string;
  status: 'UP' | 'DOWN';
  connectionCount: number;
  deviceType?: DeviceKind | string;
}

const ICONS: Record<string, typeof Router> = {
  router: Router,
  pc: Monitor,
  printer: Printer,
  server: Server,
  switch: Wifi,
  storage: HardDrive,
};

const ACCENT: Record<string, { idle: string; down: string; icon: string }> = {
  router: { idle: 'border-cyan-500/50', down: 'border-red-500/50', icon: 'text-cyan-400' },
  pc: { idle: 'border-emerald-500/50', down: 'border-red-500/50', icon: 'text-emerald-400' },
  printer: { idle: 'border-amber-500/50', down: 'border-red-500/50', icon: 'text-amber-400' },
  server: { idle: 'border-purple-500/50', down: 'border-red-500/50', icon: 'text-purple-400' },
  switch: { idle: 'border-blue-500/50', down: 'border-red-500/50', icon: 'text-blue-400' },
  storage: { idle: 'border-rose-500/50', down: 'border-red-500/50', icon: 'text-rose-400' },
};

const HANDLE_CLASS = '!w-2.5 !h-2.5 !bg-[#555] !border-[#222] !border-2 hover:!bg-[#007acc] hover:!scale-125 transition-transform';

function DeviceNodeComponent({ data, selected }: NodeProps) {
  const nodeData = (data as unknown) as DeviceNodeData;
  const isDown = nodeData.status === 'DOWN';
  const kind = (nodeData.deviceType || 'router').toLowerCase();
  const Icon = ICONS[kind] ?? Router;
  const accent = ACCENT[kind] ?? ACCENT.router;

  return (
    <div
      className={cn(
        'relative px-3 py-2 rounded-lg border-2 min-w-[92px] text-center transition-all bg-[#1a1a1a]',
        isDown ? `${accent.down} opacity-60` : accent.idle,
        selected && !isDown && 'shadow-[0_0_12px_rgba(0,122,204,0.5)] border-cyan-400',
        selected && isDown && 'border-red-400'
      )}
    >
      <Handle type="source" position={Position.Top} id="top" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Left} id="left" className={HANDLE_CLASS} />

      <div className="flex items-center justify-center gap-1.5 mb-1">
        <Icon className={cn('w-3.5 h-3.5', isDown ? 'text-slate-500' : accent.icon)} />
        <span className={cn('font-bold text-sm', isDown ? 'text-slate-500' : 'text-white')}>
          {nodeData.label}
        </span>
      </div>

      <div
        className={cn(
          'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
          isDown ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
        )}
      >
        {nodeData.status}
      </div>

      <div className="text-[9px] text-slate-500 mt-1">
        {nodeData.connectionCount} link{nodeData.connectionCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeComponent);
