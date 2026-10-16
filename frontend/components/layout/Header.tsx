'use client';

import Link from 'next/link';
import { Network, RefreshCw, Download, BarChart3, Home } from 'lucide-react';
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
    <header className="bg-navy-800 border-b border-navy-600 px-4 py-2.5 flex items-center gap-3">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
        <div className="w-7 h-7 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0">
          <Network className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-base text-white tracking-tight hidden sm:block">
          NetHeal
        </span>
      </Link>

      <div className="h-5 w-px bg-navy-600 hidden sm:block" />

      {/* Status */}
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border',
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
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
        Health: {healthPct}%
      </span>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Analytics link */}
        <Link
          href="/analytics"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy-700 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-400 text-xs font-medium transition-colors border border-navy-600 hover:border-cyan-500/30"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Analytics
        </Link>

        <div className="h-4 w-px bg-navy-600" />

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

        <div className="h-4 w-px bg-navy-600" />

        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-navy-700 hover:bg-navy-600 text-slate-300 text-xs font-medium transition-colors border border-navy-600"
        >
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
      </div>
    </header>
  );
}
