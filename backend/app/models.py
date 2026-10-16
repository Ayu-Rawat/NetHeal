"""
Pydantic models for NetHeal network simulation state.
"""
from __future__ import annotations

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class RouterStatus(str, Enum):
    UP = "UP"
    DOWN = "DOWN"


class LinkStatus(str, Enum):
    UP = "UP"
    DOWN = "DOWN"


class PacketStatus(str, Enum):
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    DROPPED = "DROPPED"


class EventSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    SUCCESS = "SUCCESS"


# ---------------------------------------------------------------------------
# Network element state
# ---------------------------------------------------------------------------

class RouterState(BaseModel):
    """Runtime state of a single router node."""
    id: str
    display_name: str
    status: RouterStatus = RouterStatus.UP
    x: float = 0.0
    y: float = 0.0


class LinkState(BaseModel):
    """Runtime state of a single network link."""
    id: str
    source: str
    target: str
    cost: float
    latency: float
    status: LinkStatus = LinkStatus.UP


# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------

class RouteResult(BaseModel):
    """Result of a shortest-path computation."""
    path: List[str] = Field(default_factory=list)
    cost: float = 0.0
    hops: int = 0
    reachable: bool = True
    reason: str = ""


# ---------------------------------------------------------------------------
# Packet simulation
# ---------------------------------------------------------------------------

class PacketState(BaseModel):
    """State of a single simulated packet."""
    id: str
    source: str
    dest: str
    route: List[str] = Field(default_factory=list)
    current_hop: int = 0
    status: PacketStatus = PacketStatus.PENDING
    created_at: str = ""
    completed_at: Optional[str] = None
    drop_reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

class SimEvent(BaseModel):
    """A single simulation event logged during operation."""
    id: str
    timestamp: str
    severity: EventSeverity
    category: str   # e.g. "ROUTING", "FAILURE", "PACKET", "SYSTEM"
    message: str


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

class SimulationMetrics(BaseModel):
    """Aggregated simulation metrics."""
    packets_sent: int = 0
    packets_delivered: int = 0
    packets_dropped: int = 0
    delivery_ratio: float = 0.0
    avg_route_cost: float = 0.0
    recovery_time_ms: float = 0.0
    failed_links: int = 0
    failed_routers: int = 0


# ---------------------------------------------------------------------------
# Full network state (returned by GET /api/state)
# ---------------------------------------------------------------------------

class NetworkState(BaseModel):
    """Complete snapshot of the simulation state."""
    routers: List[RouterState] = Field(default_factory=list)
    links: List[LinkState] = Field(default_factory=list)
    active_route: Optional[RouteResult] = None
    packets: List[PacketState] = Field(default_factory=list)
    events: List[SimEvent] = Field(default_factory=list)
    metrics: SimulationMetrics = Field(default_factory=SimulationMetrics)
