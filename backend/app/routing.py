"""
RoutingEngine: pure Dijkstra-based routing on a NetworkGraph.
No side-effects — all operations take the graph as input.
"""
from __future__ import annotations

from typing import List

import networkx as nx

from .models import RouteResult, RouterStatus
from .network import NetworkGraph


class RoutingEngine:
    """
    Stateless routing engine.  Methods accept a NetworkGraph instance
    and return RouteResult objects without mutating any state.
    """

    # ------------------------------------------------------------------
    # Primary route computation
    # ------------------------------------------------------------------

    def find_route(self, network: NetworkGraph, source: str, dest: str) -> RouteResult:
        """
        Compute the lowest-cost path from *source* to *dest* using Dijkstra.

        Returns a RouteResult with reachable=False and a human-readable
        reason on any error condition.
        """
        routers = network.get_routers()
        graph: nx.Graph = network.graph

        # --- Validation ---
        if source not in routers:
            return RouteResult(reachable=False, reason=f"Source '{source}' does not exist.")
        if dest not in routers:
            return RouteResult(reachable=False, reason=f"Destination '{dest}' does not exist.")

        if routers[source].status == RouterStatus.DOWN:
            return RouteResult(reachable=False, reason=f"Source router '{source}' is DOWN.")
        if routers[dest].status == RouterStatus.DOWN:
            return RouteResult(reachable=False, reason=f"Destination router '{dest}' is DOWN.")

        # --- Trivial case ---
        if source == dest:
            return RouteResult(path=[source], cost=0.0, hops=0, reachable=True, reason="Source equals destination.")

        # --- Dijkstra ---
        try:
            path: List[str] = nx.dijkstra_path(graph, source, dest, weight="cost")
            cost: float = nx.dijkstra_path_length(graph, source, dest, weight="cost")
            return RouteResult(
                path=path,
                cost=cost,
                hops=len(path) - 1,
                reachable=True,
                reason="",
            )
        except nx.NetworkXNoPath:
            return RouteResult(reachable=False,
                               reason=f"No path exists between '{source}' and '{dest}'.")
        except nx.NodeNotFound as exc:
            return RouteResult(reachable=False,
                               reason=f"Node not found in active graph: {exc}")

    # ------------------------------------------------------------------
    # Alternative paths
    # ------------------------------------------------------------------

    def find_all_paths(
        self,
        network: NetworkGraph,
        source: str,
        dest: str,
        top_n: int = 3,
    ) -> List[RouteResult]:
        """
        Return up to *top_n* shortest (by cost) simple paths.
        Returns an empty list if no paths exist.
        """
        routers = network.get_routers()
        graph: nx.Graph = network.graph

        if source not in routers or dest not in routers:
            return []
        if routers[source].status == RouterStatus.DOWN or routers[dest].status == RouterStatus.DOWN:
            return []
        if source == dest:
            return [RouteResult(path=[source], cost=0.0, hops=0, reachable=True)]

        try:
            all_simple = nx.shortest_simple_paths(graph, source, dest, weight="cost")
            results: List[RouteResult] = []
            for path in all_simple:
                cost = sum(
                    graph[path[i]][path[i + 1]].get("weight", 1)
                    for i in range(len(path) - 1)
                )
                results.append(RouteResult(
                    path=path,
                    cost=cost,
                    hops=len(path) - 1,
                    reachable=True,
                ))
                if len(results) >= top_n:
                    break
            return results
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return []
