'use client';

import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  ReactFlowProvider,
  ConnectionMode,
  useReactFlow,
  useViewport,
  type Node,
  type Edge,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodesChange,
  Panel,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DeviceNode } from './DeviceNode';
import type { RouterState, LinkState, RouteResult } from '@/lib/types';
import { Lock, Unlock } from 'lucide-react';

interface PacketDot {
  id: string;
  path: string[];
  startMs: number;
  hopDurationMs: number;
}

export interface PacketPath {
  id: string;
  path: string[];
  delayMs?: number;
}

interface NetworkCanvasProps {
  routers: RouterState[];
  links: LinkState[];
  activeRoute: RouteResult | null;
  failedLinks: string[];
  failedRouters: string[];
  onNodeSelect: (id: string | null) => void;
  onEdgeSelect: (id: string | null) => void;
  onEdgeCostEdit?: (linkId: string, currentCost: number) => void;
  onDropDevice?: (deviceType: string, x: number, y: number) => void;
  onConnectNodes?: (source: string, target: string) => void;
  selectedDevice?: string | null;
  packetPaths?: PacketPath[];
  locked?: boolean;
  onLockToggle?: () => void;
}

const nodeTypes = { device: DeviceNode };

type Side = 'top' | 'right' | 'bottom' | 'left';

function closestSides(ax: number, ay: number, bx: number, by: number): { from: Side; to: Side } {
  const dx = bx - ax;
  const dy = by - ay;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0
      ? { from: 'right', to: 'left' }
      : { from: 'left', to: 'right' };
  }
  return dy >= 0
    ? { from: 'bottom', to: 'top' }
    : { from: 'top', to: 'bottom' };
}

function sideToPosition(side: Side): Position {
  switch (side) {
    case 'top': return Position.Top;
    case 'right': return Position.Right;
    case 'bottom': return Position.Bottom;
    case 'left': return Position.Left;
  }
}

