export type RouterStatus = 'UP' | 'DOWN';
export type LinkStatus = 'UP' | 'DOWN';
export type PacketStatus = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'DROPPED';
export type EventSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

export interface RouterState {
  id: string;
  display_name: string;
  status: RouterStatus;
  x: number;
  y: number;
}

export interface LinkState {
  id: string;
  source: string;
  target: string;
  cost: number;
  latency: number;
  status: LinkStatus;
}

export interface RouteResult {
  path: string[];
  cost: number;
  hops: number;
  reachable: boolean;
  reason: string;
}

export interface PacketState {
  id: string;
  source: string;
  dest: string;
  route: string[];
  current_hop: number;
  status: PacketStatus;
  created_at: string;
  completed_at: string | null;
  drop_reason: string | null;
}

export interface SimEvent {
  id: string;
  timestamp: string;
  severity: EventSeverity;
  category: string;
  message: string;
}

export interface SimulationMetrics {
  packets_sent: number;
  packets_delivered: number;
  packets_dropped: number;
  delivery_ratio: number;
  avg_route_cost: number;
  recovery_time_ms: number;
  failed_links: number;
  failed_routers: number;
}

export interface NetworkState {
  routers: RouterState[];
  links: LinkState[];
  active_route: RouteResult | null;
  packets: PacketState[];
  events: SimEvent[];
  metrics: SimulationMetrics;
}

export interface TopologyInfo {
  id: string;
  name: string;
  description: string;
}
