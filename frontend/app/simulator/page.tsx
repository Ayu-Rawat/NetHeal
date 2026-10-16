'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { NetworkState, TopologyInfo } from '@/lib/types';
import { Header } from '@/components/layout/Header';
import { NetworkCanvas } from '@/components/topology/NetworkCanvas';
import { ControlPanel } from '@/components/controls/ControlPanel';
import { EventLog } from '@/components/eventlog/EventLog';
import { DevicePalette } from '@/components/topology/DevicePalette';
import { Loader2, AlertCircle, Pencil, X, Check } from 'lucide-react';

interface PacketPath { id: string; path: string[]; delayMs?: number }

export default function SimulatorPage() {
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [topologies, setTopologies] = useState<TopologyInfo[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Canvas lock
  const [canvasLocked, setCanvasLocked] = useState(false);

  // Packet animation paths
  const [packetPaths, setPacketPaths] = useState<PacketPath[]>([]);

  // Link cost editor
  const [editingLink, setEditingLink] = useState<{ id: string; cost: number } | null>(null);
  const [editCostValue, setEditCostValue] = useState('');
  const [editCostError, setEditCostError] = useState('');

  // Resizable panels
  const [panelWidth, setPanelWidth] = useState<number>(380);
  const [logHeight, setLogHeight] = useState<number>(220);
  const [isResizingX, setIsResizingX] = useState(false);
  const [isResizingY, setIsResizingY] = useState(false);
  const isResizingXRef = useRef(false);
  const isResizingYRef = useRef(false);

  const fetchState = useCallback(async () => {
    try {
      const state = await api.getState();
      setNetworkState(state);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTopologies = useCallback(async () => {
    try {
      const tops = await api.getTopologies();
      setTopologies(tops);
    } catch {}
  }, []);

  useEffect(() => {
    fetchTopologies();
    fetchState();
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
      setPacketPaths([]);
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
      setPacketPaths([]);
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
    } catch {}
  };

  // Packet send — trigger visual animation along the active route
  const handlePacketsSent = useCallback((path: string[]) => {
    if (path.length < 2) return;
    const stamp = Date.now();
    setPacketPaths(
      [0, 1, 2, 3].map((i) => ({
        id: `pkt-${stamp}-${i}`,
        path,
        delayMs: i * 220,
      }))
    );
  }, []);

  const handleDropDevice = useCallback(async (deviceType: string, x: number, y: number) => {
    try {
      await api.addNode(deviceType, x, y);
      await fetchState();
      setSelectedDevice(null);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to add device');
    }
  }, [fetchState]);

  const handleConnectNodes = useCallback(async (source: string, target: string) => {
    try {
      await api.addLink(source, target);
      await fetchState();
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect devices');
    }
  }, [fetchState]);

  // Link cost editor
  const handleOpenCostEdit = useCallback((linkId: string, currentCost: number) => {
    setEditingLink({ id: linkId, cost: currentCost });
    setEditCostValue(String(currentCost));
    setEditCostError('');
    setSelectedEdgeId(linkId);
  }, []);

  const handleSaveCost = async () => {
    if (!editingLink) return;
    const parsed = parseFloat(editCostValue);
    if (isNaN(parsed) || parsed <= 0) { setEditCostError('Cost must be > 0'); return; }
    try {
      await api.updateLinkCost(editingLink.id, parsed);
      await fetchState();
      setEditingLink(null);
    } catch (err: any) {
      setEditCostError(err?.message || 'Failed to update cost');
    }
  };

  // Resize handlers
  const startResizeX = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingXRef.current = true; setIsResizingX(true);
    const startX = e.clientX, startWidth = panelWidth;
    const move = (me: MouseEvent) => {
      if (!isResizingXRef.current) return;
      setPanelWidth(Math.min(Math.max(startWidth + (startX - me.clientX), 260), 650));
    };
    const up = () => { isResizingXRef.current = false; setIsResizingX(false); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  const startResizeY = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingYRef.current = true; setIsResizingY(true);
    const startY = e.clientY, startH = logHeight;
    const move = (me: MouseEvent) => {
      if (!isResizingYRef.current) return;
      setLogHeight(Math.min(Math.max(startH + (startY - me.clientY), 90), window.innerHeight * 0.75));
    };
    const up = () => { isResizingYRef.current = false; setIsResizingY(false); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  };

  const failedLinks = networkState?.links.filter(l => l.status === 'DOWN').map(l => l.id) || [];
  const failedRouters = networkState?.routers.filter(r => r.status === 'DOWN').map(r => r.id) || [];

  const simStatus: 'ready' | 'running' | 'failed' =
    failedLinks.length > 0 || failedRouters.length > 0 ? 'failed'
    : networkState?.packets.some(p => p.status === 'IN_TRANSIT') ? 'running'
    : 'ready';

  const lastEvent = networkState?.events?.length
    ? networkState.events[networkState.events.length - 1]
    : null;

  const isResizingAny = isResizingX || isResizingY;

  return (
    <div className={`flex flex-col h-screen bg-[#101010] text-slate-300 overflow-hidden ${isResizingAny ? 'select-none' : ''}`}>
      <Header status={simStatus} metrics={networkState?.metrics || null} onReset={handleReset} />

      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 text-red-400 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Backend Error: {error}. Make sure FastAPI is running at http://localhost:8000.</span>
          </div>
          <button onClick={fetchState} className="underline hover:text-red-300 ml-4 font-semibold">Retry</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {loading && !networkState && (
          <div className="absolute inset-0 z-50 bg-[#101010]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#007acc] animate-spin" />
            <p className="text-sm text-slate-300">Connecting to NetHeal Engine...</p>
          </div>
        )}

        {/* Left: Device Palette */}
        <DevicePalette selectedDevice={selectedDevice} onSelectDevice={setSelectedDevice} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Canvas */}
            <div className={`flex-1 flex flex-col min-h-[300px] h-[55%] lg:h-auto relative ${isResizingAny ? 'pointer-events-none' : ''}`}>
              {/* Hint bar */}
              <div className="absolute top-3 left-4 z-10 pointer-events-none">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#181818]/90 border border-[#333] text-slate-300 shadow backdrop-blur-sm">
                  {selectedDevice
                    ? `Drop or click canvas to place ${selectedDevice}`
                    : canvasLocked
                    ? '🔒 Canvas locked — unlock to drag nodes'
                    : 'Drop devices • Drag a handle to another device to connect • Send packets to animate'}
                </span>
              </div>

              {/* Link cost editor popup */}
              {editingLink && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 bg-[#181818] border border-[#333] rounded-xl shadow-2xl p-4 w-72">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-[#007acc]" />
                      <span className="text-sm font-semibold text-white">Edit Link Cost</span>
                    </div>
                    <button onClick={() => setEditingLink(null)} className="text-slate-500 hover:text-slate-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Link <span className="text-white font-mono">{editingLink.id}</span> — current:{' '}
                    <span className="text-[#007acc] font-semibold">{editingLink.cost}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="1" step="1" value={editCostValue} autoFocus
                      onChange={e => { setEditCostValue(e.target.value); setEditCostError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveCost(); if (e.key === 'Escape') setEditingLink(null); }}
                      className="flex-1 h-8 px-2 rounded-md bg-[#252526] border border-[#444] text-white text-sm focus:outline-none focus:border-[#007acc]"
                      placeholder="New cost…"
                    />
                    <button onClick={handleSaveCost} className="h-8 px-3 rounded-md bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                  {editCostError && <p className="text-xs text-red-400 mt-2">{editCostError}</p>}
                  <p className="text-[10px] text-slate-500 mt-2">Enter to save · Escape to cancel</p>
                </div>
              )}

              <div className="flex-1 h-full">
                <NetworkCanvas
                  routers={networkState?.routers || []}
                  links={networkState?.links || []}
                  activeRoute={networkState?.active_route || null}
                  failedLinks={failedLinks}
                  failedRouters={failedRouters}
                  onNodeSelect={id => { setSelectedNodeId(id); setSelectedEdgeId(null); }}
                  onEdgeSelect={id => { setSelectedEdgeId(id); setSelectedNodeId(null); }}
                  onEdgeCostEdit={handleOpenCostEdit}
                  onDropDevice={handleDropDevice}
                  onConnectNodes={handleConnectNodes}
                  selectedDevice={selectedDevice}
                  packetPaths={packetPaths}
                  locked={canvasLocked}
                  onLockToggle={() => setCanvasLocked(l => !l)}
                />
              </div>
            </div>

            {/* Vertical splitter */}
            <div
              onMouseDown={startResizeX}
              className={`hidden lg:flex w-2 hover:w-2.5 transition-all bg-[#181818] border-l border-r border-[#252526] hover:bg-[#007acc] cursor-col-resize items-center justify-center shrink-0 z-20 group ${isResizingX ? 'bg-[#007acc]' : ''}`}
            >
              <div className="h-8 w-0.5 rounded-full bg-[#444] group-hover:bg-white" />
            </div>

            {/* Control Panel */}
            <div
              style={{ width: `${panelWidth}px` }}
              className="w-full lg:w-auto bg-[#181818] border-t lg:border-t-0 border-[#333] overflow-y-auto shrink-0 transition-none"
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
                onEditLinkCost={handleOpenCostEdit}
                onPacketsSent={handlePacketsSent}
              />
            </div>
          </div>

          {/* Horizontal splitter */}
          <div
            onMouseDown={startResizeY}
            className={`h-2 hover:h-2.5 transition-all bg-[#181818] border-t border-b border-[#252526] hover:bg-[#007acc] cursor-row-resize flex items-center justify-center shrink-0 z-20 group ${isResizingY ? 'bg-[#007acc]' : ''}`}
          >
            <div className="w-12 h-0.5 rounded-full bg-[#444] group-hover:bg-white" />
          </div>

          {/* Event Log */}
          <div style={{ height: `${logHeight}px` }} className="bg-[#101010] p-2 shrink-0 overflow-hidden">
            <EventLog events={networkState?.events || []} onClear={handleClearEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}