function PacketOverlay({ packetPaths }: { packetPaths: PacketPath[] }) {
  const { getInternalNode } = useReactFlow();
  const { x: vx, y: vy, zoom } = useViewport();
  const [dotPositions, setDotPositions] = useState<Record<string, { x: number; y: number; done: boolean }>>({});
  const dotsRef = useRef<PacketDot[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const now = Date.now();
    for (const pp of packetPaths) {
      if (seenIds.current.has(pp.id)) continue;
      seenIds.current.add(pp.id);
      dotsRef.current.push({
        id: pp.id,
        path: pp.path,
        startMs: now + (pp.delayMs ?? 0),
        hopDurationMs: 550,
      });
    }
  }, [packetPaths]);

  useEffect(() => {
    let raf = 0;

    const nodeAnchor = (id: string, side: Side) => {
      const n = getInternalNode(id);
      if (!n) return null;
      const w = n.measured?.width ?? 92;
      const h = n.measured?.height ?? 72;
      const x = n.internals.positionAbsolute.x;
      const y = n.internals.positionAbsolute.y;
      switch (side) {
        case 'top': return { x: x + w / 2, y };
        case 'right': return { x: x + w, y: y + h / 2 };
        case 'bottom': return { x: x + w / 2, y: y + h };
        case 'left': return { x, y: y + h / 2 };
      }
    };

    const nodeCenter = (id: string) => {
      const n = getInternalNode(id);
      if (!n) return null;
      const w = n.measured?.width ?? 92;
      const h = n.measured?.height ?? 72;
      return {
        x: n.internals.positionAbsolute.x + w / 2,
        y: n.internals.positionAbsolute.y + h / 2,
      };
    };

    const tick = () => {
      const now = Date.now();
      const next: Record<string, { x: number; y: number; done: boolean }> = {};
      const still: PacketDot[] = [];

      for (const dot of dotsRef.current) {
        if (now < dot.startMs) {
          still.push(dot);
          const first = nodeCenter(dot.path[0]);
          if (first) next[dot.id] = { ...first, done: false };
          continue;
        }

        const elapsed = now - dot.startMs;
        const totalDuration = dot.hopDurationMs * Math.max(dot.path.length - 1, 1);

        if (elapsed >= totalDuration) {
          const last = nodeCenter(dot.path[dot.path.length - 1]);
          if (last) next[dot.id] = { ...last, done: true };
          if (elapsed < totalDuration + 280) still.push(dot);
          continue;
        }

        still.push(dot);
        const hopIndex = Math.min(
          Math.floor(elapsed / dot.hopDurationMs),
          dot.path.length - 2
        );
        const hopProgress = (elapsed % dot.hopDurationMs) / dot.hopDurationMs;
        const fromId = dot.path[hopIndex];
        const toId = dot.path[hopIndex + 1];
        const fromC = nodeCenter(fromId);
        const toC = nodeCenter(toId);
        if (!fromC || !toC) continue;
        const { from: fromSide, to: toSide } = closestSides(fromC.x, fromC.y, toC.x, toC.y);
        const from = nodeAnchor(fromId, fromSide) ?? fromC;
        const to = nodeAnchor(toId, toSide) ?? toC;

        const t = hopProgress < 0.5
          ? 2 * hopProgress * hopProgress
          : -1 + (4 - 2 * hopProgress) * hopProgress;

        next[dot.id] = {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          done: false,
        };
      }

      dotsRef.current = still;
      setDotPositions(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getInternalNode]);

  return (
    <>
      {Object.entries(dotPositions).map(([dotId, pos]) => (
        <div
          key={dotId}
          className="pointer-events-none absolute z-[1000]"
          style={{
            transform: `translate(${pos.x * zoom + vx}px, ${pos.y * zoom + vy}px) translate(-50%, -50%)`,
          }}
        >
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center ${pos.done ? 'bg-emerald-400' : 'bg-sky-400'}`}
            style={{
              boxShadow: pos.done
                ? '0 0 14px 5px rgba(52,211,153,0.75)'
                : '0 0 14px 5px rgba(56,189,248,0.8)',
            }}
          >
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
        </div>
      ))}
    </>
  );
}

function FlowCanvas({
  routers,
  links,
  activeRoute,
  failedLinks,
  onNodeSelect,
  onEdgeSelect,
  onEdgeCostEdit,
  onDropDevice,
  onConnectNodes,
  selectedDevice,
  packetPaths = [],
  locked = false,
  onLockToggle,
}: NetworkCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [draggedPositions, setDraggedPositions] = useState<Record<string, { x: number; y: number }>>({});

  const routerIdsKey = routers.map(r => r.id).sort().join(',');
  useEffect(() => {
    const ids = new Set(routerIdsKey.split(',').filter(Boolean));
    setDraggedPositions(prev => {
      const next: Record<string, { x: number; y: number }> = {};
      for (const [id, pos] of Object.entries(prev)) {
        if (ids.has(id)) next[id] = pos;
      }
      return next;
    });
  }, [routerIdsKey]);

  const connectionCount = useMemo(() => {
    const counts: Record<string, number> = {};
    links.forEach((l) => {
      counts[l.source] = (counts[l.source] || 0) + 1;
      counts[l.target] = (counts[l.target] || 0) + 1;
    });
    return counts;
  }, [links]);

  const nodes: Node[] = useMemo(() =>
    routers.map((r) => ({
      id: r.id,
      type: 'device',
      position: draggedPositions[r.id] ?? { x: r.x, y: r.y },
      data: {
        label: r.display_name,
        status: r.status,
        connectionCount: connectionCount[r.id] || 0,
        deviceType: r.device_type || 'router',
      },
      draggable: !locked,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    })),
    [routers, connectionCount, draggedPositions, locked]
  );

  const nodeCenters = useMemo(() => {
    const map: Record<string, { x: number; y: number }> = {};
    routers.forEach((r) => {
      map[r.id] = draggedPositions[r.id] ?? { x: r.x, y: r.y };
    });
    return map;
  }, [routers, draggedPositions]);

  const activeRouteEdges = useMemo(() => {
    if (!activeRoute?.path || activeRoute.path.length < 2) return new Set<string>();
    const edgeSet = new Set<string>();
    for (let i = 0; i < activeRoute.path.length - 1; i++) {
      const a = activeRoute.path[i];
      const b = activeRoute.path[i + 1];
      edgeSet.add(`${a}-${b}`);
      edgeSet.add(`${b}-${a}`);
    }
    return edgeSet;
  }, [activeRoute]);

  const edges: Edge[] = useMemo(() =>
    links.map((l) => {
      const isFailed = failedLinks.includes(l.id) || l.status === 'DOWN';
      const isActive = activeRouteEdges.has(`${l.source}-${l.target}`);

      let stroke = '#64748b';
      let strokeWidth = 2;
      let animated = false;
      let strokeDasharray: string | undefined;

      if (isFailed) {
        stroke = '#ef4444';
        strokeDasharray = '5,5';
      } else if (isActive) {
        stroke = '#38bdf8';
        strokeWidth = 3;
        animated = true;
      }

      const a = nodeCenters[l.source];
      const b = nodeCenters[l.target];
      const sides = a && b
        ? closestSides(a.x, a.y, b.x, b.y)
        : { from: 'bottom' as Side, to: 'top' as Side };

      return {
        id: l.id,
        source: l.source,
        target: l.target,
        sourceHandle: sides.from,
        targetHandle: sides.to,
        sourcePosition: sideToPosition(sides.from),
        targetPosition: sideToPosition(sides.to),
        type: 'straight',
        animated,
        label: `cost: ${l.cost}`,
        labelStyle: { fill: '#94a3b8', fontSize: 10 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.85 },
        style: { stroke, strokeWidth, strokeDasharray },
        data: { cost: l.cost },
      };
    }),
    [links, failedLinks, activeRouteEdges, nodeCenters]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const placeDevice = useCallback((deviceType: string, clientX: number, clientY: number) => {
    if (!onDropDevice || !deviceType) return;
    const pos = screenToFlowPosition({ x: clientX, y: clientY });
    onDropDevice(deviceType, pos.x, pos.y);
  }, [onDropDevice, screenToFlowPosition]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const deviceType =
      e.dataTransfer.getData('application/x-device-type') ||
      e.dataTransfer.getData('text/plain');
    if (!deviceType) return;
    placeDevice(deviceType.trim(), e.clientX, e.clientY);
  }, [placeDevice]);

  const onNodeDragStop = useCallback((_event: MouseEvent | TouchEvent, node: Node) => {
    if (locked) return;
    setDraggedPositions(prev => ({
      ...prev,
      [node.id]: { x: node.position.x, y: node.position.y },
    }));
  }, [locked]);

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    if (locked) return;
    const positionChanges = changes.filter(c => c.type === 'position');
    if (positionChanges.length === 0) return;
    setDraggedPositions(prev => {
      const next = { ...prev };
      for (const change of positionChanges) {
        if (change.type === 'position' && change.position) {
          next[change.id] = change.position;
        }
      }
      return next;
    });
  }, [locked]);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    onNodeSelect(node.id);
  }, [onNodeSelect]);

  const onEdgeClick: EdgeMouseHandler = useCallback((_, edge) => {
    onEdgeSelect(edge.id);
  }, [onEdgeSelect]);

  const onEdgeDoubleClick: EdgeMouseHandler = useCallback((_, edge) => {
    if (onEdgeCostEdit) {
      const cost = (edge.data as { cost: number } | undefined)?.cost ?? 1;
      onEdgeCostEdit(edge.id, cost);
    }
  }, [onEdgeCostEdit]);

  const onPaneClick = useCallback((e: React.MouseEvent) => {
    if (selectedDevice && onDropDevice) {
      placeDevice(selectedDevice, e.clientX, e.clientY);
      return;
    }
    onNodeSelect(null);
    onEdgeSelect(null);
  }, [selectedDevice, onDropDevice, placeDevice, onNodeSelect, onEdgeSelect]);

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return;
    onConnectNodes?.(connection.source, connection.target);
  }, [onConnectNodes]);

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    return Boolean(connection.source && connection.target && connection.source !== connection.target);
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClick}
      onNodeDragStop={onNodeDragStop}
      onEdgeClick={onEdgeClick}
      onEdgeDoubleClick={onEdgeDoubleClick}
      onPaneClick={onPaneClick}
      onConnect={handleConnect}
      isValidConnection={isValidConnection}
      connectionMode={ConnectionMode.Loose}
      connectionLineStyle={{ stroke: '#38bdf8', strokeWidth: 2 }}
      defaultEdgeOptions={{ type: 'straight' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={2}
      attributionPosition="bottom-left"
      nodesDraggable={!locked}
      nodesConnectable={!locked}
      panOnDrag={!locked}
      deleteKeyCode={null}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="#1e293b"
      />
      <Controls style={{ background: '#1e293b', border: '1px solid #334155' }} />

      <Panel position="top-left" className="!m-0 !p-0 pointer-events-none" style={{ width: '100%', height: '100%', maxWidth: 'none' }}>
        <PacketOverlay packetPaths={packetPaths} />
      </Panel>

      {onLockToggle && (
        <Panel position="top-right">
          <button
            onClick={onLockToggle}
            title={locked ? 'Unlock canvas (allow dragging)' : 'Lock canvas (prevent accidental moves)'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border shadow-sm ${
              locked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                : 'bg-navy-800/90 border-[#334155] text-slate-400 hover:text-white hover:bg-[#252526]'
            }`}
          >
            {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            {locked ? 'Locked' : 'Lock'}
          </button>
        </Panel>
      )}

    </ReactFlow>
  );
}

export function NetworkCanvas(props: NetworkCanvasProps) {
  return (
    <div className="w-full h-full relative">
      <ReactFlowProvider>
        <FlowCanvas {...props} />
      </ReactFlowProvider>
    </div>
  );
}
