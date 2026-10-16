import type {
  TopologyInfo,
  NetworkState,
  RouteResult,
  PacketState,
  SimulationMetrics,
  SimEvent,
  RouterState,
  LinkState,
} from '@/lib/types';

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  getTopologies: () => apiFetch<TopologyInfo[]>('/api/topologies'),
  getState: () => apiFetch<NetworkState>('/api/state'),
  loadTopology: (id: string) =>
    apiFetch<{ status: string; topology_id: string; name: string; nodes: number; links: number }>(`/api/topology/${id}`, { method: 'POST' }),
  reset: () => apiFetch<{ status: string; message: string }>('/api/reset', { method: 'POST' }),
  getRoute: (src: string, dst: string) =>
    apiFetch<RouteResult>(`/api/route?src=${src}&dst=${dst}`),
  sendPackets: (source: string, dest: string, count: number) =>
    apiFetch<{ sent: number; delivered: number; dropped: number; packets: PacketState[] }>('/api/packets/send', {
      method: 'POST',
      body: JSON.stringify({ source, dest, count }),
    }),
  getPackets: () => apiFetch<PacketState[]>('/api/packets'),
  failLink: (id: string) =>
    apiFetch<unknown>(`/api/fail/link/${id}`, { method: 'POST' }),
  restoreLink: (id: string) =>
    apiFetch<unknown>(`/api/restore/link/${id}`, { method: 'POST' }),
  failRouter: (id: string) =>
    apiFetch<unknown>(`/api/fail/router/${id}`, { method: 'POST' }),
  restoreRouter: (id: string) =>
    apiFetch<unknown>(`/api/restore/router/${id}`, { method: 'POST' }),
  getMetrics: () => apiFetch<SimulationMetrics>('/api/metrics'),
  getEvents: (category?: string) =>
    apiFetch<SimEvent[]>(
      `/api/events${category ? `?category=${category}` : ''}`
    ),
  clearEvents: () => apiFetch<unknown>('/api/events', { method: 'DELETE' }),
  updateLinkCost: (id: string, cost: number) =>
    apiFetch<{ status: string; link_id: string; cost: number }>(`/api/link/${id}/cost`, {
      method: 'PATCH',
      body: JSON.stringify({ cost }),
    }),
  loadCustomTopology: (nodes: object[], links: object[]) =>
    apiFetch<{ status: string; topology_id: string; name: string; nodes: number; links: number }>(
      '/api/topology/custom',
      { method: 'POST', body: JSON.stringify({ nodes, links }) }
    ),
  addNode: (deviceType: string, x: number, y: number) =>
    apiFetch<{ status: string; node: RouterState }>(
      '/api/nodes',
      { method: 'POST', body: JSON.stringify({ device_type: deviceType, x, y }) }
    ),
  addLink: (source: string, target: string, cost = 1) =>
    apiFetch<{ status: string; link: LinkState }>(
      '/api/links',
      { method: 'POST', body: JSON.stringify({ source, target, cost }) }
    ),
  exportJson: () => `${BASE}/api/export/json`,
  exportCsv: () => `${BASE}/api/export/csv`,
};
