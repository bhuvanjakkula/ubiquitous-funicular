import asyncio
import time
import random

class MeshEngine:
    def __init__(self):
        self.scenario = "soldiers"
        self.base_node_count = 15
        self.nodes_disrupted = False
        self.test_active = False
        self.recovery_start_time = 0
        self.nodes = [
            {'id': 'cmd', 'label': 'Command', 'x': '12%', 'y': '50%', 'status': 'trusted', 'icon': 'ShieldAlert'},
            {'id': 'a', 'label': 'Node A', 'x': '30%', 'y': '50%', 'status': 'trusted', 'icon': 'Network'},
            {'id': 'b', 'label': 'Node B (Relay)', 'x': '55%', 'y': '25%', 'status': 'trusted', 'icon': 'Activity'},
            {'id': 'd', 'label': 'Node D (Backup)', 'x': '55%', 'y': '75%', 'status': 'standby', 'icon': 'Radio'},
            {'id': 'c', 'label': 'Node C', 'x': '78%', 'y': '50%', 'status': 'trusted', 'icon': 'Network'},
            {'id': 'recon', 'label': 'Recon Unit', 'x': '92%', 'y': '50%', 'status': 'trusted', 'icon': 'Search'},
            {'id': 'rogue', 'label': 'Unknown Emitter', 'x': '30%', 'y': '15%', 'status': 'unauthorized', 'icon': 'Zap'}
        ]
        
        self.edges = [
            {'id': 'cmd-a', 'source': 'cmd', 'target': 'a', 'base_lat': 8, 'bw': '10G'},
            {'id': 'a-b', 'source': 'a', 'target': 'b', 'base_lat': 12, 'bw': '10G'},
            {'id': 'b-c', 'source': 'b', 'target': 'c', 'base_lat': 9, 'bw': '10G'},
            {'id': 'a-d', 'source': 'a', 'target': 'd', 'base_lat': 14, 'bw': '2.1G'},
            {'id': 'd-c', 'source': 'd', 'target': 'c', 'base_lat': 10, 'bw': '2.1G'},
            {'id': 'c-recon', 'source': 'c', 'target': 'recon', 'base_lat': 14, 'bw': '10G'},
            {'id': 'rogue-a', 'source': 'rogue', 'target': 'a', 'base_lat': 999, 'bw': '0G'}
        ]

    def set_scenario(self, scenario: str):
        self.scenario = scenario
        scenarios = {
            'soldiers': 15, 'border_posts': 85, 'disaster': 340, 
            'vehicles': 45, 'uavs': 120, 'sensors': 5400, 
            'command': 1250, 'naval': 220, 'cyber': 8900
        }
        self.base_node_count = scenarios.get(scenario, 15)
        # Reset state on scenario change
        self.test_active = False
        self.nodes_disrupted = False

    def trigger_stress_test(self):
        self.test_active = True
        self.nodes_disrupted = False
        self.recovery_start_time = time.time()

    def get_state(self):
        current_time = time.time()
        
        # Calculate routing states
        if self.test_active and not self.nodes_disrupted:
            # During "DISRUPTING..."
            if current_time - self.recovery_start_time > 1.5:
                # Transition to healed
                self.nodes_disrupted = True
        
        # Determine Graph State
        nodes_out = []
        for n in self.nodes:
            node_out = dict(n)
            if n['id'] == 'b':
                if self.test_active:
                    node_out['status'] = 'offline'
                    node_out['label'] = 'Node B (Lost)'
            if n['id'] == 'd':
                if self.nodes_disrupted:
                    node_out['status'] = 'trusted'
                    node_out['label'] = 'Node D (Active)'
            nodes_out.append(node_out)

        links_out = []
        for e in self.edges:
            link = dict(e)
            if e['id'] == 'rogue-a':
                link['status'] = 'blocked'
                link['latency'] = 'AUTH_FAIL'
                link['bw'] = '0G'
                links_out.append(link)
                continue

            if self.test_active and not self.nodes_disrupted:
                # Disruption Phase
                if 'b' in e['id']:
                    link['status'] = 'offline'
                    link['latency'] = 'ERR'
                    link['bw'] = '0G'
                elif 'd' in e['id']:
                    link['status'] = 'routing'
                    link['latency'] = 'CALC'
                    link['bw'] = '...'
                else:
                    link['status'] = 'active'
                    link['latency'] = f"{e['base_lat'] + random.randint(0,2)}ms"
            elif self.nodes_disrupted:
                # Healed Phase
                if 'b' in e['id']:
                    link['status'] = 'offline'
                    link['latency'] = 'ERR'
                    link['bw'] = '0G'
                elif 'd' in e['id']:
                    link['status'] = 'active'
                    link['latency'] = f"{e['base_lat'] + random.randint(0,4)}ms"
                else:
                    link['status'] = 'active'
                    link['latency'] = f"{e['base_lat'] + random.randint(0,2)}ms"
            else:
                # Normal
                if 'b' in e['id'] or e['id'] in ['cmd-a', 'c-recon']:
                    link['status'] = 'active'
                    link['latency'] = f"{e['base_lat'] + random.randint(0,2)}ms"
                elif 'd' in e['id']:
                    link['status'] = 'standby'
                    link['latency'] = '--'
                    link['bw'] = '--'
            links_out.append(link)

        # Global Telemetry
        node_count = self.base_node_count + random.randint(-2, 3)
        global_lat = 12 + random.randint(0, 4)
        packet_loss = 0
        recovery_time = "<50ms Sub-second Healing"

        if self.test_active and not self.nodes_disrupted:
            global_lat = 142
            packet_loss = 4.2
            node_count = int(self.base_node_count * 0.4)
            recovery_time = "CALCULATING..."
        elif self.nodes_disrupted:
            global_lat = 18
            node_count = int(self.base_node_count * 2.5)
            recovery_time = "<50ms (Healed)"

        return {
            "type": "MESH_STATE",
            "nodes": nodes_out,
            "links": links_out,
            "telemetry": {
                "nodeCount": node_count,
                "latency": global_lat,
                "packetLoss": packet_loss,
                "recoveryTime": recovery_time,
                "nodesDisrupted": self.nodes_disrupted,
                "testActive": self.test_active
            }
        }
