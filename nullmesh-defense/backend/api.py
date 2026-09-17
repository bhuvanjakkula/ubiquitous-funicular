from pydantic import BaseModel
from typing import Optional, List, Dict
from engine import (
    IntentContract, Invariant, NullMeshEngine,
    killer_demo_contracts, killer_invariants,
    repair_cost_search, reserve_once,
    capacity_limit, co_requisite_action, resource_of_claim, sequential_dependency,
    doctrine_must_complete, exactly_one_leader, emission_safebound, supply_chain_integrity,
    quantum_entanglement_integrity, functional_redundancy_integrity, zero_trust_isolation,
    continuous_authentication, partial_mesh_resilience, sdn_rerouting_integrity
)
from scenarios import (
    late_scenario, reserve_collision, uav_swarm, evacuation, 
    mdo_scenario, kill_web_scenario, a2ad_scenario,
    swarm_healing_scenario, ghost_fleet_scenario, contested_logistics_scenario,
    qkd_mesh_scenario, functional_redundancy_scenario, zero_trust_edge_scenario,
    microsegmentation_scenario, topology_optimization_scenario, sdn_scenario
)
from inference import infer_intent

# API schemas for requests
class ContractRequest(BaseModel):
    agent: str
    schedule: Dict[int, List[str]]

class CDTRequest(BaseModel):
    scenario: Optional[str] = "killer"
    contracts: Optional[List[ContractRequest]] = None
    t0: int = 0
    t_end: int = 30
    fallback_time: int = 12

def _parse_dynamic(req: CDTRequest) -> tuple[List[IntentContract], List[Invariant], int, int, int]:
    # Custom payload support if contracts are provided
    if req.contracts:
        out = []
        for c in req.contracts:
            sched = {int(k): frozenset(v) for k, v in c.schedule.items()}
            out.append(IntentContract(c.agent, sched))
        return out, killer_invariants(), req.t0, req.t_end, req.fallback_time

    # Default to predefined scenarios
    if req.scenario == "late":
        s = late_scenario()
        return s.contracts, killer_invariants(), 0, 30, s.fallback_time
    elif req.scenario == "reserve":
        s = reserve_collision()
        return s.contracts, killer_invariants() + [reserve_once()], 0, 30, s.fallback_time
    elif req.scenario == "uav_swarm":
        s = uav_swarm()
        # UAVs use "fly:" but we can define a quick local parser for capacity
        def resource_of_fly(a: str): return a.split(":", 1)[1] if a.startswith("fly:") else None
        return s.contracts, [capacity_limit(resource_of_fly, 2)], 0, 30, s.fallback_time
    elif req.scenario == "evacuation":
        s = evacuation()
        return s.contracts, [co_requisite_action("board:helo-A", "land:helo-A")], 0, 30, s.fallback_time
    elif req.scenario == "mdo":
        s = mdo_scenario()
        return s.contracts, [co_requisite_action("track:radar", "jam:comms")], 0, 30, s.fallback_time
    elif req.scenario == "kill_web":
        s = kill_web_scenario()
        return s.contracts, [sequential_dependency("detect:target", "process:data", "fire:interceptor")], 0, 30, s.fallback_time
    elif req.scenario == "swarm":
        s = swarm_healing_scenario()
        return s.contracts, [exactly_one_leader(["Drone-A", "Drone-B", "Drone-C"], "lead:swarm")], 0, 11, s.fallback_time
    elif req.scenario == "ew_ghost":
        s = ghost_fleet_scenario()
        return s.contracts, [emission_safebound("Carrier", "hide:emissions", "Decoy-Drone", "emit:spoof")], 0, 11, s.fallback_time
    elif req.scenario == "logistics":
        s = contested_logistics_scenario()
        return s.contracts, [supply_chain_integrity("fly:combat", "refuel:jet")], 0, 16, s.fallback_time
    elif req.scenario == "qkd":
        s = qkd_mesh_scenario()
        return s.contracts, [quantum_entanglement_integrity("emit:qubits", "receive:qubits", "measure:channel")], 0, 15, s.fallback_time
    elif req.scenario == "redundancy":
        s = functional_redundancy_scenario()
        return s.contracts, [functional_redundancy_integrity(1, ["relay:satcom", "relay:terrestrial"])], 0, 20, s.fallback_time
    elif req.scenario == "zero_trust":
        s = zero_trust_edge_scenario()
        return s.contracts, [zero_trust_isolation("stream:cloud", "sever:cloud_link")], 0, 15, s.fallback_time
    elif req.scenario == "microsegmentation":
        s = microsegmentation_scenario()
        return s.contracts, [continuous_authentication("authenticate", "manage:slice")], 0, 15, s.fallback_time
    elif req.scenario == "topology":
        s = topology_optimization_scenario()
        return s.contracts, [partial_mesh_resilience(2, ["Node-A", "Node-B", "Node-C"], "route:data")], 0, 20, s.fallback_time
    elif req.scenario == "sdn":
        s = sdn_scenario()
        return s.contracts, [sdn_rerouting_integrity("update:flow", "attack:link")], 0, 15, s.fallback_time
    else:
        # killer
        return killer_demo_contracts(), killer_invariants(), 0, 30, 12


def run_analysis(req: CDTRequest) -> dict:
    contracts, invariants, t0, t_end, _ = _parse_dynamic(req)
    
    result = NullMeshEngine(contracts, invariants).run(t0, t_end)
    
    ticks_data = []
    for r in result.reports:
        if r.t == result.t_star and result.cause_world:
            actions = [f"{ag} chose [{act}]" for ag, act in result.cause_world.as_dict().items()]
        else:
            actions = []
            for c in contracts:
                try:
                    acts = list(c.admissible_at(r.t))
                    if len(acts) == 1:
                        actions.append(f"{c.agent} chose [{acts[0]}]")
                    else:
                        actions.append(f"{c.agent} diverging: {acts}")
                except Exception:
                    pass
                    
        ticks_data.append({
            "t": r.t,
            "world_count": len(r.world_set),
            "guaranteed": r.guaranteed,
            "violated": list(r.violated_invariants),
            "horizon_open": r.horizon_open,
            "actions": actions
        })
        
    return {
        "t0": result.t0,
        "t_star": result.t_star,
        "horizon": result.horizon,
        "first_violated": list(result.first_violated),
        "cause_world": result.cause_world.as_dict() if result.cause_world else None,
        "ticks": ticks_data
    }

def find_repair(req: CDTRequest) -> dict:
    contracts, invariants, t0, t_end, fallback_time = _parse_dynamic(req)
    
    repair = repair_cost_search(
        contracts=contracts,
        invariants=invariants,
        t0=t0,
        t_end=t_end,
        h_target=t_end,
        fallback_time=fallback_time
    )
    
    if not repair:
        return {"found": False}
        
    return {
        "found": True,
        "description": repair.description,
        "cost": repair.cost,
        "restored_horizon": repair.restored_horizon,
        "dropped_actions": repair.dropped_actions,
    }


class InferRequest(BaseModel):
    scenario: str
    target_agent: str

def infer_endpoint(req: InferRequest) -> dict:
    if req.scenario == "a2ad":
        s = a2ad_scenario()
        # Doctrine: If activate:radar happens, MUST deploy:missiles by 10, and MUST fire:missiles by 15.
        invariants = [
            doctrine_must_complete("activate:radar", "deploy:missiles", 10),
            doctrine_must_complete("deploy:missiles", "fire:missiles", 15)
        ]
        return infer_intent(s.contracts, invariants, req.target_agent, 0, 20)
    
    return {"error": "unknown scenario"}
