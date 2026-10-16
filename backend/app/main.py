"""
NetHeal FastAPI application.
All simulation state is held in a module-level `sim_state` dict.
"""
from __future__ import annotations

import csv
import io
import json
import uuid
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from .failure import FailureManager
from .metrics import MetricsCollector
from .models import NetworkState, RouteResult, SimulationMetrics
from .network import NetworkGraph
from .simulator import PacketSimulator
from .topologies import TOPOLOGIES, TOPOLOGY_LIST

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="NetHeal Network Simulation API",
    description="Backend for the NetHeal interactive network failure simulation tool.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global simulation state
# ---------------------------------------------------------------------------

def _make_sim_state(topology_id: str = "simple_star") -> Dict[str, Any]:
    """Create a fresh simulation state from the given topology."""
    topo = TOPOLOGIES[topology_id]
    network = NetworkGraph(topo)
    failure = FailureManager(network)
    simulator = PacketSimulator(network, failure)
    metrics = MetricsCollector()
    return {
        "topology_id": topology_id,
        "network": network,
        "failure": failure,
        "simulator": simulator,
        "metrics": metrics,
        "last_recovery_ms": 0.0,
    }


sim_state: Dict[str, Any] = _make_sim_state("simple_star")


def _get_network() -> NetworkGraph:
    return sim_state["network"]


def _get_failure() -> FailureManager:
    return sim_state["failure"]


def _get_simulator() -> PacketSimulator:
    return sim_state["simulator"]


def _get_metrics() -> MetricsCollector:
    return sim_state["metrics"]


# ---------------------------------------------------------------------------
# Request / Response helpers
# ---------------------------------------------------------------------------

class SendPacketsRequest(BaseModel):
    source: str
    dest: str
    count: int = 20


# ---------------------------------------------------------------------------
# Topology endpoints
# ---------------------------------------------------------------------------

@app.get("/api/topologies", summary="List available topologies")
def list_topologies() -> List[Dict]:
    """Return metadata for all predefined topologies."""
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "description": t["description"],
            "node_count": len(t["nodes"]),
            "link_count": len(t["links"]),
        }
        for t in TOPOLOGY_LIST
    ]


@app.post("/api/topology/{topology_id}", summary="Load a topology")
def load_topology(topology_id: str) -> Dict:
    """Switch to the specified topology, resetting all simulation state."""
    global sim_state
    if topology_id not in TOPOLOGIES:
        raise HTTPException(status_code=404, detail=f"Topology '{topology_id}' not found.")
    sim_state = _make_sim_state(topology_id)
    topo = TOPOLOGIES[topology_id]
    return {
        "status": "ok",
        "topology_id": topology_id,
        "name": topo["name"],
        "nodes": len(topo["nodes"]),
        "links": len(topo["links"]),
    }


# ---------------------------------------------------------------------------
# State endpoint
# ---------------------------------------------------------------------------

@app.get("/api/state", response_model=NetworkState, summary="Full network state")
def get_state() -> NetworkState:
    """Return a complete snapshot of the current network state."""
    network = _get_network()
    state = network.get_state()
    # Enrich with packet and metrics data
    simulator = _get_simulator()
    metrics_col = _get_metrics()
    packets = simulator.get_packets()
    failures = {
        "failed_links": network.get_failed_link_count(),
        "failed_routers": network.get_failed_router_count(),
        "recovery_time_ms": sim_state.get("last_recovery_ms", 0.0),
    }
    state.packets = packets
    state.metrics = metrics_col.compute(packets, state.events, failures)
    return state


@app.post("/api/reset", summary="Reset simulation to initial state")
def reset_simulation() -> Dict:
    """Reset the current topology to its original state and clear all packets/events."""
    global sim_state
    topology_id = sim_state["topology_id"]
    sim_state = _make_sim_state(topology_id)
    return {"status": "ok", "message": f"Simulation reset to topology '{topology_id}'."}


# ---------------------------------------------------------------------------
# Routing endpoints
# ---------------------------------------------------------------------------

@app.get("/api/route", response_model=RouteResult, summary="Compute shortest route")
def compute_route(
    src: str = Query(..., description="Source router ID"),
    dst: str = Query(..., description="Destination router ID"),
) -> RouteResult:
    """Compute the shortest (lowest-cost) path from src to dst."""
    from .routing import RoutingEngine
    engine = RoutingEngine()
    return engine.find_route(_get_network(), src, dst)


# ---------------------------------------------------------------------------
# Packet endpoints
# ---------------------------------------------------------------------------

@app.post("/api/packets/send", summary="Send packets through the network")
def send_packets(body: SendPacketsRequest) -> Dict:
    """Simulate sending *count* packets from source to dest."""
    if body.count < 1 or body.count > 500:
        raise HTTPException(status_code=400, detail="count must be between 1 and 500.")
    packets = _get_simulator().send_packets(body.source, body.dest, body.count)
    delivered = sum(1 for p in packets if p.status.value == "DELIVERED")
    dropped = sum(1 for p in packets if p.status.value == "DROPPED")
    return {
        "status": "ok",
        "sent": len(packets),
        "delivered": delivered,
        "dropped": dropped,
        "packets": [p.model_dump() for p in packets],
    }


