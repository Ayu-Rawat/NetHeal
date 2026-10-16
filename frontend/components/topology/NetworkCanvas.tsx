'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RouterNode } from './RouterNode';
import type { RouterState, LinkState, RouteResult } from '@/lib/types';

interface NetworkCanvasProps {
  routers: RouterState[];
  links: LinkState[];
  activeRoute: RouteResult | null;
  failedLinks: string[];
  failedRouters: string[];
  onNodeSelect: (id: string | null) => void;
  onEdgeSelect: (id: string | null) => void;
}

const nodeTypes = { router: RouterNode };

export function NetworkCanvas({
  routers,
  links,
  activeRoute,
  failedLinks,
  failedRouters,
  onNodeSelect,
  onEdgeSelect,
}: NetworkCanvasProps) {
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
      type: 'router',
      position: { x: r.x, y: r.y },
      data: {
        label: r.display_name,
        status: r.status,
        connectionCount: connectionCount[r.id] || 0,
      },
    })),
    [routers, connectionCount]
  );

  const edges: Edge[] = useMemo(() =>
    links.map((l) => {
      const isFailed = failedLinks.includes(l.id) || l.status === 'DOWN';
      const isActive = activeRouteEdges.has(`${l.source}-${l.target}`);

      let stroke = '#333333';
      let strokeWidth = 1.5;
      let animated = false;
      let strokeDasharray: string | undefined;

      if (isFailed) {
        stroke = '#ef4444';
        strokeDasharray = '5,5';
      } else if (isActive) {
        stroke = '#007acc';
        strokeWidth = 3;
        animated = true;
      }

      return {
        id: l.id,
        source: l.source,
        target: l.target,
        animated,
        label: `cost:${l.cost}`,
        labelStyle: { fill: '#cccccc', fontSize: 10 },
        labelBgStyle: { fill: '#181818', fillOpacity: 0.9 },
        style: { stroke, strokeWidth, strokeDasharray },
      };
    }),
    [links, failedLinks, activeRouteEdges]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      onEdgeSelect(edge.id);
    },
    [onEdgeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
    onEdgeSelect(null);
  }, [onNodeSelect, onEdgeSelect]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1e293b"
        />
        <Controls
          style={{ background: '#1e293b', border: '1px solid #334155' }}
        />
      </ReactFlow>
    </div>
  );
}
