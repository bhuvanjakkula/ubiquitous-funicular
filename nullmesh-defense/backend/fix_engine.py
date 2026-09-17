import os
import shutil

src = "../../NULLMESH_v0/engine.py"
dst = "engine.py"

with open(src, "r") as f:
    content = f.read()

# Add is_adversary to IntentContract
content = content.replace(
"""@dataclass(frozen=True)
class IntentContract:
    agent: AgentId
    schedule: dict[int, FrozenSet[Action]]""",
"""@dataclass(frozen=True)
class IntentContract:
    agent: AgentId
    schedule: dict[int, FrozenSet[Action]]
    is_adversary: bool = False"""
)

# Update mutable list comprehension
content = content.replace(
    "mutable = [c for c in contracts if fallback_time in c.schedule]",
    "mutable = [c for c in contracts if fallback_time in c.schedule and not c.is_adversary]"
)

# Add new invariants before killer_demo_contracts
inv_block = """def capacity_limit(resource_of: Callable[[Action], Optional[str]], max_agents: int) -> Invariant:
    def holds(w: JointWorld) -> bool:
        claimed: dict[str, int] = {}
        for agent, action in w.assignment:
            res = resource_of(action)
            if res is None:
                continue
            claimed[res] = claimed.get(res, 0) + 1
            if claimed[res] > max_agents:
                return False
        return True
    return Invariant("INV-008", f"capacity limit {max_agents}", holds)


def co_requisite_action(primary_action: Action, required_action: Action) -> Invariant:
    def holds(w: JointWorld) -> bool:
        has_primary = False
        has_required = False
        for agent, action in w.assignment:
            if action == primary_action:
                has_primary = True
            if action == required_action:
                has_required = True
        
        if has_primary and not has_required:
            return False
        return True
    return Invariant("INV-009", f"co-requisite {required_action} for {primary_action}", holds)


def killer_demo_contracts"""

content = content.replace("def killer_demo_contracts", inv_block)

with open(dst, "w") as f:
    f.write(content)

print("engine.py fixed successfully.")
