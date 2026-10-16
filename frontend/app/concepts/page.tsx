'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Network,
  Cpu,
  GitFork,
  AlertOctagon,
  RefreshCw,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export default function ConceptsPage() {
  const concepts = [
    {
      icon: <Network className="w-5 h-5 text-cyan-400" />,
      title: '1. Routers & Links in Graph Theory',
      tag: 'Topology Modeling',
      description:
        'In NetHeal, the computer network is modeled as a weighted undirected graph G = (V, E). Vertices (V) represent layer-3 forwarding routers (e.g., R1, R2), and edges (E) represent physical bidirectional communication channels (fiber links, Ethernet cables). Each link has a positive routing cost representing metric parameters like distance, bandwidth capacity, or monetary transit expense.',
    },
    {
      icon: <GitFork className="w-5 h-5 text-emerald-400" />,
      title: '2. Dijkstra’s Shortest-Path Algorithm',
      tag: 'Routing Engine',
      description:
        'Dijkstra’s algorithm finds the path of minimum cumulative cost between a designated source router and destination router. Given cost weights w(u, v) > 0, it iteratively relaxes neighbor distances using a priority queue until the target node is extracted. When multiple equal-cost paths exist, tie-breaking determines the selected corridor.',
      code: `function Dijkstra(Graph, source, destination):
    dist[all nodes] = infinity
    dist[source] = 0
    pq.insert((0, source))

    while pq is not empty:
        (d, u) = pq.extract_min()
        if u == destination: return reconstruct_path(destination)
        if d > dist[u]: continue

        for each neighbor v of u:
            weight = Graph.edge_cost(u, v)
            if dist[u] + weight < dist[v]:
                dist[v] = dist[u] + weight
                prev[v] = u
                pq.insert((dist[v], v))
    return unreachable`,
    },
    {
      icon: <AlertOctagon className="w-5 h-5 text-red-400" />,
      title: '3. Link Failure vs. Router Failure',
      tag: 'Fault Simulation',
      description:
        'When a link fails (e.g. fiber cut or interface port error), only that specific bidirectional edge (u, v) is removed from the active routing graph. When a router node fails (e.g. power supply outage or kernel crash), the entire vertex and ALL incident links attached to that router are severed simultaneously, requiring substantial traffic redirection.',
    },
    {
      icon: <RefreshCw className="w-5 h-5 text-amber-400" />,
      title: '4. Dynamic Recalculation & Auto-Rerouting',
      tag: 'Self-Healing',
      description:
        'Upon any topology change (failure or restoration), the network engine triggers a route recomputation. If an alternate bypass path exists, the active route is updated immediately and flagged as recovered. If the graph partitions into disconnected components and no path exists to the destination, packets are dropped and flagged as unreachable.',
    },
    {
      icon: <Clock className="w-5 h-5 text-purple-400" />,
      title: '5. Packet Loss & Recovery Time',
      tag: 'QoS & Telemetry',
      description:
        'Packet Delivery Ratio (PDR) is the ratio of successfully delivered packets to total packets transmitted. Recovery Time in this simulator measures the elapsed computation time in milliseconds for Dijkstra’s algorithm to detect topological disruption and converge onto an alternate operational corridor.',
    },
    {
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      title: '6. Simulation Limitations vs. Physical Networks',
      tag: 'Academic Note',
      description:
        'NetHeal is an educational discrete-event routing simulator running on NetworkX. In physical networks running protocols like OSPF, IS-IS, or BGP: hello packets detect peer liveness via timeouts (dead intervals), Link-State Advertisements (LSAs) flood through neighboring routers asynchronously, and routing tables update through distributed convergence rather than a centralized graph oracle.',
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 bg-navy-900 min-h-screen text-slate-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-cyan-400" />
          Computer Networks — Theoretical Concepts & Reference
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Core networking principles demonstrated by the NetHeal routing and self-healing engine.
        </p>
      </div>

      <div className="space-y-6">
        {concepts.map((concept, idx) => (
          <Card key={idx} className="bg-navy-800 border-navy-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base text-slate-100 flex items-center gap-2.5">
                  {concept.icon}
                  {concept.title}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="bg-navy-900 border-navy-600 text-cyan-300 text-xs font-mono"
                >
                  {concept.tag}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>{concept.description}</p>
              {concept.code && (
                <div className="mt-3 p-3 bg-navy-950 rounded-md border border-navy-700/80 font-mono text-xs text-emerald-300 overflow-x-auto">
                  <pre>{concept.code}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
