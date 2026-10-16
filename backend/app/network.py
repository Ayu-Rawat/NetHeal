"""
NetworkGraph: wraps a NetworkX graph built from a topology dict.
Provides thread-safe methods to fail/restore links and routers.
"""
from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import networkx as nx

from .models import (
    RouterState, RouterStatus,
    LinkState, LinkStatus,
    NetworkState, SimulationMetrics, SimEvent, EventSeverity,
    RouteResult,
)


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class NetworkGraph:
    """
    Thread-safe wrapper around a NetworkX DiGraph that tracks the runtime
    state of all routers and links, supports failures, and restores.
    """

    def __init__(self, topology_dict: dict) -> None:
        self._lock = threading.Lock()
        self._topology_id: str = topology_dict["id"]
        self._topology_name: str = topology_dict["name"]

        # Parse static definitions
        self._router_defs: Dict[str, dict] = {
            r["id"]: r for r in topology_dict["nodes"]
        }
        self._link_defs: Dict[str, dict] = {
            lk["id"]: lk for lk in topology_dict["links"]
        }

        # Runtime state maps
        self._routers: Dict[str, RouterState] = {}
        self._links: Dict[str, LinkState] = {}

        # NetworkX undirected weighted graph (live – reflects failures)
        self.graph: nx.Graph = nx.Graph()

        # Event log
        self._events: List[SimEvent] = []

        # Recovery time tracking (latest ms)
        self._last_recovery_ms: float = 0.0

        self._build()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build(self) -> None:
        """(Re-)initialise graph and state from original definitions."""
        self._routers = {}
        self._links = {}
        self.graph = nx.Graph()

        for r_def in self._router_defs.values():
            self._routers[r_def["id"]] = RouterState(
                id=r_def["id"],
                display_name=r_def["display_name"],
                status=RouterStatus.UP,
                x=r_def.get("x", 0),
                y=r_def.get("y", 0),
            )
            self.graph.add_node(r_def["id"])

        for lk_def in self._link_defs.values():
            self._links[lk_def["id"]] = LinkState(
                id=lk_def["id"],
                source=lk_def["source"],
                target=lk_def["target"],
                cost=lk_def["cost"],
                latency=lk_def["latency"],
                status=LinkStatus.UP,
            )
            self.graph.add_edge(
                lk_def["source"],
                lk_def["target"],
                weight=lk_def["cost"],
                latency=lk_def["latency"],
                link_id=lk_def["id"],
            )

        self._log_event(EventSeverity.INFO, "SYSTEM",
                        f"Topology '{self._topology_name}' loaded — "
                        f"{len(self._routers)} routers, {len(self._links)} links.")

    def _log_event(self, severity: EventSeverity, category: str, message: str) -> SimEvent:
        event = SimEvent(
            id=str(uuid.uuid4()),
            timestamp=_utcnow(),
            severity=severity,
            category=category,
            message=message,
        )
        self._events.append(event)
        return event

    def _find_link_id(self, source: str, target: str) -> Optional[str]:
        """Find link id for a given (source, target) pair (order-independent)."""
        for lk_id, lk in self._link_defs.items():
            if (lk["source"] == source and lk["target"] == target) or \
               (lk["source"] == target and lk["target"] == source):
                return lk_id
        return None

    # ------------------------------------------------------------------
    # Public read helpers
    # ------------------------------------------------------------------

    @property
    def topology_id(self) -> str:
        return self._topology_id

    def get_routers(self) -> Dict[str, RouterState]:
        with self._lock:
            return dict(self._routers)

    def get_links(self) -> Dict[str, LinkState]:
        with self._lock:
            return dict(self._links)

    def get_events(self) -> List[SimEvent]:
        with self._lock:
            return list(self._events)

    def clear_events(self) -> None:
        with self._lock:
            self._events.clear()

    def get_failed_link_count(self) -> int:
        with self._lock:
            return sum(1 for lk in self._links.values() if lk.status == LinkStatus.DOWN)

    def get_failed_router_count(self) -> int:
        with self._lock:
            return sum(1 for r in self._routers.values() if r.status == RouterStatus.DOWN)

    def get_last_recovery_ms(self) -> float:
        return self._last_recovery_ms

    def get_state(self) -> NetworkState:
        """Return a full snapshot of the current network state."""
        with self._lock:
            return NetworkState(
                routers=list(self._routers.values()),
                links=list(self._links.values()),
                events=list(self._events),
                metrics=SimulationMetrics(
                    failed_links=sum(1 for lk in self._links.values() if lk.status == LinkStatus.DOWN),
                    failed_routers=sum(1 for r in self._routers.values() if r.status == RouterStatus.DOWN),
                ),
            )

    # ------------------------------------------------------------------
    # Failure / restore – links
    # ------------------------------------------------------------------

    def fail_link(self, link_id: str) -> SimEvent:
        """Mark a link DOWN and remove it from the live graph."""
        with self._lock:
            if link_id not in self._links:
                raise ValueError(f"Link '{link_id}' not found.")
            lk = self._links[link_id]
            if lk.status == LinkStatus.DOWN:
                raise ValueError(f"Link '{link_id}' is already DOWN.")
            lk.status = LinkStatus.DOWN
            if self.graph.has_edge(lk.source, lk.target):
                self.graph.remove_edge(lk.source, lk.target)
            event = self._log_event(
                EventSeverity.ERROR, "FAILURE",
                f"Link {link_id} ({lk.source}↔{lk.target}) has FAILED."
            )
        return event

    def restore_link(self, link_id: str) -> SimEvent:
        """Mark a link UP and re-add it to the live graph (if both endpoints are UP)."""
        with self._lock:
            if link_id not in self._links:
                raise ValueError(f"Link '{link_id}' not found.")
            lk = self._links[link_id]
            if lk.status == LinkStatus.UP:
                raise ValueError(f"Link '{link_id}' is already UP.")
            lk.status = LinkStatus.UP
            # Only re-add the edge if both routers are UP
            src_up = self._routers.get(lk.source, RouterState(id=lk.source, display_name=lk.source)).status == RouterStatus.UP
            tgt_up = self._routers.get(lk.target, RouterState(id=lk.target, display_name=lk.target)).status == RouterStatus.UP
            if src_up and tgt_up:
                lk_def = self._link_defs[link_id]
                self.graph.add_edge(
                    lk.source, lk.target,
                    weight=lk_def["cost"],
                    latency=lk_def["latency"],
                    link_id=link_id,
                )
            event = self._log_event(
                EventSeverity.SUCCESS, "RECOVERY",
                f"Link {link_id} ({lk.source}↔{lk.target}) has been RESTORED."
            )
        return event

    # ------------------------------------------------------------------
    # Failure / restore – routers
    # ------------------------------------------------------------------

    def fail_router(self, router_id: str) -> SimEvent:
        """Mark a router DOWN and remove all its edges from the live graph."""
        with self._lock:
            if router_id not in self._routers:
                raise ValueError(f"Router '{router_id}' not found.")
            r = self._routers[router_id]
            if r.status == RouterStatus.DOWN:
                raise ValueError(f"Router '{router_id}' is already DOWN.")
            r.status = RouterStatus.DOWN
            # Mark all links touching this router as DOWN
            for lk in self._links.values():
                if lk.source == router_id or lk.target == router_id:
                    lk.status = LinkStatus.DOWN
            # Remove edges from graph
            if router_id in self.graph:
                self.graph.remove_edges_from(list(self.graph.edges(router_id)))
            event = self._log_event(
                EventSeverity.ERROR, "FAILURE",
                f"Router {router_id} has FAILED — all adjacent links removed."
            )
        return event

    def restore_router(self, router_id: str) -> SimEvent:
        """Mark a router UP and re-add all its originally-UP edges."""
        with self._lock:
            if router_id not in self._routers:
                raise ValueError(f"Router '{router_id}' not found.")
            r = self._routers[router_id]
            if r.status == RouterStatus.UP:
                raise ValueError(f"Router '{router_id}' is already UP.")
            r.status = RouterStatus.UP
            # Re-add links where the OTHER endpoint is also UP
            for lk_def in self._link_defs.values():
                if lk_def["source"] == router_id or lk_def["target"] == router_id:
                    lk = self._links[lk_def["id"]]
                    other = lk_def["target"] if lk_def["source"] == router_id else lk_def["source"]
                    other_up = self._routers.get(other) and self._routers[other].status == RouterStatus.UP
                    if other_up:
                        lk.status = LinkStatus.UP
                        self.graph.add_edge(
                            lk_def["source"], lk_def["target"],
                            weight=lk_def["cost"],
                            latency=lk_def["latency"],
                            link_id=lk_def["id"],
                        )
            event = self._log_event(
                EventSeverity.SUCCESS, "RECOVERY",
                f"Router {router_id} has been RESTORED — adjacent links re-added."
            )
        return event

    # ------------------------------------------------------------------
    # Reset
    # ------------------------------------------------------------------

    def reset(self) -> None:
        """Restore the original topology (all routers and links UP)."""
        with self._lock:
            self._build()
