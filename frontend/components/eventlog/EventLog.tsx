'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SimEvent, EventSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Filter, Activity, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventLogProps {
  events: SimEvent[];
  onClear: () => void;
}

export function EventLog({ events, onClear }: EventLogProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const bottomRef = useRef<HTMLDivElement>(null);

  const categories = Array.from(new Set(events.map((e) => e.category || 'SYSTEM')));

  const filteredEvents = events.filter((e) => {
    const matchSeverity =
      selectedSeverity === 'ALL' || e.severity === selectedSeverity;
    const matchCategory =
      selectedCategory === 'ALL' || (e.category || 'SYSTEM') === selectedCategory;
    return matchSeverity && matchCategory;
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const severityBadge = (sev: EventSeverity) => {
    switch (sev) {
      case 'SUCCESS':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            SUCCESS
          </span>
        );
      case 'ERROR':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-500/20 text-red-400 border border-red-500/30">
            ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
            WARN
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
            INFO
          </span>
        );
    }
  };

  return (
    <div className="bg-navy-800 border border-navy-600 rounded-lg flex flex-col h-full shadow-lg overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-navy-800/80 border-b border-navy-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-100">Live Event Log</span>
          <Badge variant="secondary" className="bg-navy-700 text-slate-300 text-xs">
            {filteredEvents.length} events
          </Badge>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-navy-900 border border-navy-700 rounded-md p-0.5 text-xs">
            {['ALL', 'INFO', 'WARNING', 'ERROR', 'SUCCESS'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={cn(
                  'px-2 py-1 rounded text-[11px] transition-colors',
                  selectedSeverity === sev
                    ? 'bg-[#007acc] text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {sev}
              </button>
            ))}
          </div>

          {categories.length > 1 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-navy-900 border border-navy-700 text-slate-300 rounded-md text-xs px-2 py-1 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 px-2"
            title="Clear Event Log"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs flex flex-col items-center justify-center gap-1">
            <Activity className="w-5 h-5 text-slate-600" />
            <span>No events matching the current filter.</span>
          </div>
        ) : (
          filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="flex items-start gap-2.5 py-1 px-2 rounded bg-navy-900/60 border border-navy-700/50 hover:border-navy-600 transition-colors"
            >
              <span className="text-[11px] text-slate-500 shrink-0 select-none">
                {ev.timestamp.split('T')[1]?.split('.')[0] || ev.timestamp}
              </span>
              <div className="shrink-0">{severityBadge(ev.severity)}</div>
              {ev.category && (
                <span className="text-[10px] font-bold text-slate-400 bg-navy-800 px-1.5 py-0.5 rounded border border-navy-700 shrink-0">
                  {ev.category}
                </span>
              )}
              <span className="text-slate-200 break-words flex-1 leading-relaxed">
                {ev.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
