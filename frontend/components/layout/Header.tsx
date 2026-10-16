'use client';

import { Network, RefreshCw, Download } from 'lucide-react';
import { SimulationMetrics } from '@/lib/types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface HeaderProps {
  status: 'ready' | 'running' | 'failed';
  metrics: SimulationMetrics | null;
  onReset: () => void;
}

export function Header({ status, metrics, onReset }: HeaderProps) {
  const healthPct =
    metrics && metrics.packets_sent > 0
      ? Math.round(metrics.delivery_ratio * 100)
      : 100;

  const statusConfig = {
    ready: { label: 'Ready', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    running: { label: 'Running', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    failed: { label: 'Failed', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  }[status];

  return (
    <header className="bg-navy-800 border-b border-navy-600 px-4 py-3 flex items-center gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center">
          <Network className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg text-white tracking-tight hidden sm:block">
          NetHeal
        </span>
      </div>

      <div className="h-6 w-px bg-navy-600 hidden sm:block" />

      {/* Status */}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border',
          statusConfig.cls
        )}
      >
        <span
          className={cn('w-1.5 h-1.5 rounded-full', {
            'bg-emerald-400': status === 'ready',
            'bg-amber-400 animate-pulse': status === 'running',
            'bg-red-400': status === 'failed',
          })}
        />
        {statusConfig.label}
      </span>

      {/* Health */}
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
        Health: {healthPct}%
      </span>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy-700 hover:bg-navy-600 text-slate-300 text-xs font-medium transition-colors border border-navy-600"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reset
        </button>
        <a
          href={api.exportJson()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy-700 hover:bg-navy-600 text-slate-300 text-xs font-medium transition-colors border border-navy-600"
        >
          <Download className="w-3.5 h-3.5" />
          JSON
        </a>
        <a
          href={api.exportCsv()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy-700 hover:bg-navy-600 text-slate-300 text-xs font-medium transition-colors border border-navy-600"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </a>
      </div>
    </header>
  );
}
