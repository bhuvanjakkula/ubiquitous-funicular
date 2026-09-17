#!/usr/bin/env python3
"""Possibility-set scenarios for coherence horizons and independent invariants."""

from dataclasses import dataclass

from engine import (
    IntentContract,
    killer_demo_contracts,
    killer_invariants,
    resource_of_claim,
    reserve_once,
)


@dataclass
class Scenario:
    name: str
    fallback_time: int
    contracts: list[IntentContract]


def late_scenario() -> Scenario:
    """Keep the demo choices, delaying cross-claims until t=20."""
    contracts = [
        c.with_schedule({20 if t == 12 else t: actions for t, actions in c.schedule.items()})
        for c in killer_demo_contracts()
    ]
    return Scenario("H20", 20, contracts)


def early_scenario() -> Scenario:
    return Scenario("H12", 12, killer_demo_contracts())


def reserve_collision() -> Scenario:
    return Scenario("reserve_collision", 8, [
        IntentContract("A", {0: frozenset({"idle"}),
                             8: frozenset({"reserve:fuel"})}),
        IntentContract("B", {0: frozenset({"idle"}),
                             8: frozenset({"idle"})}),
        IntentContract("C", {0: frozenset({"idle"})}),
    ])


def uav_swarm() -> Scenario:
    # 4 UAVs. Capacity of airspace sector:7 is 2. 
    # At t=15, 3 UAVs might try to enter sector:7, violating capacity_limit.
    return Scenario("uav_swarm", 15, [
        IntentContract("UAV-1", {0: frozenset({"fly:sector:1"}), 15: frozenset({"fly:sector:7"})}),
        IntentContract("UAV-2", {0: frozenset({"fly:sector:2"}), 15: frozenset({"fly:sector:7"})}),
        IntentContract("UAV-3", {0: frozenset({"fly:sector:3"}), 15: frozenset({"fly:sector:8"})}),
        IntentContract("UAV-4", {0: frozenset({"fly:sector:4"}), 15: frozenset({"fly:sector:9"})}),
    ])


def evacuation() -> Scenario:
    # Ground units evacuating. Ground-1 wants to board:helo-A, but board requires helo-A to be in land:helo-A state.
    # At t=10, Helo might idle instead of landing, violating co_requisite.
    return Scenario("evacuation", 10, [
        IntentContract("Ground-1", {0: frozenset({"hold"}), 10: frozenset({"board:helo-A"})}),
        IntentContract("Ground-2", {0: frozenset({"hold"}), 10: frozenset({"board:helo-A"})}),
        IntentContract("Helo-A", {0: frozenset({"orbit"}), 10: frozenset({"land:helo-A"})}),
    ])


def mdo_scenario() -> Scenario:
    # Multi-Domain Operations
    # Friendly Bomber wants to strike. Friendly Jammer wants to support.
    # Enemy SAM is an adversary that can unpredictably track or idle.
    return Scenario("mdo", 14, [
        IntentContract("Friendly-Bomber", {0: frozenset({"fly:stealth"}), 14: frozenset({"strike:target"})}, is_adversary=False),
        IntentContract("Friendly-Jammer", {0: frozenset({"orbit"}), 14: frozenset({"jam:comms"})}, is_adversary=False),
        IntentContract("Enemy-SAM", {0: frozenset({"idle"}), 14: frozenset({"idle", "track:radar"}), 15: frozenset({"idle"})}, is_adversary=True),
    ])


def kill_web_scenario() -> Scenario:
    # Space -> Cyber -> Sea kill web.
    # The enemy can disrupt communications at t=18. 
    # If the enemy jams at t=18, Cyber-Primary might drop 'process:data', which means it won't happen before Sea fires.
    return Scenario("kill_web", 18, [
        IntentContract("Space-Sensor", {0: frozenset({"orbit"}), 10: frozenset({"detect:target"}), 11: frozenset({"orbit"})}, is_adversary=False),
        IntentContract("Cyber-Primary", {0: frozenset({"listen"}), 18: frozenset({"process:data"}), 19: frozenset({"listen"})}, is_adversary=False),
        IntentContract("Sea-Shooter", {0: frozenset({"patrol"}), 25: frozenset({"fire:interceptor"}), 26: frozenset({"patrol"})}, is_adversary=False),
        IntentContract("Enemy-Jammer", {0: frozenset({"idle"}), 18: frozenset({"jam:satcom", "idle"}), 19: frozenset({"idle"})}, is_adversary=True),
    ])


