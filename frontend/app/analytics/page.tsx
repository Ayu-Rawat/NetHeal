'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { SimulationMetrics, NetworkState } from '@/lib/types';
import { MetricsCharts } from '@/components/charts/MetricsCharts';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  BarChart3,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<SimulationMetrics | null>(null);
  const [state, setState] = useState<NetworkState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const [metricsData, stateData] = await Promise.all([
        api.getMetrics(),
        api.getState(),
      ]);
      setMetrics(metricsData);
      setState(stateData);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const failedLinkIds =
    state?.links.filter((l) => l.status === 'DOWN').map((l) => l.id) || [];
  const failedRouterIds =
    state?.routers.filter((r) => r.status === 'DOWN').map((r) => r.id) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-navy-900 min-h-screen text-slate-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            Performance & Resilience Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time telemetry and reliability benchmarks calculated by the routing engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
            className="border-navy-700 bg-navy-800 text-slate-300 hover:bg-navy-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <a
            href={api.exportJson()}
            download="netheal-simulation.json"
            target="_blank"
            rel="noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="border-navy-700 bg-navy-800 text-slate-300 hover:bg-navy-700"
            >
              <FileJson className="w-3.5 h-3.5 mr-2 text-cyan-400" />
              Export JSON
            </Button>
          </a>

          <a
            href={api.exportCsv()}
            download="netheal-packets.csv"
            target="_blank"
            rel="noreferrer"
          >
            <Button
              variant="outline"
              size="sm"
              className="border-navy-700 bg-navy-800 text-slate-300 hover:bg-navy-700"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-400" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Main Charts & KPI Deck */}
      <MetricsCharts metrics={metrics} />

      {/* Additional Engine Health Details */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-200">
                Active Graph Fault Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-navy-700">
                <span className="text-slate-400">Severed Communication Links</span>
                <span
                  className={`font-semibold ${
                    failedLinkIds.length > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {failedLinkIds.length === 0
                    ? 'None (All operational)'
                    : `${failedLinkIds.length} link(s) severed (${failedLinkIds.join(', ')})`}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-navy-700">
                <span className="text-slate-400">Offline Routers</span>
                <span
                  className={`font-semibold ${
                    failedRouterIds.length > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {failedRouterIds.length === 0
                    ? 'None (All operational)'
                    : `${failedRouterIds.length} router(s) offline (${failedRouterIds.join(', ')})`}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Average Path Cost (Delivered)</span>
                <span className="font-semibold text-cyan-400">
                  {metrics.avg_route_cost.toFixed(2)} units
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-200">
                Packet Loss & Reliability Index
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-navy-700">
                <span className="text-slate-400">Packet Delivery Ratio (PDR)</span>
                <span className="font-semibold text-emerald-400">
                  {(metrics.delivery_ratio * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-navy-700">
                <span className="text-slate-400">Packet Loss Rate</span>
                <span className="font-semibold text-red-400">
                  {metrics.packets_sent > 0
                    ? (((metrics.packets_dropped) / metrics.packets_sent) * 100).toFixed(2)
                    : '0.00'}
                  %
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Dijkstra Recalculation Time</span>
                <span className="font-semibold text-amber-400">
                  {metrics.recovery_time_ms.toFixed(3)} ms
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
