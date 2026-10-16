"""
Tests for FailureManager and NetworkGraph failure/restore mechanics.
"""
import pytest
from app.network import NetworkGraph
from app.failure import FailureManager
from app.models import LinkStatus, RouterStatus
from app.topologies import TOPOLOGIES


@pytest.fixture
def network():
    return NetworkGraph(TOPOLOGIES["simple_star"])


@pytest.fixture
def manager(network):
    mgr = FailureManager(network)
    mgr.set_reference_endpoints("R1", "R5")
    return mgr


# ---------------------------------------------------------------------------
# Link failure / restore
# ---------------------------------------------------------------------------

def test_fail_link_reduces_graph_edges(network, manager):
    """Failing a link should remove it from the NetworkX graph."""
    edges_before = network.graph.number_of_edges()
    manager.fail_link("L6")   # R4-R5
    edges_after = network.graph.number_of_edges()
    assert edges_after == edges_before - 1


def test_fail_link_marks_status_down(network, manager):
    """Failing a link must set its status to DOWN."""
    manager.fail_link("L6")
    links = network.get_links()
    assert links["L6"].status == LinkStatus.DOWN


def test_restore_link_re_adds_edge(network, manager):
    """Restoring a failed link should re-add it to the NetworkX graph."""
    edges_before = network.graph.number_of_edges()
    manager.fail_link("L6")
    manager.restore_link("L6")
    edges_after = network.graph.number_of_edges()
    assert edges_after == edges_before


def test_restore_link_marks_status_up(network, manager):
    """Restoring a link must set its status back to UP."""
    manager.fail_link("L6")
    manager.restore_link("L6")
    links = network.get_links()
    assert links["L6"].status == LinkStatus.UP


def test_fail_already_down_link_raises(network, manager):
    """Failing an already-DOWN link should raise ValueError."""
    manager.fail_link("L6")
    with pytest.raises(ValueError):
        manager.fail_link("L6")


def test_restore_already_up_link_raises(network, manager):
    """Restoring an already-UP link should raise ValueError."""
    with pytest.raises(ValueError):
        manager.restore_link("L6")


# ---------------------------------------------------------------------------
# Router failure / restore
# ---------------------------------------------------------------------------

def test_fail_router_removes_all_edges(network, manager):
    """Failing R1 (the hub) should remove all 3 of its edges from the graph."""
    edges_before = network.graph.number_of_edges()
    # R1 is connected to R2, R3, R4 → 3 edges
    manager.fail_router("R1")
    edges_after = network.graph.number_of_edges()
    assert edges_after < edges_before
    # No edges from/to R1 should remain
    assert not list(network.graph.edges("R1"))


def test_fail_router_marks_status_down(network, manager):
    """Failing a router must set its status to DOWN."""
    manager.fail_router("R1")
    routers = network.get_routers()
    assert routers["R1"].status == RouterStatus.DOWN


def test_restore_router_re_adds_all_edges(network, manager):
    """Restoring a router must re-add its original edges to the graph."""
    edges_before = network.graph.number_of_edges()
    manager.fail_router("R1")
    manager.restore_router("R1")
    edges_after = network.graph.number_of_edges()
    assert edges_after == edges_before


def test_restore_router_marks_status_up(network, manager):
    """Restoring a router must set its status back to UP."""
    manager.fail_router("R1")
    manager.restore_router("R1")
    routers = network.get_routers()
    assert routers["R1"].status == RouterStatus.UP


def test_fail_already_down_router_raises(network, manager):
    """Failing an already-DOWN router should raise ValueError."""
    manager.fail_router("R1")
    with pytest.raises(ValueError):
        manager.fail_router("R1")


# ---------------------------------------------------------------------------
# Recovery time
# ---------------------------------------------------------------------------

def test_recovery_time_ms_is_non_negative(network, manager):
    """recovery_time_ms must be >= 0 after a link failure."""
    result = manager.fail_link("L1")
    assert result["recovery_time_ms"] >= 0.0


def test_recovery_time_ms_is_non_negative_router(network, manager):
    """recovery_time_ms must be >= 0 after a router failure."""
    result = manager.fail_router("R2")
    assert result["recovery_time_ms"] >= 0.0


def test_fail_link_result_has_expected_keys(network, manager):
    """fail_link result dict must contain event, old_route, new_route, recovery_time_ms."""
    result = manager.fail_link("L5")
    assert "event" in result
    assert "old_route" in result
    assert "new_route" in result
    assert "recovery_time_ms" in result


def test_fail_router_result_has_expected_keys(network, manager):
    """fail_router result dict must contain event, old_route, new_route, recovery_time_ms."""
    result = manager.fail_router("R3")
    assert "event" in result
    assert "old_route" in result
    assert "new_route" in result
    assert "recovery_time_ms" in result