def a2ad_scenario() -> Scenario:
    # A2/AD intelligence scenario. Enemy-Commander is the target agent for inference.
    # At t=0, idle. 
    # At t=5, we OBSERVED activate:radar. We restrict their contract to this.
    # At t=10 and t=15, they have choices (deploy, fire, or idle). 
    # The doctrine invariant will force them to deploy and fire.
    return Scenario("a2ad_inference", 0, [
        IntentContract("Enemy-Commander", {
            0: frozenset({"idle"}),
            5: frozenset({"activate:radar"}), # Observation
            6: frozenset({"idle"}),
            10: frozenset({"deploy:missiles", "idle"}),
            11: frozenset({"idle"}),
            15: frozenset({"fire:missiles", "idle"}),
            16: frozenset({"idle"})
        }, is_adversary=True),
        IntentContract("Friendly-Recon", {
            0: frozenset({"patrol"})
        }, is_adversary=False)
    ])


def swarm_healing_scenario() -> Scenario:
    return Scenario("swarm", 10, [
        IntentContract("Drone-A", {0: frozenset({"lead:swarm"}), 10: frozenset({"offline"})}, is_adversary=False),
        IntentContract("Drone-B", {0: frozenset({"follow:swarm"}), 10: frozenset({"lead:swarm"})}, is_adversary=False),
        IntentContract("Drone-C", {0: frozenset({"follow:swarm"}), 10: frozenset({"follow:swarm"})}, is_adversary=False),
        IntentContract("Enemy-EMP", {0: frozenset({"idle"}), 10: frozenset({"emp:strike"})}, is_adversary=True),
    ])


def ghost_fleet_scenario() -> Scenario:
    return Scenario("ew_ghost", 10, [
        IntentContract("Carrier", {0: frozenset({"emit:radar"}), 10: frozenset({"hide:emissions"})}, is_adversary=False),
        IntentContract("Decoy-Drone", {0: frozenset({"idle"}), 10: frozenset({"emit:spoof"})}, is_adversary=False),
        IntentContract("Enemy-Hypersonic", {0: frozenset({"idle"}), 10: frozenset({"seek:emissions"})}, is_adversary=True),
    ])


def contested_logistics_scenario() -> Scenario:
    return Scenario("logistics", 15, [
        IntentContract("Fighter-Jet", {0: frozenset({"fly:patrol"}), 15: frozenset({"fly:combat"})}, is_adversary=False),
        IntentContract("Tanker-Primary", {0: frozenset({"idle"}), 15: frozenset({"destroyed"})}, is_adversary=False),
        IntentContract("Tanker-Backup", {0: frozenset({"idle"}), 15: frozenset({"refuel:jet"})}, is_adversary=False),
        IntentContract("Enemy-SAM", {0: frozenset({"idle"}), 15: frozenset({"destroy:tanker"})}, is_adversary=True),
    ])


def qkd_mesh_scenario() -> Scenario:
    return Scenario("qkd_mesh", 10, [
        IntentContract("Satellite-QKD", {0: frozenset({"orbit"}), 10: frozenset({"emit:qubits"})}, is_adversary=False),
        IntentContract("Ground-Command", {0: frozenset({"standby"}), 10: frozenset({"receive:qubits"})}, is_adversary=False),
        IntentContract("Enemy-Listener", {0: frozenset({"idle"}), 10: frozenset({"idle"})}, is_adversary=True),
    ])


def functional_redundancy_scenario() -> Scenario:
    return Scenario("redundancy", 15, [
        IntentContract("SATCOM-Link", {0: frozenset({"relay:satcom"}), 15: frozenset({"relay:satcom"})}, is_adversary=False),
        IntentContract("Terrestrial-Backhaul", {0: frozenset({"relay:terrestrial"}), 15: frozenset({"relay:terrestrial"})}, is_adversary=False),
    ])


def zero_trust_edge_scenario() -> Scenario:
    return Scenario("zero_trust", 12, [
        IntentContract("FPGA-Node-1", {0: frozenset({"monitor:edge"}), 12: frozenset({"monitor:edge"})}, is_adversary=False),
        IntentContract("Enemy-Cyber", {0: frozenset({"idle"}), 12: frozenset({"idle", "sever:cloud_link"}), 13: frozenset({"idle"})}, is_adversary=True),
    ])


def microsegmentation_scenario() -> Scenario:
    return Scenario("microsegmentation", 10, [
        IntentContract("Auth-Service", {0: frozenset({"authenticate"}), 10: frozenset({"authenticate"})}, is_adversary=False),
        IntentContract("5G-Slice-Admin", {0: frozenset({"manage:slice"}), 10: frozenset({"manage:slice"})}, is_adversary=False),
        IntentContract("Insider-Threat", {0: frozenset({"idle"}), 10: frozenset({"idle", "ddos:auth"}), 11: frozenset({"idle"})}, is_adversary=True),
    ])


