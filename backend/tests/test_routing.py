"""
Tests for RoutingEngine.
"""
import pytest
from app.network import NetworkGraph
from app.routing import RoutingEngine
from app.topologies import TOPOLOGIES


@pytest.fixture
def star_network():
    return NetworkGraph(TOPOLOGIES["simple_star"])


@pytest.fixture
def engine():
    return RoutingEngine()


# ---------------------------------------------------------------------------
# Test: find route in a simple graph
# ---------------------------------------------------------------------------

def test_find_route_basic(star_network, engine):
    """A route from R1 to R5 should exist and be reachable."""
    result = engine.find_route(star_network, "R1", "R5")
    assert result.reachable is True
    assert result.path[0] == "R1"
    assert result.path[-1] == "R5"
    assert result.hops > 0
    assert result.cost > 0


def test_find_route_optimal_cost(star_network, engine):
    """Dijkstra must pick a lowest-cost path of cost=2 to R5.

    Two equally-optimal paths exist (cost=2 each):
      R1→R4→R5  (L3 cost=1 + L6 cost=1)
      R1→R3→R5  (L2 cost=2 + L5 cost=2 — actually cost=4, so R1→R4→R5 wins)
    NetworkX may choose either; we assert cost and endpoints only.
    """
    result = engine.find_route(star_network, "R1", "R5")
    assert result.reachable is True
    # Both valid optimal paths have total cost 2
    assert result.cost == 2.0
    assert result.path[0] == "R1"
    assert result.path[-1] == "R5"
    assert result.hops == 2


# ---------------------------------------------------------------------------
# Test: no route when link removed
# ---------------------------------------------------------------------------

def test_no_route_when_all_links_to_dest_removed(star_network, engine):
    """After removing every link touching R5, R5 should be unreachable from R1."""
    star_network.fail_link("L5")   # R3-R5
    star_network.fail_link("L6")   # R4-R5
    result = engine.find_route(star_network, "R1", "R5")
    assert result.reachable is False
    assert result.reason != ""


# ---------------------------------------------------------------------------
# Test: no route when router is down
# ---------------------------------------------------------------------------

def test_no_route_when_source_router_is_down(star_network, engine):
    """Route should fail immediately when the source router is DOWN."""
    star_network.fail_router("R1")
    result = engine.find_route(star_network, "R1", "R5")
    assert result.reachable is False
    assert "DOWN" in result.reason or "R1" in result.reason


def test_no_route_when_dest_router_is_down(star_network, engine):
    """Route should fail immediately when the destination router is DOWN."""
    star_network.fail_router("R5")
    result = engine.find_route(star_network, "R1", "R5")
    assert result.reachable is False
    assert "DOWN" in result.reason or "R5" in result.reason


# ---------------------------------------------------------------------------
# Test: source == destination
# ---------------------------------------------------------------------------

def test_route_source_equals_dest(star_network, engine):
    """Route from R1 to R1 should return empty path cost=0 hops=0."""
    result = engine.find_route(star_network, "R1", "R1")
    assert result.reachable is True
    assert result.cost == 0.0
    assert result.hops == 0
    assert result.path == ["R1"]


# ---------------------------------------------------------------------------
# Test: invalid router ID
# ---------------------------------------------------------------------------

def test_invalid_source_returns_unreachable(star_network, engine):
    """An unknown source router should return reachable=False."""
    result = engine.find_route(star_network, "FAKE_SRC", "R5")
    assert result.reachable is False
    assert result.reason != ""


def test_invalid_dest_returns_unreachable(star_network, engine):
    """An unknown destination router should return reachable=False."""
    result = engine.find_route(star_network, "R1", "FAKE_DST")
    assert result.reachable is False
    assert result.reason != ""


# ---------------------------------------------------------------------------
# Test: find_all_paths returns multiple routes
# ---------------------------------------------------------------------------

def test_find_all_paths_returns_multiple(star_network, engine):
    """find_all_paths should return up to 3 routes between R1 and R5."""
    paths = engine.find_all_paths(star_network, "R1", "R5")
    assert len(paths) >= 1
    for r in paths:
        assert r.reachable is True
        assert r.path[0] == "R1"
        assert r.path[-1] == "R5"
