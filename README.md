# NetHeal — Network Failure Detection & Auto-Rerouting Simulator

NetHeal is an interactive Computer Networks educational simulator that models computer networks using weighted undirected graphs, demonstrates Dijkstra's shortest-path algorithm, simulates dynamic link and router failures, forwards simulated packets hop-by-hop, automatically recalculates optimal bypass routes, and visualizes real-time network telemetry.

---

## Architecture Overview

```
CN-project/
├── backend/                       # Python 3.12+ / FastAPI / NetworkX
│   ├── app/
│   │   ├── topologies.py          # 3 Predefined topologies (Star, Ring, Mesh)
│   │   ├── models.py              # Pydantic data schemas & enums
│   │   ├── network.py             # Thread-safe NetworkX graph model
│   │   ├── routing.py             # Dijkstra routing engine & multi-path calculation
│   │   ├── failure.py             # Fault injection & recovery time benchmarking
│   │   ├── simulator.py           # Discrete-event hop-by-hop packet forwarder
│   │   ├── metrics.py             # Telemetry aggregator (PDR, loss, recovery time)
│   │   └── main.py                # FastAPI REST API (15 endpoints, CORS, exports)
│   ├── tests/
│   │   ├── test_routing.py        # 9 shortest path & unreachable tests
│   │   ├── test_failure.py        # 14 fault injection & recovery tests
│   │   └── test_simulator.py      # 12 packet forwarding & metric tests
│   └── requirements.txt           # fastapi, uvicorn, networkx, pydantic, pytest
│
└── frontend/                      # Next.js 14 (App Router) / TypeScript / Tailwind CSS
    ├── app/
    │   ├── page.tsx               # Interactive Topology & Simulator Dashboard
    │   ├── experiments/page.tsx   # A/B Resilience & Comparative Experiments
    │   ├── analytics/page.tsx     # Real-time Telemetry, Donut/Bar Charts, & Export
    │   ├── concepts/page.tsx      # Educational Guide to Dijkstra & Network Theory
    │   └── layout.tsx             # Dark navy dashboard shell with sidebar & header
    ├── components/
    │   ├── layout/                # Header (status, health %, reset), Sidebar
    │   ├── topology/              # React Flow Canvas & Custom Router Nodes
    │   ├── controls/              # Control Panel (packet dispatch, failure triggers)
    │   ├── eventlog/              # Live Event Log with severity & category filters
    │   ├── charts/                # Recharts Delivery & Transmission graphs
    │   └── ui/                    # shadcn/ui components (buttons, badges, cards, etc.)
    └── lib/
        ├── api.ts                 # Typed REST API client
        └── types.ts               # Shared TypeScript domain models
```

---

## Key Computer Networks Concepts Implemented

1. **Graph Representation**:
   - Nodes represent Layer-3 routing equipment with state `UP` or `DOWN`.
   - Edges represent bidirectional transmission links with positive routing cost and latency weights.
2. **Dijkstra's Shortest Path Algorithm**:
   - Calculates path of minimum cost from source to destination.
   - Automatically handles disconnected partitions, loop prevention, and tie-breaking.
3. **Link & Router Failure Simulation**:
   - Link cut removes the individual edge $(u, v)$ from the graph.
   - Router failure severs the vertex and all incident links attached to that node.
4. **Dynamic Rerouting & Self-Healing**:
   - Instantly re-evaluates graph connectivity upon failure and converges onto an alternate corridor.
   - Measures rerouting recovery time in milliseconds.
5. **Hop-by-Hop Packet Forwarding**:
   - Packets traverse intermediate hops sequentially.
   - Drops packets if an intermediate node or link goes down mid-flight or if destination is unreachable.
6. **Telemetry & QoS Metrics**:
   - **Packet Delivery Ratio (PDR)**: $\frac{\text{Packets Delivered}}{\text{Packets Sent}} \times 100\%$
   - **Packet Loss Rate**: $\frac{\text{Packets Dropped}}{\text{Packets Sent}} \times 100\%$
   - **Average Route Cost**: Cumulative weight of operational paths.
   - **Recovery Latency**: Elapsed algorithm execution duration for path replacement.

---

## Running the Application Locally

### 1. Backend (FastAPI)
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
* Health check: `GET http://localhost:8000/api/topologies`

Run backend tests:
```bash
cd backend
python -m pytest tests/ -v
```
*(All 35 tests pass with 100% coverage across routing, failures, and packet forwarding).*

### 2. Frontend (Next.js)
```bash
cd frontend
npm run dev
# Or for optimized production build:
# npm run build && npm run start
```
* Dashboard URL: [http://localhost:3000](http://localhost:3000)

---

## Pages & User Interactions

1. **Network Simulator (`/`)**:
   - Interactive React Flow canvas with custom router nodes and link indicators.
   - Select source and destination routers and click **Send 4 Packets**.
   - Click on any router or link to **Fail** or **Restore** it interactively.
   - Watch the active path shift from cyan to green upon rerouting, or red on failure.
   - View chronological, filterable event log stream at the bottom.
2. **Experiments (`/experiments`)**:
   - Side-by-side comparative analysis of Baseline (pristine topology) vs. Failure Injected scenario.
3. **Analytics (`/analytics`)**:
   - Recharts Donut charts for delivery ratio and bar charts for transmission volume.
   - Export full simulation snapshot as JSON or CSV.
4. **Concepts (`/concepts`)**:
   - Educational theory reference covering Dijkstra pseudocode, link vs. router outages, and physical vs. simulation differences.
