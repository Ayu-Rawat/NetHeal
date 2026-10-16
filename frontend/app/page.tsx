'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { Network, BookOpen, BarChart3, Router, Zap, ShieldCheck, GitFork } from 'lucide-react';
import { BentoCard, BentoGrid } from '@/components/magicui/bento-grid';
import { AnimatedBeam } from '@/components/magicui/animated-beam';
import { cn } from '@/lib/utils';

/* ── Live network beam demo used as bento background ── */
function NetworkBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const n1 = useRef<HTMLDivElement>(null);
  const n2 = useRef<HTMLDivElement>(null);
  const n3 = useRef<HTMLDivElement>(null);
  const n4 = useRef<HTMLDivElement>(null);
  const n5 = useRef<HTMLDivElement>(null);

  return (
     <div ref={containerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden p-4 opacity-90 select-none pointer-events-none">
      {(
        [
          { ref: n1, label: 'R1', style: { left: '44%', top: '6%' } },
          { ref: n2, label: 'R2', style: { left: '12%', top: '42%' } },
          { ref: n3, label: 'R3', style: { left: '72%', top: '42%' } },
          { ref: n4, label: 'R4', style: { left: '26%', top: '74%' } },
          { ref: n5, label: 'R5', style: { left: '60%', top: '74%' } },
        ] as const
      ).map(({ ref, label, style }) => (
        <div
          key={label}
          ref={ref as React.RefObject<HTMLDivElement>}
          style={style}
          className="absolute z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#ffffff]/70 bg-[#181818] text-[10px] font-bold text-[#ffffff] shadow-[0_0_14px_rgba(0,122,204,0.35)]"
        >
          {label}
        </div>
      ))}

      {/* Animated beams */}
      <AnimatedBeam containerRef={containerRef} fromRef={n1} toRef={n2} curvature={15} duration={3.2} pathColor="#1e3a52" />
      <AnimatedBeam containerRef={containerRef} fromRef={n1} toRef={n3} curvature={-15} duration={3.8} delay={0.6} pathColor="#1e3a52" />
      <AnimatedBeam containerRef={containerRef} fromRef={n2} toRef={n4} duration={4.1} delay={1.0} pathColor="#1e3a52" />
      <AnimatedBeam containerRef={containerRef} fromRef={n3} toRef={n5} duration={3.5} delay={1.4} pathColor="#1e3a52" />
      <AnimatedBeam containerRef={containerRef} fromRef={n4} toRef={n5} curvature={18} duration={3.9} delay={0.9}
        gradientStartColor="#22c55e" gradientStopColor="#86efac" pathColor="#1e3a52" />
      <AnimatedBeam containerRef={containerRef} fromRef={n2} toRef={n3} curvature={-28} duration={5.2} delay={2.2}
        gradientStartColor="#f59e0b" gradientStopColor="#fcd34d" pathColor="#1e3a52" />
      <AnimatedBeam containerRef={containerRef} fromRef={n1} toRef={n4} curvature={30} duration={4.5} delay={3.0}
        gradientStartColor="#ef4444" gradientStopColor="#fca5a5" pathColor="#1e3a52" reverse />
    </div>
  );
}

/* ── Pseudocode background for algorithm card ── */
function AlgoBackground() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden p-4 opacity-90 select-none pointer-events-none">
      <pre className="text-[10px] leading-5 text-white font-mono whitespace-pre text-left">
{`function Dijkstra(graph, source):
  dist[source] = 0
  pq.insert((0, source))
  
  while pq not empty:
    (d, u) = pq.pop_min()
    for v in neighbors(u):
      alt = d + cost(u, v)
      if alt < dist[v]:
        dist[v] = alt
        pq.insert((alt, v))
  
  return dist`}
      </pre>
    </div>
  );
}

/* ── Stats background ── */
function StatsBackground() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden p-4 opacity-90 select-none pointer-events-none">
      <div className="grid grid-cols-3 w-full max-w-md items-center"
        style={{
          marginTop:0
        }}
      >
        {[
          { value: 'O(V²)', label: 'Dijkstra complexity', color: 'text-white' },
          { value: '<1ms', label: 'Route recovery', color: 'text-white' },
          { value: '100%', label: 'Self-healing', color: 'text-white' },
        ].map(({ value, label, color }, i, arr) => (
          <div
            key={label}
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-center px-2',
              i < arr.length - 1 && 'border-r border-[#333]'
            )}
          >
            <span className={cn('text-2xl font-bold tabular-nums tracking-tight', color)}>
              {value}
            </span>
            <span className="text-[11px] text-slate-500 whitespace-nowrap">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#101010] text-slate-300">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        {/* Logo + title */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#ffffff] flex items-center justify-center shadow-[0_0_24px_rgba(0,122,204,0.4)] shrink-0">
            <Network className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">NetHeal</h1>
            <p className="text-sm text-slate-400">Network Topology Simulation &amp; Self-Healing</p>
          </div>
        </div>

        <p className="text-slate-400 max-w-2xl leading-relaxed mb-10 text-sm">
          Build custom network topologies, simulate packet routing with Dijkstra&apos;s algorithm,
          inject link and router failures, and watch the network auto-recover in real time.
        </p>

        {/* CTA row */}
        <div className="flex flex-wrap gap-3 mb-14">
          <Link
            href="/simulator"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white hover:bg-[#252526] text-black hover:text-slate-300 text-sm font-medium transition-colors border border-transparent hover:border-[#333]"
          >
            <Network className="w-4 h-4" />
            Launch Simulator
          </Link>
          <Link
            href="/concepts"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#252526] hover:bg-[#333] text-slate-300 text-sm font-medium transition-colors border border-[#333]"
          >
            <BookOpen className="w-4 h-4" />
            Learn Concepts
          </Link>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#252526] hover:bg-[#333] text-slate-300 text-sm font-medium transition-colors border border-[#333]"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Link>
        </div>

        {/* Bento grid */}
        <BentoGrid className="grid-cols-3 auto-rows-[20rem]">
          {/* Large card — simulator with live beam */}
          <BentoCard
            name="Network Simulator"
            className="col-span-3 md:col-span-3"
            background={<NetworkBeamDemo />}
            Icon={Router}
            description="Build topologies, route packets and visualize live failovers with interactive nodes."
            href="/simulator"
            cta="Open Simulator"
          />

          {/* Algorithm card */}
          <BentoCard
            name="Dijkstra Algorithm"
            className="col-span-3 md:col-span-1"
            background={<AlgoBackground />}
            Icon={GitFork}
            description="Shortest-path routing."
            href="/concepts"
            cta="Study Algorithm"
          />

          {/* Stats card */}
          <BentoCard
            name="Performance Analytics"
            className="col-span-3 md:col-span-2"
            background={<StatsBackground />}
            Icon={Zap}
            description="Monitor packet delivery ratios, average path costs and real-time convergence metrics."
            href="/analytics"
            cta="View Analytics"
          />

        </BentoGrid>
      </div>
    </div>
  );
}
