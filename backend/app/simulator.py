"""
PacketSimulator: deterministic hop-by-hop packet simulation.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from .models import (
    PacketState, PacketStatus,
    RouterStatus, LinkStatus,
    SimEvent, EventSeverity,
)
from .network import NetworkGraph
from .failure import FailureManager
from .routing import RoutingEngine


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class PacketSimulator:
    """
    Sends batches of packets through the network and records their fate.
    Simulation is deterministic (no randomness, no real concurrency).
    """

    def __init__(self, network_graph: NetworkGraph, failure_manager: FailureManager) -> None:
        self._network = network_graph
        self._failure = failure_manager
        self._routing = RoutingEngine()
        self._packets: List[PacketState] = []

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def send_packets(self, source: str, dest: str, count: int = 20) -> List[PacketState]:
        """
        Simulate sending *count* packets from *source* to *dest*.

        For each packet:
        1. Compute current route via Dijkstra.
        2. If no route → DROPPED.
        3. Walk each hop and verify router UP + link UP.
        4. Any mid-transit failure → DROPPED with reason.
        5. Success → DELIVERED.
        """
        # Update failure manager reference so recovery routes are meaningful.
        self._failure.set_reference_endpoints(source, dest)

        new_packets: List[PacketState] = []

        for i in range(count):
            pkt_id = f"PKT-{uuid.uuid4().hex[:8].upper()}"
            created = _utcnow()

            # Step 1: Compute route
            route_result = self._routing.find_route(self._network, source, dest)

            if not route_result.reachable:
                # Step 2: No route → DROPPED
                pkt = PacketState(
                    id=pkt_id,
                    source=source,
                    dest=dest,
                    route=[],
                    current_hop=0,
                    status=PacketStatus.DROPPED,
                    created_at=created,
                    completed_at=_utcnow(),
                    drop_reason=route_result.reason or "No route available.",
                )
                self._log_packet_event(
                    EventSeverity.ERROR, pkt_id,
                    f"Packet {pkt_id} DROPPED: {pkt.drop_reason}"
                )
                new_packets.append(pkt)
                self._packets.append(pkt)
                continue

            path = route_result.path
            routers = self._network.get_routers()
            links = self._network.get_links()

            # Step 3 & 4: Walk hops
            drop_reason: Optional[str] = None
            failed_hop: int = 0

            for hop_idx in range(len(path)):
                node = path[hop_idx]
                # Check intermediate router is UP (skip source already validated)
                router = routers.get(node)
                if router and router.status == RouterStatus.DOWN:
                    drop_reason = f"Router {node} went DOWN mid-transit at hop {hop_idx}."
                    failed_hop = hop_idx
                    break

                # Check link to next hop
                if hop_idx < len(path) - 1:
                    next_node = path[hop_idx + 1]
                    link_found = False
                    for lk in links.values():
                        if (lk.source == node and lk.target == next_node) or \
                           (lk.source == next_node and lk.target == node):
                            link_found = True
                            if lk.status == LinkStatus.DOWN:
                                drop_reason = (
                                    f"Link between {node}↔{next_node} is DOWN "
                                    f"(link {lk.id}) at hop {hop_idx}."
                                )
                                failed_hop = hop_idx
                            break
                    if drop_reason:
                        break
                    if not link_found:
                        drop_reason = f"No active link found between {node} and {next_node}."
                        failed_hop = hop_idx
                        break

            if drop_reason:
                pkt = PacketState(
                    id=pkt_id,
                    source=source,
                    dest=dest,
                    route=path,
                    current_hop=failed_hop,
                    status=PacketStatus.DROPPED,
                    created_at=created,
                    completed_at=_utcnow(),
                    drop_reason=drop_reason,
                )
                self._log_packet_event(
                    EventSeverity.WARNING, pkt_id,
                    f"Packet {pkt_id} DROPPED mid-transit: {drop_reason}"
                )
            else:
                pkt = PacketState(
                    id=pkt_id,
                    source=source,
                    dest=dest,
                    route=path,
                    current_hop=len(path) - 1,
                    status=PacketStatus.DELIVERED,
                    created_at=created,
                    completed_at=_utcnow(),
                )
                self._log_packet_event(
                    EventSeverity.SUCCESS, pkt_id,
                    f"Packet {pkt_id} DELIVERED via {' → '.join(path)} (cost={route_result.cost})."
                )

            new_packets.append(pkt)
            self._packets.append(pkt)

        return new_packets

    def get_packets(self) -> List[PacketState]:
        """Return all packets seen so far."""
        return list(self._packets)

    def reset(self) -> None:
        """Clear all recorded packets."""
        self._packets.clear()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _log_packet_event(self, severity: EventSeverity, pkt_id: str, message: str) -> None:
        self._network._log_event(severity, "PACKET", message)
