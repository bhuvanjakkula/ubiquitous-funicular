from engine import NullMeshEngine, IntentContract, Invariant, History, AgentId
from typing import List, Dict

def infer_intent(
    contracts: List[IntentContract], 
    invariants: List[Invariant], 
    target_agent: AgentId,
    t0: int, 
    t_end: int
) -> dict:
    """
    Inverse CDT: Given a set of contracts (where the target_agent has been 
    restricted at t_obs to match our observation), run the engine and find 
    all mathematically valid histories (histories where invariants are never violated).
    Then, for the target_agent, find which actions they are FORCED to take 
    in the future across all valid histories.
    """
    engine = NullMeshEngine(contracts, invariants)
    result = engine.run(t0, t_end, break_early=False)
    
    final_report = result.reports[-1]
    
    valid_histories = []
    for h in final_report.histories:
        ok = True
        for inv in invariants:
            if not inv.holds(h):
                ok = False
                break
        if ok:
            valid_histories.append(h)
            
    if not valid_histories:
        return {"error": "No valid enemy intent satisfies known doctrine (Observation is anomalous)"}
        
    deduced_schedule = {}
    for t_idx, t in enumerate(range(t0, t_end + 1)):
        possible_actions = set()
        for h in valid_histories:
            w = h[t_idx]
            for agent, action in w.assignment:
                if agent == target_agent:
                    possible_actions.add(action)
        
        deduced_schedule[t] = sorted(list(possible_actions))
        
    confidence_schedule = {}
    for t, actions in deduced_schedule.items():
        if len(actions) == 1:
            confidence_schedule[t] = {"actions": actions, "confidence": 1.0}
        else:
            confidence_schedule[t] = {"actions": actions, "confidence": 1.0 / len(actions)}
            
    return {
        "target_agent": target_agent,
        "valid_timelines_found": len(valid_histories),
        "inferred_schedule": confidence_schedule
    }
