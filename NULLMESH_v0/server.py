import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import os
from typing import Optional

from api import run_cdt, explain_break, repair_report
from engine import (
    IntentContract, killer_demo_contracts, killer_invariants,
    exclusive_resource_ownership, resource_of_claim, reserve_once
)
from scenarios import late_scenario, reserve_collision

app = FastAPI()

# --- Pydantic Models for Dynamic Payloads ---

class ContractModel(BaseModel):
    agent: str
    schedule: dict[int, list[str]]

class DynamicRunRequest(BaseModel):
    scenario: Optional[str] = None
    contracts: Optional[list[ContractModel]] = None
    invariants: Optional[list[str]] = None
    t0: Optional[int] = 0
    t_end: Optional[int] = 30

class DynamicRepairRequest(DynamicRunRequest):
    h_target: Optional[int] = 30
    fallback_time: Optional[int] = 12

# --- Invariant Registry ---
INVARIANT_REGISTRY = {
    "INV-003": exclusive_resource_ownership(resource_of_claim),
    "INV-007": reserve_once(),
}

def _parse_dynamic_payload(req: DynamicRunRequest):
    contracts = []
    for c in req.contracts:
        schedule = {t: frozenset(actions) for t, actions in c.schedule.items()}
        contracts.append(IntentContract(c.agent, schedule))
    
    invariants = []
    if req.invariants:
        for inv_id in req.invariants:
            if inv_id in INVARIANT_REGISTRY:
                invariants.append(INVARIANT_REGISTRY[inv_id])
            else:
                raise HTTPException(status_code=400, detail=f"Unknown invariant ID: {inv_id}")
    return contracts, invariants, req.t0, req.t_end

@app.post("/api/run")
def api_run(req: DynamicRunRequest):
    if req.contracts is not None:
        # Use dynamic JSON payload
        contracts, invariants, t0, t_end = _parse_dynamic_payload(req)
    else:
        # Fallback to hardcoded scenarios
        if req.scenario == "killer_demo" or req.scenario == "h12":
            contracts = killer_demo_contracts()
            invariants = killer_invariants()
            t0, t_end = 0, 30
        elif req.scenario == "h20":
            contracts = late_scenario().contracts
            invariants = killer_invariants()
            t0, t_end = 0, 30
        elif req.scenario == "reserve_collision":
            contracts = reserve_collision().contracts
            invariants = killer_invariants() + [reserve_once()]
            t0, t_end = 0, 30
        else:
            raise HTTPException(status_code=400, detail="Unknown scenario")
    
    result = run_cdt(contracts, invariants, t0, t_end)
    explanation = explain_break(result)
    
    return {
        "result": result,
        "explanation": explanation
    }

@app.post("/api/repair")
def api_repair(req: DynamicRepairRequest):
    if req.contracts is not None:
        contracts, invariants, t0, t_end = _parse_dynamic_payload(req)
        h_target = req.h_target
        fallback_time = req.fallback_time
    else:
        if req.scenario == "killer_demo":
            contracts = killer_demo_contracts()
            invariants = killer_invariants()
            t0, t_end, h_target, fallback_time = 0, 30, 30, 12
        elif req.scenario == "h20":
            contracts = late_scenario().contracts
            invariants = killer_invariants()
            t0, t_end, h_target, fallback_time = 0, 30, 30, 20
        elif req.scenario == "reserve_collision":
            contracts = reserve_collision().contracts
            invariants = killer_invariants() + [reserve_once()]
            t0, t_end, h_target, fallback_time = 0, 30, 30, 8
        else:
            raise HTTPException(status_code=400, detail="Repair not configured for this scenario in this demo")
        
    try:
        report = repair_report(contracts, invariants, t0, t_end, h_target, fallback_time=fallback_time)
        return report
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# Mount static files
os.makedirs("web", exist_ok=True)
app.mount("/", StaticFiles(directory="web", html=True), name="web")

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8080, reload=True)
