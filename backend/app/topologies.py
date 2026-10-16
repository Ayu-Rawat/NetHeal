"""
Predefined network topologies for NetHeal simulation.
Each topology is a dict with keys: id, name, description, nodes, links.
"""

TOPOLOGIES = {
    "simple_star": {
        "id": "simple_star",
        "name": "Simple Star",
        "description": "A star topology with R1 as the central hub connecting to R2-R5. Includes redundant cross-links between leaf nodes.",
        "nodes": [
            {"id": "R1", "display_name": "Router 1 (Hub)", "x": 400, "y": 300},
            {"id": "R2", "display_name": "Router 2",        "x": 200, "y": 150},
            {"id": "R3", "display_name": "Router 3",        "x": 600, "y": 150},
            {"id": "R4", "display_name": "Router 4",        "x": 200, "y": 450},
            {"id": "R5", "display_name": "Router 5",        "x": 600, "y": 450},
        ],
        "links": [
            {"id": "L1", "source": "R1", "target": "R2", "cost": 1, "latency": 10},
            {"id": "L2", "source": "R1", "target": "R3", "cost": 2, "latency": 20},
            {"id": "L3", "source": "R1", "target": "R4", "cost": 1, "latency": 15},
            {"id": "L4", "source": "R2", "target": "R3", "cost": 3, "latency": 30},
            {"id": "L5", "source": "R3", "target": "R5", "cost": 2, "latency": 25},
            {"id": "L6", "source": "R4", "target": "R5", "cost": 1, "latency": 10},
        ],
    },

    "ring_network": {
        "id": "ring_network",
        "name": "Ring Network",
        "description": "Six routers connected in a ring with two additional cross-links for redundancy.",
        "nodes": [
            {"id": "R1", "display_name": "Router 1", "x": 400, "y": 100},
            {"id": "R2", "display_name": "Router 2", "x": 650, "y": 250},
            {"id": "R3", "display_name": "Router 3", "x": 650, "y": 450},
            {"id": "R4", "display_name": "Router 4", "x": 400, "y": 550},
            {"id": "R5", "display_name": "Router 5", "x": 150, "y": 450},
            {"id": "R6", "display_name": "Router 6", "x": 150, "y": 250},
        ],
        "links": [
            # Ring links
            {"id": "L1", "source": "R1", "target": "R2", "cost": 1, "latency": 10},
            {"id": "L2", "source": "R2", "target": "R3", "cost": 2, "latency": 20},
            {"id": "L3", "source": "R3", "target": "R4", "cost": 1, "latency": 10},
            {"id": "L4", "source": "R4", "target": "R5", "cost": 3, "latency": 30},
            {"id": "L5", "source": "R5", "target": "R6", "cost": 1, "latency": 10},
            {"id": "L6", "source": "R6", "target": "R1", "cost": 2, "latency": 20},
            # Cross-links
            {"id": "L7", "source": "R1", "target": "R4", "cost": 4, "latency": 40},
            {"id": "L8", "source": "R2", "target": "R5", "cost": 3, "latency": 30},
        ],
    },

    "mesh_network": {
        "id": "mesh_network",
        "name": "Mesh Network",
        "description": "An 8-node ISP-style mesh with two fully-connected clusters and multiple cross-links for high resilience.",
        "nodes": [
            # Cluster A (core routers)
            {"id": "R1", "display_name": "Core-1",  "x": 200, "y": 200},
            {"id": "R2", "display_name": "Core-2",  "x": 400, "y": 150},
            {"id": "R3", "display_name": "Core-3",  "x": 600, "y": 200},
            {"id": "R4", "display_name": "Core-4",  "x": 400, "y": 300},
            # Cluster B (edge routers)
            {"id": "R5", "display_name": "Edge-1",  "x": 200, "y": 450},
            {"id": "R6", "display_name": "Edge-2",  "x": 400, "y": 500},
            {"id": "R7", "display_name": "Edge-3",  "x": 600, "y": 450},
            {"id": "R8", "display_name": "Edge-4",  "x": 400, "y": 380},
        ],
        "links": [
            # Cluster A internal (fully connected)
            {"id": "L1",  "source": "R1", "target": "R2", "cost": 1, "latency": 8},
            {"id": "L2",  "source": "R1", "target": "R3", "cost": 3, "latency": 25},
            {"id": "L3",  "source": "R1", "target": "R4", "cost": 2, "latency": 15},
            {"id": "L4",  "source": "R2", "target": "R3", "cost": 1, "latency": 8},
            {"id": "L5",  "source": "R2", "target": "R4", "cost": 1, "latency": 10},
            {"id": "L6",  "source": "R3", "target": "R4", "cost": 2, "latency": 15},
            # Cluster B internal (fully connected)
            {"id": "L7",  "source": "R5", "target": "R6", "cost": 1, "latency": 8},
            {"id": "L8",  "source": "R5", "target": "R7", "cost": 3, "latency": 22},
            {"id": "L9",  "source": "R5", "target": "R8", "cost": 2, "latency": 12},
            {"id": "L10", "source": "R6", "target": "R7", "cost": 1, "latency": 8},
            {"id": "L11", "source": "R6", "target": "R8", "cost": 1, "latency": 10},
            {"id": "L12", "source": "R7", "target": "R8", "cost": 2, "latency": 15},
            # Cross-cluster links
            {"id": "L13", "source": "R1", "target": "R5", "cost": 4, "latency": 35},
            {"id": "L14", "source": "R2", "target": "R8", "cost": 2, "latency": 18},
            {"id": "L15", "source": "R3", "target": "R7", "cost": 3, "latency": 28},
            {"id": "L16", "source": "R4", "target": "R6", "cost": 2, "latency": 20},
        ],
    },
}

TOPOLOGY_LIST = list(TOPOLOGIES.values())
