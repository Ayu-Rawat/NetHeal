'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type {
  RouterState,
  LinkState,
  RouteResult,
  SimulationMetrics,
  SimEvent,
  TopologyInfo,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Route,
  Send,
  Wifi,
  WifiOff,
  Router,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  routers: RouterState[];
  links: LinkState[];
  topologies: TopologyInfo[];
  activeRoute: RouteResult | null;
  metrics: SimulationMetrics | null;
  lastEvent: SimEvent | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onRefresh: () => void;
  onReset: () => void;
  onLoadTopology: (id: string) => void;
}

export function ControlPanel({
  routers,
  links,
  topologies,
  activeRoute,
  metrics,
  lastEvent,
  selectedNodeId,
  selectedEdgeId,
  onRefresh,
  onReset,
  onLoadTopology,
}: ControlPanelProps) {
  const [src, setSrc] = useState('');
  const [dst, setDst] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const failedLinks = links.filter((l) => l.status === 'DOWN').map((l) => l.id);
  const failedRouters = routers.filter((r) => r.status === 'DOWN').map((r) => r.id);

  async function handleComputeRoute() {
    if (!src || !dst) return;
    setLoading(true);
    setError(null);
    try {
      await api.getRoute(src, dst);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPackets() {
    if (!src || !dst) return;
    setLoading(true);
    setError(null);
    try {
      await api.sendPackets(src, dst, 4);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleFailLink() {
    if (!selectedEdgeId) return;
    setLoading(true);
    try {
      await api.failLink(selectedEdgeId);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreLink() {
    if (!selectedEdgeId) return;
    setLoading(true);
    try {
      await api.restoreLink(selectedEdgeId);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleFailRouter() {
    if (!selectedNodeId) return;
    setLoading(true);
    try {
      await api.failRouter(selectedNodeId);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreRouter() {
    if (!selectedNodeId) return;
    setLoading(true);
    try {
      await api.restoreRouter(selectedNodeId);
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreFailedLink(id: string) {
    try {
      await api.restoreLink(id);
      onRefresh();
    } catch {}
  }

  async function handleRestoreFailedRouter(id: string) {
    try {
      await api.restoreRouter(id);
      onRefresh();
    } catch {}
  }

  const selectedNode = routers.find((r) => r.id === selectedNodeId);
  const selectedEdge = links.find((l) => l.id === selectedEdgeId);

  return (
    <div className="h-full overflow-y-auto bg-navy-800 border-l border-navy-600 flex flex-col">
      <div className="p-4 border-b border-navy-600">
        <h2 className="font-semibold text-white text-sm">Control Panel</h2>
      </div>

      <div className="flex-1 p-3 space-y-4 overflow-y-auto">
        {/* Topology Selector */}
        {topologies.length > 0 && (
          <section>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Topology
            </label>
            <Select onValueChange={onLoadTopology}>
              <SelectTrigger className="mt-1 h-8 text-xs bg-navy-700 border-navy-600">
                <SelectValue placeholder="Select topology…" />
              </SelectTrigger>
              <SelectContent>
                {topologies.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        )}

        <Separator className="bg-navy-600" />

        {/* Route Control */}
        <section className="space-y-2">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Routing
          </label>
          <Select value={src} onValueChange={setSrc}>
            <SelectTrigger className="h-8 text-xs bg-navy-700 border-navy-600">
              <SelectValue placeholder="Source router…" />
            </SelectTrigger>
            <SelectContent>
              {routers.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs">
                  {r.display_name} ({r.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dst} onValueChange={setDst}>
            <SelectTrigger className="h-8 text-xs bg-navy-700 border-navy-600">
              <SelectValue placeholder="Destination router…" />
            </SelectTrigger>
            <SelectContent>
              {routers.map((r) => (
                <SelectItem key={r.id} value={r.id} className="text-xs">
                  {r.display_name} ({r.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="h-8 text-xs bg-[#007acc] hover:bg-[#0062a3] text-white font-medium"
              onClick={handleComputeRoute}
              disabled={!src || !dst || loading}
            >
              <Route className="w-3.5 h-3.5 mr-1" />
              Compute Route
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500"
              onClick={handleSendPackets}
              disabled={!src || !dst || loading}
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Send 4 Pkts
            </Button>
          </div>
        </section>

        {/* Route Info */}
        {activeRoute && (
          <div className="bg-navy-700 rounded-lg p-3 border border-navy-600">
            <p className="text-xs font-medium text-cyan-400 mb-1.5">Active Route</p>
            <p className="text-xs text-white font-mono">
              {activeRoute.path.join(' → ')}
            </p>
            <div className="flex gap-3 mt-2">
              <span className="text-xs text-slate-400">
                Cost: <span className="text-white">{activeRoute.cost}</span>
              </span>
              <span className="text-xs text-slate-400">
                Hops: <span className="text-white">{activeRoute.hops}</span>
              </span>
              <span className={cn('text-xs font-medium', activeRoute.reachable ? 'text-emerald-400' : 'text-red-400')}>
                {activeRoute.reachable ? 'Reachable' : 'Unreachable'}
              </span>
            </div>
            {!activeRoute.reachable && (
              <p className="text-xs text-red-400 mt-1">{activeRoute.reason}</p>
            )}
          </div>
        )}

        <Separator className="bg-navy-600" />

        {/* Selection Actions */}
        <section className="space-y-2">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
            Failure Injection
          </label>

          {/* Selected element info */}
          {selectedNode && (
            <p className="text-xs text-slate-400">
              Selected node:{' '}
              <span className="text-white">{selectedNode.display_name}</span>{' '}
              <Badge
                className={cn(
                  'text-[10px] px-1.5',
                  selectedNode.status === 'UP'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                )}
                variant="outline"
              >
                {selectedNode.status}
              </Badge>
            </p>
          )}
          {selectedEdge && (
            <p className="text-xs text-slate-400">
              Selected link:{' '}
              <span className="text-white">{selectedEdge.id}</span>{' '}
              <Badge
                className={cn(
                  'text-[10px] px-1.5',
                  selectedEdge.status === 'UP'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                )}
                variant="outline"
              >
                {selectedEdge.status}
              </Badge>
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              disabled={!selectedEdgeId || loading}
              onClick={handleFailLink}
            >
              <WifiOff className="w-3.5 h-3.5 mr-1" />
              Fail Link
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500"
              disabled={!selectedEdgeId || loading}
              onClick={handleRestoreLink}
            >
              <Wifi className="w-3.5 h-3.5 mr-1" />
              Restore Link
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              disabled={!selectedNodeId || loading}
              onClick={handleFailRouter}
            >
              <Router className="w-3.5 h-3.5 mr-1" />
              Fail Router
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500"
              disabled={!selectedNodeId || loading}
              onClick={handleRestoreRouter}
            >
              <Router className="w-3.5 h-3.5 mr-1" />
              Restore Router
            </Button>
          </div>
        </section>

        {/* Failed elements */}
        {(failedLinks.length > 0 || failedRouters.length > 0) && (
          <>
            <Separator className="bg-navy-600" />
            <section className="space-y-2">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Failed Elements
              </label>
              {failedLinks.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between bg-red-500/10 rounded px-2 py-1"
                >
                  <span className="text-xs text-red-400 font-mono">Link: {id}</span>
                  <button
                    onClick={() => handleRestoreFailedLink(id)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300"
                  >
                    Restore
                  </button>
                </div>
              ))}
              {failedRouters.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between bg-red-500/10 rounded px-2 py-1"
                >
                  <span className="text-xs text-red-400 font-mono">Router: {id}</span>
                  <button
                    onClick={() => handleRestoreFailedRouter(id)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </section>
          </>
        )}

        <Separator className="bg-navy-600" />

        {/* Metrics Summary */}
        {metrics && (
          <section className="space-y-2">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Metrics
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Sent', val: metrics.packets_sent, color: 'text-white' },
                { label: 'Delivered', val: metrics.packets_delivered, color: 'text-emerald-400' },
                { label: 'Dropped', val: metrics.packets_dropped, color: 'text-red-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-navy-700 rounded p-2 text-center border border-navy-600">
                  <p className={cn('text-lg font-bold', color)}>{val}</p>
                  <p className="text-[10px] text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <div className="bg-navy-700 rounded p-2 border border-navy-600">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Delivery Ratio</span>
                <span className="text-xs font-bold text-cyan-400">
                  {(metrics.delivery_ratio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="mt-1.5 bg-navy-600 rounded-full h-1.5">
                <div
                  className="bg-cyan-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${metrics.delivery_ratio * 100}%` }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-navy-700 rounded p-2 border border-navy-600">
                <p className="text-xs text-slate-400">Avg Cost</p>
                <p className="text-sm font-bold text-white">{metrics.avg_route_cost.toFixed(1)}</p>
              </div>
              <div className="flex-1 bg-navy-700 rounded p-2 border border-navy-600">
                <p className="text-xs text-slate-400">Recovery</p>
                <p className="text-sm font-bold text-white">{metrics.recovery_time_ms}ms</p>
              </div>
            </div>
          </section>
        )}

        <Separator className="bg-navy-600" />

        {/* Last Event */}
        {lastEvent && (
          <section>
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Last Event
            </label>
            <div className="mt-1 bg-navy-700 rounded p-2 border border-navy-600">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  className={cn('text-[10px] px-1.5', {
                    'bg-emerald-500/20 text-emerald-400': lastEvent.severity === 'SUCCESS',
                    'bg-red-500/20 text-red-400': lastEvent.severity === 'ERROR',
                    'bg-amber-500/20 text-amber-400': lastEvent.severity === 'WARNING',
                    'bg-blue-500/20 text-blue-400': lastEvent.severity === 'INFO',
                  })}
                  variant="outline"
                >
                  {lastEvent.severity}
                </Badge>
                <span className="text-[10px] text-slate-500">
                  {new Date(lastEvent.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-slate-300">{lastEvent.message}</p>
            </div>
          </section>
        )}

        {/* Reset */}
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs border-navy-600 text-slate-400 hover:text-white hover:bg-navy-700"
          onClick={onReset}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset Topology
        </Button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
