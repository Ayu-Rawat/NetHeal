"""
FailureManager: orchestrates link/router failures, computes recovery routes,
records timing metrics, and delegates state changes to NetworkGraph.
"""
from __future__ import annotations

import time
from typing import Dict, Optional

from .models import RouteResult, SimEvent
from .network import NetworkGraph
from .routing import RoutingEngine


class FailureManager:
    """
    High-level interface for injecting and healing failures.
    Wraps NetworkGraph and measures recovery time (time to find the
    alternative route after a failure event).
    """

    def __init__(self, network: NetworkGraph) -> None:
        self._network = network
        self._routing = RoutingEngine()
        # Persist the last "active" source/dest for re-route computations.
        self._last_src: Optional[str] = None
        self._last_dst: Optional[str] = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _active_route(self) -> Optional[RouteResult]:
        """Return current best route between last known src/dst, or None."""
        if self._last_src and self._last_dst:
            return self._routing.find_route(self._network, self._last_src, self._last_dst)
        return None

    def _recompute_with_timing(self) -> tuple[Optional[RouteResult], float]:
        """Recompute route and measure elapsed ms."""
        t0 = time.perf_counter()
        route = self._active_route()
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        return route, elapsed_ms

    # ------------------------------------------------------------------
    # Reference route (set by simulator / API)
    # ------------------------------------------------------------------

    def set_reference_endpoints(self, source: str, dest: str) -> None:
        """Record the endpoints used to measure recovery."""
        self._last_src = source
        self._last_dst = dest

    # ------------------------------------------------------------------
    # Link operations
    # ------------------------------------------------------------------

    def fail_link(self, link_id: str) -> Dict:
        """
        Fail a link and compute recovery information.

        Returns a dict containing:
          - event: SimEvent
          - old_route: RouteResult (before failure)
          - new_route: RouteResult (after failure)
          - recovery_time_ms: float
        """
        old_route = self._active_route()
        event: SimEvent = self._network.fail_link(link_id)
        new_route, recovery_ms = self._recompute_with_timing()
        return {
            "event": event,
            "old_route": old_route,
            "new_route": new_route,
            "recovery_time_ms": recovery_ms,
        }

    def restore_link(self, link_id: str) -> Dict:
        """
        Restore a previously-failed link.

        Returns a dict containing:
          - event: SimEvent
          - new_route: RouteResult
        """
        event: SimEvent = self._network.restore_link(link_id)
        new_route = self._active_route()
        return {
            "event": event,
            "new_route": new_route,
        }

    # ------------------------------------------------------------------
    # Router operations
    # ------------------------------------------------------------------

    def fail_router(self, router_id: str) -> Dict:
        """
        Fail a router (and all its adjacent links) and compute recovery.

        Returns a dict containing:
          - event: SimEvent
          - old_route: RouteResult (before failure)
          - new_route: RouteResult (after failure)
          - recovery_time_ms: float
        """
        old_route = self._active_route()
        event: SimEvent = self._network.fail_router(router_id)
        new_route, recovery_ms = self._recompute_with_timing()
        return {
            "event": event,
            "old_route": old_route,
            "new_route": new_route,
            "recovery_time_ms": recovery_ms,
        }

    def restore_router(self, router_id: str) -> Dict:
        """
        Restore a previously-failed router.

        Returns a dict containing:
          - event: SimEvent
          - new_route: RouteResult
        """
        event: SimEvent = self._network.restore_router(router_id)
        new_route = self._active_route()
        return {
            "event": event,
            "new_route": new_route,
        }