def topology_optimization_scenario() -> Scenario:
    return Scenario("topology_optimization", 15, [
        IntentContract("Node-A", {0: frozenset({"route:data"}), 15: frozenset({"route:data"})}, is_adversary=False),
        IntentContract("Node-B", {0: frozenset({"route:data"}), 15: frozenset({"route:data"})}, is_adversary=False),
        IntentContract("Node-C", {0: frozenset({"route:data"}), 15: frozenset({"route:data"})}, is_adversary=False),
        IntentContract("Enemy-DDoS", {0: frozenset({"idle"}), 15: frozenset({"idle", "attack:node"}), 16: frozenset({"idle"})}, is_adversary=True),
    ])


def sdn_scenario() -> Scenario:
    return Scenario("sdn_reroute", 12, [
        IntentContract("SDN-Controller", {0: frozenset({"monitor:net"}), 12: frozenset({"update:flow"})}, is_adversary=False),
        IntentContract("Router-Primary", {0: frozenset({"forward:data"}), 12: frozenset({"forward:data", "drop:data"})}, is_adversary=False),
        IntentContract("Enemy-Disruption", {0: frozenset({"idle"}), 12: frozenset({"idle", "attack:link"}), 13: frozenset({"idle"})}, is_adversary=True),
    ])


def reserve_collision_test() -> None:
    scenario = reserve_collision()
    ownership = killer_invariants()[0]
    reserve = reserve_once()
    result = run_cdt(scenario.contracts, [ownership, reserve], 0, 30)
    assert result["t_star"] == 8 and result["horizon"] == 8
    assert result["first_violated"] == ["INV-007"]
    assert result["ticks"][7]["guaranteed"]
    assert not result["ticks"][8]["guaranteed"]
    assert result["cause_world"] == {
        "A": "reserve:fuel", "B": "reserve:fuel", "C": "idle"
    }
    assert all("INV-003" not in tick["violated"] for tick in result["ticks"])
    ownership_result = run_cdt(scenario.contracts, [ownership], 0, 30)
    assert all(tick["guaranteed"] for tick in ownership_result["ticks"])
    for contract in scenario.contracts:
        for actions in contract.schedule.values():
            assert all(isinstance(action, str) for action in actions)
    print("reserve_collision | t*=8 | H=8 | INV-007 fails | INV-003 holds")


def category_test() -> None:
    # Same tracker quality and same world-cardinality pattern; only fallback time
    # changes; CDT / H change. That is the category witness.
    scenarios = [early_scenario(), late_scenario()]
    invariants = killer_invariants()
    results = []
    rows = []
    assert [inv.id for inv in invariants] == ["INV-003"]

    for scenario in scenarios:
        contracts = scenario.contracts
        assert len(contracts) == 3
        assert {c.agent for c in contracts} == {"A", "B", "C"}
        resources = {
            resource_of_claim(action)
            for c in contracts
            for actions in c.schedule.values()
            for action in actions
            if resource_of_claim(action) is not None
        }
        assert resources == {"alpha", "bravo"}
        for t in range(scenario.fallback_time):
            assert all(len(c.admissible_at(t)) == 1 for c in contracts)

        result = run_cdt(contracts, invariants, 0, 30)
        results.append(result)
        assert result["t_star"] == scenario.fallback_time
        assert result["horizon"] == scenario.fallback_time
        assert result["first_violated"] == ["INV-003"]
        before = result["ticks"][scenario.fallback_time - 1]
        after = result["ticks"][scenario.fallback_time]
        assert before["world_count"] == 1
        assert after["world_count"] == 4
        assert before["guaranteed"] and not after["guaranteed"]
        for tick in result["ticks"]:
            is_before = tick["t"] < scenario.fallback_time
            assert tick["world_count"] == (1 if is_before else 4)
            assert tick["guaranteed"] == is_before
            assert {c.agent: len(c.admissible_at(tick["t"])) for c in contracts} == (
                {"A": 1, "B": 1, "C": 1} if is_before
                else {"A": 2, "B": 2, "C": 1}
            )

        # All admissible actions retain exact labels, including after fallback.
        for contract in contracts:
            for actions in contract.schedule.values():
                assert all(isinstance(action, str) for action in actions)
        assert set(result["cause_world"]) == {"A", "B", "C"}

        rows.append((scenario.name, result["t_star"], result["horizon"],
                     before["world_count"], after["world_count"],
                     before["guaranteed"], after["guaranteed"]))

    assert results[0]["t_star"] != results[1]["t_star"]
    print("name | t_star | H | worlds_before | worlds_after | guaranteed_before | guaranteed_after")
    for row in rows:
        print(" | ".join(str(value) for value in row))


if __name__ == "__main__":
    category_test()
    reserve_collision_test()