@app.get("/api/packets", summary="List all packets")
def list_packets() -> List[Dict]:
    """Return all simulated packets."""
    return [p.model_dump() for p in _get_simulator().get_packets()]


# ---------------------------------------------------------------------------
# Failure / restore endpoints
# ---------------------------------------------------------------------------

@app.post("/api/fail/link/{link_id}", summary="Fail a link")
def fail_link(link_id: str) -> Dict:
    """Mark a link as DOWN and return recovery information."""
    try:
        result = _get_failure().fail_link(link_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    sim_state["last_recovery_ms"] = result["recovery_time_ms"]
    return {
        "status": "ok",
        "event": result["event"].model_dump(),
        "old_route": result["old_route"].model_dump() if result["old_route"] else None,
        "new_route": result["new_route"].model_dump() if result["new_route"] else None,
        "recovery_time_ms": result["recovery_time_ms"],
    }


@app.post("/api/restore/link/{link_id}", summary="Restore a link")
def restore_link(link_id: str) -> Dict:
    """Restore a previously-failed link."""
    try:
        result = _get_failure().restore_link(link_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {
        "status": "ok",
        "event": result["event"].model_dump(),
        "new_route": result["new_route"].model_dump() if result["new_route"] else None,
    }


@app.post("/api/fail/router/{router_id}", summary="Fail a router")
def fail_router(router_id: str) -> Dict:
    """Mark a router as DOWN (and all its links) and return recovery information."""
    try:
        result = _get_failure().fail_router(router_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    sim_state["last_recovery_ms"] = result["recovery_time_ms"]
    return {
        "status": "ok",
        "event": result["event"].model_dump(),
        "old_route": result["old_route"].model_dump() if result["old_route"] else None,
        "new_route": result["new_route"].model_dump() if result["new_route"] else None,
        "recovery_time_ms": result["recovery_time_ms"],
    }


@app.post("/api/restore/router/{router_id}", summary="Restore a router")
def restore_router(router_id: str) -> Dict:
    """Restore a previously-failed router."""
    try:
        result = _get_failure().restore_router(router_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {
        "status": "ok",
        "event": result["event"].model_dump(),
        "new_route": result["new_route"].model_dump() if result["new_route"] else None,
    }


# ---------------------------------------------------------------------------
# Metrics endpoint
# ---------------------------------------------------------------------------

@app.get("/api/metrics", response_model=SimulationMetrics, summary="Get simulation metrics")
def get_metrics() -> SimulationMetrics:
    """Return aggregated simulation metrics."""
    network = _get_network()
    simulator = _get_simulator()
    metrics_col = _get_metrics()
    packets = simulator.get_packets()
    events = network.get_events()
    failures = {
        "failed_links": network.get_failed_link_count(),
        "failed_routers": network.get_failed_router_count(),
        "recovery_time_ms": sim_state.get("last_recovery_ms", 0.0),
    }
    return metrics_col.compute(packets, events, failures)


# ---------------------------------------------------------------------------
# Events endpoints
# ---------------------------------------------------------------------------

@app.get("/api/events", summary="List simulation events")
def list_events(
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: Optional[int] = Query(None, description="Max events to return"),
) -> List[Dict]:
    """Return the event log, optionally filtered by category and limited in count."""
    events = _get_network().get_events()
    if category:
        events = [e for e in events if e.category.upper() == category.upper()]
    if limit and limit > 0:
        events = events[-limit:]
    return [e.model_dump() for e in events]


@app.delete("/api/events", summary="Clear the event log")
def clear_events() -> Dict:
    """Delete all recorded events from the event log."""
    _get_network().clear_events()
    return {"status": "ok", "message": "Event log cleared."}


# ---------------------------------------------------------------------------
# Export endpoints
# ---------------------------------------------------------------------------

@app.get("/api/export/json", summary="Export full state as JSON")
def export_json() -> StreamingResponse:
    """Download the complete simulation state as a JSON file."""
    state = get_state()
    json_bytes = json.dumps(state.model_dump(), indent=2, default=str).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(json_bytes),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=netheal_state.json"},
    )


@app.get("/api/export/csv", summary="Export packets as CSV")
def export_csv() -> StreamingResponse:
    """Download all simulated packets as a CSV file."""
    packets = _get_simulator().get_packets()
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["id", "source", "dest", "status", "hops", "route",
                    "drop_reason", "created_at", "completed_at"],
    )
    writer.writeheader()
    for p in packets:
        writer.writerow({
            "id": p.id,
            "source": p.source,
            "dest": p.dest,
            "status": p.status.value,
            "hops": len(p.route) - 1 if p.route else 0,
            "route": " -> ".join(p.route),
            "drop_reason": p.drop_reason or "",
            "created_at": p.created_at,
            "completed_at": p.completed_at or "",
        })
    output.seek(0)
    return StreamingResponse(
        io.StringIO(output.getvalue()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=netheal_packets.csv"},
    )
