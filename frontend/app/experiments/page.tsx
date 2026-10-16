'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import type { SimulationMetrics } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  XCircle,
  TrendingDown,
  Layers,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export default function ExperimentsPage() {
  const [baselineMetrics, setBaselineMetrics] = useState<SimulationMetrics | null>(null);
  const [failureMetrics, setFailureMetrics] = useState<SimulationMetrics | null>(null);
  const [isRunningBaseline, setIsRunningBaseline] = useState(false);
  const [isRunningFailure, setIsRunningFailure] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const runBaseline = async () => {
    try {
      setIsRunningBaseline(true);
      setLastAction('Resetting topology to pristine state and sending 20 packets...');
      await api.reset();
      // Send 20 packets from R1 to R5 (or first to last node)
      await api.sendPackets('R1', 'R5', 20);
      const metrics = await api.getMetrics();
      setBaselineMetrics(metrics);
      setLastAction('Baseline run completed: 20 packets sent across healthy topology.');
    } catch (err: any) {
      console.error(err);
      setLastAction(`Error running baseline: ${err.message}`);
    } finally {
      setIsRunningBaseline(false);
    }
  };

  const runFailureExperiment = async () => {
    try {
      setIsRunningFailure(true);
      setLastAction('Injecting link failure on active corridor and testing auto-rerouting...');
      // Fail link L1 or intermediate link
      const state = await api.getState();
      const healthyLink = state.links.find((l) => l.status === 'UP');
      if (healthyLink) {
        await api.failLink(healthyLink.id);
      }
      // Send 20 packets
      await api.sendPackets('R1', 'R5', 20);
      const metrics = await api.getMetrics();
      setFailureMetrics(metrics);
      setLastAction('Failure experiment completed: Network auto-rerouted or dropped packets.');
    } catch (err: any) {
      console.error(err);
      setLastAction(`Error running failure experiment: ${err.message}`);
    } finally {
      setIsRunningFailure(false);
    }
  };

  const handleResetAll = async () => {
    await api.reset();
    setBaselineMetrics(null);
    setFailureMetrics(null);
    setLastAction('Reset complete. Ready for new experiments.');
  };

  const comparisonData = [
    {
      metric: 'Delivery Rate (%)',
      Baseline: baselineMetrics ? +(baselineMetrics.delivery_ratio * 100).toFixed(1) : 0,
      FailureScenario: failureMetrics ? +(failureMetrics.delivery_ratio * 100).toFixed(1) : 0,
    },
    {
      metric: 'Delivered Pkts',
      Baseline: baselineMetrics?.packets_delivered || 0,
      FailureScenario: failureMetrics?.packets_delivered || 0,
    },
    {
      metric: 'Dropped Pkts',
      Baseline: baselineMetrics?.packets_dropped || 0,
      FailureScenario: failureMetrics?.packets_dropped || 0,
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-navy-900 min-h-screen text-slate-300">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-cyan-400" />
            Automated Experiments & Resilience Testing
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Compare baseline transmission performance against simulated network degradation.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleResetAll}
          className="border-navy-700 bg-navy-800 hover:bg-navy-700 text-slate-300"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Experiments
        </Button>
      </div>

      {lastAction && (
        <div className="p-3 bg-navy-800/80 border border-navy-700 rounded-lg text-xs font-mono text-cyan-300">
          ▶ {lastAction}
        </div>
      )}

      {/* Two Column Control & Results Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Baseline Card */}
        <Card className="bg-navy-800 border-navy-700 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Baseline Condition (Pristine Network)
              </CardTitle>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                0 Failures
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tests shortest path delivery across fully operational topology without any link cuts.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runBaseline}
              disabled={isRunningBaseline}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunningBaseline ? 'Executing Baseline...' : 'Run Baseline Experiment (20 Pkts)'}
            </Button>

            {baselineMetrics ? (
              <div className="grid grid-cols-3 gap-2 p-3 bg-navy-900 rounded-lg border border-navy-700 text-center">
                <div>
                  <div className="text-xs text-slate-400">Delivered</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {baselineMetrics.packets_delivered} / {baselineMetrics.packets_sent}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Delivery Rate</div>
                  <div className="text-lg font-bold text-slate-200">
                    {(baselineMetrics.delivery_ratio * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Avg Cost</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {baselineMetrics.avg_route_cost.toFixed(1)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-navy-900/50 rounded-lg border border-navy-800">
                Click &apos;Run Baseline Experiment&apos; to measure uninhibited network flow.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failure Scenario Card */}
        <Card className="bg-navy-800 border-navy-700 flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Degraded Condition (Injected Failure)
              </CardTitle>
              <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                Active Cut
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Injects link failure along the primary path and forces Dijkstra engine to reroute packets.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={runFailureExperiment}
              disabled={isRunningFailure}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium"
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              {isRunningFailure ? 'Simulating Fault...' : 'Inject Failure & Run (20 Pkts)'}
            </Button>

            {failureMetrics ? (
              <div className="grid grid-cols-3 gap-2 p-3 bg-navy-900 rounded-lg border border-navy-700 text-center">
                <div>
                  <div className="text-xs text-slate-400">Delivered</div>
                  <div className="text-lg font-bold text-amber-400">
                    {failureMetrics.packets_delivered} / {failureMetrics.packets_sent}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Dropped</div>
                  <div className="text-lg font-bold text-red-400">
                    {failureMetrics.packets_dropped}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Recovery Time</div>
                  <div className="text-lg font-bold text-cyan-400">
                    {failureMetrics.recovery_time_ms.toFixed(1)} ms
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-navy-900/50 rounded-lg border border-navy-800">
                Click &apos;Inject Failure &amp; Run&apos; to test automatic rerouting resilience.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      {(baselineMetrics || failureMetrics) && (
        <Card className="bg-navy-800 border-navy-700">
          <CardHeader>
            <CardTitle className="text-base text-slate-200">
              Comparative Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                  }}
                />
                <Legend />
                <Bar dataKey="Baseline" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="FailureScenario" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
