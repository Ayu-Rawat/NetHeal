"""
Tests for PacketSimulator and MetricsCollector.
"""
import pytest
from app.network import NetworkGraph
from app.failure import FailureManager
from app.simulator import PacketSimulator
from app.metrics import MetricsCollector
from app.models import PacketStatus
from app.topologies import TOPOLOGIES


@pytest.fixture
def network():
    return NetworkGraph(TOPOLOGIES["simple_star"])


@pytest.fixture
def failure(network):
    return FailureManager(network)


@pytest.fixture
def simulator(network, failure):
    return PacketSimulator(network, failure)


@pytest.fixture
def metrics():
    return MetricsCollector()


# ---------------------------------------------------------------------------
# Test: all packets delivered when no failures
# ---------------------------------------------------------------------------

def test_all_packets_delivered_no_failures(simulator):
    """With no failures, all 10 packets from R1→R5 should be DELIVERED."""
    packets = simulator.send_packets("R1", "R5", count=10)
    assert all(p.status == PacketStatus.DELIVERED for p in packets), \
        [p.drop_reason for p in packets if p.status != PacketStatus.DELIVERED]


def test_delivered_packets_have_correct_endpoints(simulator):
    """Every delivered packet must start at R1 and end at R5."""
    packets = simulator.send_packets("R1", "R5", count=5)
    for p in packets:
        assert p.source == "R1"
        assert p.dest == "R5"
        if p.status == PacketStatus.DELIVERED:
            assert p.route[0] == "R1"
            assert p.route[-1] == "R5"


# ---------------------------------------------------------------------------
# Test: packets dropped when route is unavailable
# ---------------------------------------------------------------------------

def test_packets_dropped_when_no_route(network, failure, simulator):
    """After isolating R5, all packets to R5 must be DROPPED."""
    failure.fail_link("L5")   # R3-R5
    failure.fail_link("L6")   # R4-R5
    packets = simulator.send_packets("R1", "R5", count=5)
    assert all(p.status == PacketStatus.DROPPED for p in packets)
    for p in packets:
        assert p.drop_reason is not None and p.drop_reason != ""


def test_packets_dropped_have_drop_reason(network, failure, simulator):
    """Dropped packets must always include a non-empty drop_reason."""
    failure.fail_router("R1")   # Source goes down
    packets = simulator.send_packets("R1", "R5", count=3)
    assert all(p.status == PacketStatus.DROPPED for p in packets)
    assert all(p.drop_reason for p in packets)


# ---------------------------------------------------------------------------
# Test: packet count matches requested
# ---------------------------------------------------------------------------

def test_packet_count_matches_requested(simulator):
    """send_packets must return exactly the requested number of packets."""
    for count in [1, 5, 20, 50]:
        simulator.reset()
        packets = simulator.send_packets("R1", "R5", count=count)
        assert len(packets) == count


def test_get_packets_accumulates(simulator):
    """get_packets() should accumulate packets across multiple send calls."""
    simulator.send_packets("R1", "R5", count=5)
    simulator.send_packets("R1", "R5", count=5)
    all_packets = simulator.get_packets()
    assert len(all_packets) == 10


def test_reset_clears_packets(simulator):
    """reset() should leave the packet list empty."""
    simulator.send_packets("R1", "R5", count=5)
    simulator.reset()
    assert len(simulator.get_packets()) == 0


# ---------------------------------------------------------------------------
# Test: metrics delivery_ratio correct
# ---------------------------------------------------------------------------

def test_metrics_delivery_ratio_all_delivered(simulator, metrics, network):
    """delivery_ratio should be 1.0 when all packets are delivered."""
    packets = simulator.send_packets("R1", "R5", count=10)
    events = network.get_events()
    failures = {"failed_links": 0, "failed_routers": 0, "recovery_time_ms": 0.0}
    m = metrics.compute(packets, events, failures)
    assert m.packets_sent == 10
    assert m.packets_delivered == 10
    assert m.packets_dropped == 0
    assert m.delivery_ratio == 1.0


def test_metrics_delivery_ratio_all_dropped(network, failure, simulator, metrics):
    """delivery_ratio should be 0.0 when all packets are dropped."""
    failure.fail_link("L5")
    failure.fail_link("L6")
    packets = simulator.send_packets("R1", "R5", count=10)
    events = network.get_events()
    failures_dict = {
        "failed_links": network.get_failed_link_count(),
        "failed_routers": network.get_failed_router_count(),
        "recovery_time_ms": 0.0,
    }
    m = metrics.compute(packets, events, failures_dict)
    assert m.packets_sent == 10
    assert m.packets_delivered == 0
    assert m.packets_dropped == 10
    assert m.delivery_ratio == 0.0


def test_metrics_delivery_ratio_partial(network, failure, simulator, metrics):
    """delivery_ratio should be between 0 and 1 for mixed results."""
    # Send 10 packets successfully, then break and send 10 more
    good_packets = simulator.send_packets("R1", "R5", count=10)
    failure.fail_link("L5")
    failure.fail_link("L6")
    bad_packets = simulator.send_packets("R1", "R5", count=10)
    all_packets = good_packets + bad_packets
    events = network.get_events()
    failures_dict = {
        "failed_links": network.get_failed_link_count(),
        "failed_routers": network.get_failed_router_count(),
        "recovery_time_ms": 0.0,
    }
    m = metrics.compute(all_packets, events, failures_dict)
    assert m.packets_sent == 20
    assert 0.0 < m.delivery_ratio < 1.0


def test_metrics_failed_counts(network, failure, simulator, metrics):
    """failed_links and failed_routers must reflect actual failure state."""
    failure.fail_link("L1")
    failure.fail_router("R5")
    packets = []
    events = network.get_events()
    failures_dict = {
        "failed_links": network.get_failed_link_count(),
        "failed_routers": network.get_failed_router_count(),
        "recovery_time_ms": 5.0,
    }
    m = metrics.compute(packets, events, failures_dict)
    # L1 failed + the links adjacent to R5 that got marked DOWN
    assert m.failed_links >= 1
    assert m.failed_routers == 1
    assert m.recovery_time_ms == 5.0
