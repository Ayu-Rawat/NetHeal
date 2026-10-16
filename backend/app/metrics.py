"""
MetricsCollector: aggregates simulation statistics from packets and events.
"""
from __future__ import annotations

from typing import Any, Dict, List

from .models import PacketState, PacketStatus, SimEvent, SimulationMetrics


class MetricsCollector:
    """
    Stateless aggregator.  All methods are pure functions over the
    provided data — no internal state is mutated.
    """

    # ------------------------------------------------------------------
    # Primary aggregation
    # ------------------------------------------------------------------

    def compute(
        self,
        packets: List[PacketState],
        events: List[SimEvent],
        failures: Dict[str, Any],
    ) -> SimulationMetrics:
        """
        Aggregate packet outcomes and failure counts into SimulationMetrics.

        Parameters
        ----------
        packets  : all PacketState objects from the simulator
        events   : all SimEvent objects from the network graph
        failures : dict with keys 'failed_links', 'failed_routers',
                   'recovery_time_ms' (from NetworkGraph helpers)
        """
        sent = len(packets)
        delivered = sum(1 for p in packets if p.status == PacketStatus.DELIVERED)
        dropped = sum(1 for p in packets if p.status == PacketStatus.DROPPED)

        delivery_ratio = (delivered / sent) if sent > 0 else 0.0

        # Average route cost among delivered packets
        routed_costs = [
            len(p.route) - 1  # approximate hop-count as cost proxy when exact unavailable
            for p in packets
            if p.status == PacketStatus.DELIVERED and p.route
        ]
        # Try to extract actual cost from route if available; fallback to hop count
        avg_route_cost = sum(routed_costs) / len(routed_costs) if routed_costs else 0.0

        return SimulationMetrics(
            packets_sent=sent,
            packets_delivered=delivered,
            packets_dropped=dropped,
            delivery_ratio=round(delivery_ratio, 4),
            avg_route_cost=round(avg_route_cost, 4),
            recovery_time_ms=round(failures.get("recovery_time_ms", 0.0), 4),
            failed_links=failures.get("failed_links", 0),
            failed_routers=failures.get("failed_routers", 0),
        )

    # ------------------------------------------------------------------
    # Route cost history
    # ------------------------------------------------------------------

    def route_cost_history(self, packets: List[PacketState]) -> List[Dict[str, Any]]:
        """
        Return a time-ordered list of {timestamp, cost} dicts for every
        delivered packet (using hop count as cost proxy).
        """
        history = []
        for p in packets:
            if p.status == PacketStatus.DELIVERED and p.route:
                history.append({
                    "timestamp": p.created_at,
                    "cost": len(p.route) - 1,
                    "packet_id": p.id,
                })
        return history

    # ------------------------------------------------------------------
    # Experiment comparison
    # ------------------------------------------------------------------

    def experiment_comparison(
        self,
        baseline_packets: List[PacketState],
        experiment_packets: List[PacketState],
    ) -> Dict[str, Any]:
        """
        Compare two packet sets (e.g. before vs. after a topology change).

        Returns a dict with per-group metrics and delta values.
        """
        def _summarise(pkts: List[PacketState]) -> Dict[str, Any]:
            total = len(pkts)
            delivered = sum(1 for p in pkts if p.status == PacketStatus.DELIVERED)
            dropped = total - delivered
            ratio = (delivered / total) if total > 0 else 0.0
            costs = [len(p.route) - 1 for p in pkts
                     if p.status == PacketStatus.DELIVERED and p.route]
            avg_cost = sum(costs) / len(costs) if costs else 0.0
            return {
                "packets_sent": total,
                "packets_delivered": delivered,
                "packets_dropped": dropped,
                "delivery_ratio": round(ratio, 4),
                "avg_route_cost": round(avg_cost, 4),
            }

        base = _summarise(baseline_packets)
        exp = _summarise(experiment_packets)

        return {
            "baseline": base,
            "experiment": exp,
            "delta": {
                "delivery_ratio": round(exp["delivery_ratio"] - base["delivery_ratio"], 4),
                "avg_route_cost": round(exp["avg_route_cost"] - base["avg_route_cost"], 4),
                "packets_dropped": exp["packets_dropped"] - base["packets_dropped"],
            },
        }
