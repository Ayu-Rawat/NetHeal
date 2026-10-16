'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type {
  NetworkState,
  TopologyInfo,
} from '@/lib/types';
import { Header } from '@/components/layout/Header';
import { NetworkCanvas } from '@/components/topology/NetworkCanvas';
import { ControlPanel } from '@/components/controls/ControlPanel';
import { EventLog } from '@/components/eventlog/EventLog';
import { Loader2, AlertCircle, GripHorizontal, GripVertical } from 'lucide-react';

export default function SimulatorPage() {
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [topologies, setTopologies] = useState<TopologyInfo[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Resizable Panel Dimensions (like IDE layout)
  const [panelWidth, setPanelWidth] = useState<number>(380);
  const [logHeight, setLogHeight] = useState<number>(220);
  const [isResizingX, setIsResizingX] = useState<boolean>(false);
  const [isResizingY, setIsResizingY] = useState<boolean>(false);

  const isResizingXRef = useRef(false);
  const isResizingYRef = useRef(false);

  const fetchState = useCallback(async () => {
    try {
      const state = await api.getState();
      setNetworkState(state);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch state:', err);
      setError(err?.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTopologies = useCallback(async () => {
    try {
      const tops = await api.getTopologies();
      setTopologies(tops);
    } catch (err) {
      console.error('Failed to fetch topologies:', err);
    }
  }, []);

  useEffect(() => {
    fetchTopologies();
    fetchState();

    // Auto-poll state every 2.5 seconds
    const interval = setInterval(fetchState, 2500);
    return () => clearInterval(interval);
  }, [fetchState, fetchTopologies]);

  const handleReset = async () => {
    try {
      setLoading(true);
      await api.reset();
      await fetchState();
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    } catch (err: any) {
      setError(err?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTopology = async (id: string) => {
    try {
      setLoading(true);
      await api.loadTopology(id);
      await fetchState();
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load topology');
    } finally {
      setLoading(false);
    }
  };

  const handleClearEvents = async () => {
    try {
      await api.clearEvents();
      await fetchState();
    } catch (err) {
      console.error('Failed to clear events:', err);
    }
  };

  // Horizontal Resize (Control Panel Width)
  const startResizeX = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingXRef.current = true;
    setIsResizingX(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingXRef.current) return;
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.min(Math.max(startWidth + delta, 260), 650);
      setPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingXRef.current = false;
      setIsResizingX(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Vertical Resize (Event Log Terminal Height)
  const startResizeY = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingYRef.current = true;
    setIsResizingY(true);
    const startY = e.clientY;
    const startHeight = logHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingYRef.current) return;
      const delta = startY - moveEvent.clientY;
      const maxH = typeof window !== 'undefined' ? window.innerHeight * 0.75 : 550;
      const newHeight = Math.min(Math.max(startHeight + delta, 90), maxH);
      setLogHeight(newHeight);
    };

    const onMouseUp = () => {
      isResizingYRef.current = false;
      setIsResizingY(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const failedLinks =
    networkState?.links.filter((l) => l.status === 'DOWN').map((l) => l.id) || [];
  const failedRouters =
    networkState?.routers.filter((r) => r.status === 'DOWN').map((r) => r.id) || [];

  const simStatus: 'ready' | 'running' | 'failed' =
    failedLinks.length > 0 || failedRouters.length > 0
      ? 'failed'
      : networkState?.packets.some((p) => p.status === 'IN_TRANSIT')
      ? 'running'
      : 'ready';

  const lastEvent =
    networkState?.events && networkState.events.length > 0
      ? networkState.events[networkState.events.length - 1]
      : null;

  const isResizingAny = isResizingX || isResizingY;

  return (
    <div
      className={`flex flex-col h-screen bg-navy-900 text-slate-300 overflow-hidden ${
        isResizingAny ? 'select-none' : ''
      }`}
    >
      {/* Top Header */}
      <Header
        status={simStatus}
        metrics={networkState?.metrics || null}
        onReset={handleReset}
      />

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-400 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Backend Connection Error: {error}. Ensure FastAPI is running at
              http://localhost:8000.
            </span>
          </div>
          <button
            onClick={fetchState}
            className="underline hover:text-red-300 ml-4 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Simulation Viewport (Canvas + Resizable Control Panel) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {loading && !networkState && (
          <div className="absolute inset-0 z-50 bg-navy-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm text-slate-300">Connecting to NetHeal Engine...</p>
          </div>
        )}

        {/* Center: Interactive React Flow Topology Canvas */}
        <div
          className={`flex-1 flex flex-col min-h-[300px] h-[55%] lg:h-auto relative ${
            isResizingAny ? 'pointer-events-none' : ''
          }`}
        >
          <div className="absolute top-3 left-4 z-10 pointer-events-none">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-navy-800/90 border border-navy-700 text-slate-300 shadow backdrop-blur-sm">
              Topology Canvas (Click Router or Link to Inspect / Fail)
            </span>
          </div>

          <div className="flex-1 h-full">
            <NetworkCanvas
              routers={networkState?.routers || []}
              links={networkState?.links || []}
              activeRoute={networkState?.active_route || null}
              failedLinks={failedLinks}
              failedRouters={failedRouters}
              onNodeSelect={(id) => {
                setSelectedNodeId(id);
                setSelectedEdgeId(null);
              }}
              onEdgeSelect={(id) => {
                setSelectedEdgeId(id);
                setSelectedNodeId(null);
              }}
            />
          </div>
        </div>

        {/* Vertical Splitter / Resize Handle between Canvas and Control Panel */}
        <div
          onMouseDown={startResizeX}
          className={`hidden lg:flex w-2 hover:w-2.5 transition-all bg-[#181818] border-l border-r border-[#252526] hover:bg-[#007acc] cursor-col-resize items-center justify-center shrink-0 z-20 group ${
            isResizingX ? 'bg-[#007acc] w-2.5' : ''
          }`}
          title="Drag left or right to resize Control Panel"
        >
          <div className="h-8 w-0.5 rounded-full bg-[#444444] group-hover:bg-white transition-colors" />
        </div>

        {/* Right: Operational Control Panel (Resizable Width) */}
        <div
          style={{ width: `${panelWidth}px` }}
          className="w-full lg:w-auto bg-navy-800/90 border-t lg:border-t-0 border-navy-700/60 overflow-y-auto p-4 shrink-0 transition-none"
        >
          <ControlPanel
            routers={networkState?.routers || []}
            links={networkState?.links || []}
            topologies={topologies}
            activeRoute={networkState?.active_route || null}
            metrics={networkState?.metrics || null}
            lastEvent={lastEvent}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onRefresh={fetchState}
            onReset={handleReset}
            onLoadTopology={handleLoadTopology}
          />
        </div>
      </div>

      {/* Horizontal Splitter / Resize Handle between Main Viewport and Live Event Log */}
      <div
        onMouseDown={startResizeY}
        className={`h-2 hover:h-2.5 transition-all bg-[#181818] border-t border-b border-[#252526] hover:bg-[#007acc] cursor-row-resize flex items-center justify-center shrink-0 z-20 group ${
          isResizingY ? 'bg-[#007acc] h-2.5' : ''
        }`}
        title="Drag up or down to resize Live Event Log terminal height"
      >
        <div className="w-12 h-0.5 rounded-full bg-[#444444] group-hover:bg-white transition-colors" />
      </div>

      {/* Bottom: Real-Time Event Log Stream (Resizable Height like IDE Terminal) */}
      <div
        style={{ height: `${logHeight}px` }}
        className="bg-navy-900 p-2 shrink-0 overflow-hidden transition-none"
      >
        <EventLog
          events={networkState?.events || []}
          onClear={handleClearEvents}
        />
      </div>
    </div>
  );
}
