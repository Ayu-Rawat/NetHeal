'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { SimulationMetrics } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, Zap, Layers } from 'lucide-react';

interface MetricsChartsProps {
  metrics: SimulationMetrics | null;
  history?: Array<{ time: string; cost: number }>;
}

export function MetricsCharts({ metrics, history = [] }: MetricsChartsProps) {
  if (!metrics) {
    return (
      <div className="p-8 text-center text-slate-500">
        No metrics available yet. Send packets to see analytics.
      </div>
    );
  }

  const pieData = [
    { name: 'Delivered', value: metrics.packets_delivered, color: '#10b981' }, // emerald
    { name: 'Dropped', value: metrics.packets_dropped, color: '#ef4444' }, // red
  ];

  const barData = [
    {
      category: 'Packets',
      Sent: metrics.packets_sent,
      Delivered: metrics.packets_delivered,
      Dropped: metrics.packets_dropped,
    },
  ];

  const deliveryRate =
    metrics.packets_sent > 0
      ? ((metrics.packets_delivered / metrics.packets_sent) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Delivery Rate</p>
              <h3 className="text-xl font-bold text-white">{deliveryRate}%</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Packets Delivered</p>
              <h3 className="text-xl font-bold text-white">
                {metrics.packets_delivered}{' '}
                <span className="text-xs text-slate-400 font-normal">
                  / {metrics.packets_sent}
                </span>
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Packets Dropped</p>
              <h3 className="text-xl font-bold text-white">{metrics.packets_dropped}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Reroute Recovery</p>
              <h3 className="text-xl font-bold text-white">
                {metrics.recovery_time_ms.toFixed(2)}{' '}
                <span className="text-xs text-slate-400 font-normal">ms</span>
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Delivery Ratio Donut */}
        <Card className="bg-navy-800 border-navy-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-200">
              Packet Delivery Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {metrics.packets_sent === 0 ? (
              <div className="text-xs text-slate-500">No packet data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#181818',
                      borderColor: '#333333',
                      borderRadius: '8px',
                      color: '#cccccc',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Packet Transmission Comparison */}
        <Card className="bg-navy-800 border-navy-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-200">
              Transmission Volume
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#252526" />
                <XAxis dataKey="category" stroke="#888888" />
                <YAxis stroke="#888888" />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#181818',
                    borderColor: '#333333',
                    borderRadius: '8px',
                    color: '#cccccc',
                  }}
                />
                <Legend />
                <Bar dataKey="Sent" fill="#007acc" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Delivered" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Dropped" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
