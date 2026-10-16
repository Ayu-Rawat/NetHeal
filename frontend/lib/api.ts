import type {
  TopologyInfo,
  NetworkState,
  RouteResult,
  PacketState,
  SimulationMetrics,
  SimEvent,
} from '@/lib/types';

const BASE = 'http://localhost:8000';

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
  exportJson: () => `${BASE}/api/export/json`,
  exportCsv: () => `${BASE}/api/export/csv`,
};
