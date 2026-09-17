import os

v1_engine = """#!/usr/bin/env python3
\"\"\"NULLMESH v1 — Temporal Consequential Divergence Time engine.

Upgraded to support Temporal Invariants (e.g. Kill Webs).
Evaluates safety across the entire history of actions.
\"\"\"

from __future__ import annotations

from dataclasses import dataclass, field, replace
from itertools import product
from typing import Callable, FrozenSet, Iterable, Optional

Action = str
AgentId = str
InvariantId = str


@dataclass(frozen=True)
class IntentContract:
    agent: AgentId
    schedule: dict[int, FrozenSet[Action]]
    is_adversary: bool = False

    def admissible_at(self, t: int) -> FrozenSet[Action]:
        keys = [k for k in self.schedule if k <= t]
        if not keys:
            raise ValueError(f"{self.agent}: no contract coverage at t={t}")
        return self.schedule[max(keys)]

    def with_schedule(self, schedule: dict[int, FrozenSet[Action]]) -> "IntentContract":
        return replace(self, schedule=dict(schedule))


@dataclass(frozen=True)
class JointWorld:
    assignment: tuple[tuple[AgentId, Action], ...]

    @staticmethod
    def from_dict(d: dict[AgentId, Action]) -> "JointWorld":
        return JointWorld(tuple(sorted(d.items())))

    def as_dict(self) -> dict[AgentId, Action]:
        return dict(self.assignment)


History = tuple[JointWorld, ...]


@dataclass
class Invariant:
    id: InvariantId
    description: str
    holds: Callable[[History], bool]


@dataclass
class TickReport:
    t: int
    world_set: FrozenSet[JointWorld]
    histories: FrozenSet[History]
    guaranteed: bool
    violated_invariants: tuple[InvariantId, ...]
    first_violating_world: Optional[JointWorld]
    horizon_open: bool


@dataclass
class CDTResult:
    t_star: Optional[int]
    horizon: Optional[int]
    t0: int
    first_violated: tuple[InvariantId, ...]
    cause_world: Optional[JointWorld]
    reports: list[TickReport]


@dataclass
class Repair:
    description: str
    cost: int
    patched_contracts: dict[AgentId, IntentContract]
    restored_horizon: Optional[int]
    broken_invariant: Optional[InvariantId] = None
    dropped_actions: list[dict[str, str | int]] = field(default_factory=list)
    why: str = "product of admissible fallbacks contained a violating tuple"


def reachable_worlds(contracts: Iterable[IntentContract], t: int) -> FrozenSet[JointWorld]:
    contracts = list(contracts)
    agents = [c.agent for c in contracts]
    choice_sets = [sorted(c.admissible_at(t)) for c in contracts]
    worlds = set()
    for combo in product(*choice_sets):
        worlds.add(JointWorld.from_dict(dict(zip(agents, combo))))
    return frozenset(worlds)


def evaluate_invariants(
    histories: Iterable[History], invariants: Iterable[Invariant]
) -> tuple[bool, tuple[InvariantId, ...], Optional[JointWorld]]:
    violated: list[InvariantId] = []
    first: Optional[JointWorld] = None
    invs = list(invariants)
    for h in sorted(histories, key=lambda x: [w.assignment for w in x]):
        for inv in invs:
            if not inv.holds(h):
                if inv.id not in violated:
                    violated.append(inv.id)
                if first is None:
                    first = h[-1]
    return (len(violated) == 0, tuple(violated), first)


class NullMeshEngine:
    def __init__(self, contracts: list[IntentContract], invariants: list[Invariant]):
        self.contracts = {c.agent: c for c in contracts}
        self.invariants = list(invariants)
        self.current_histories: FrozenSet[History] = frozenset([()])

    def snapshot(self, t: int) -> TickReport:
        W = reachable_worlds(self.contracts.values(), t)
        
        # Build new histories
        new_h = set()
        for h in self.current_histories:
            for w in W:
                new_h.add(h + (w,))
        
        self.current_histories = frozenset(new_h)
        
        ok, violated, first = evaluate_invariants(self.current_histories, self.invariants)
        return TickReport(t, W, self.current_histories, ok, violated, first, ok)

    def run(self, t0: int, t_end: int) -> CDTResult:
        reports: list[TickReport] = []
        t_star = None
        first_violated: tuple[InvariantId, ...] = ()
        cause = None
        for t in range(t0, t_end + 1):
            r = self.snapshot(t)
            reports.append(r)
            if t_star is None and not r.guaranteed:
                t_star = t
                first_violated = r.violated_invariants
                cause = r.first_violating_world
        horizon = None if t_star is None else t_star - t0
        return CDTResult(t_star, horizon, t0, first_violated, cause, reports)


# --- INVARIANTS ---

def exclusive_resource_ownership(resource_of: Callable[[Action], Optional[str]]) -> Invariant:
    def holds(h: History) -> bool:
        w = h[-1]
        claimed: dict[str, AgentId] = {}
        for agent, action in w.assignment:
            res = resource_of(action)
            if res is None:
                continue
            if res in claimed:
                return False
            claimed[res] = agent
        return True
    return Invariant("INV-003", "exclusive resource ownership", holds)


def resource_of_claim(action: Action) -> Optional[str]:
    if action.startswith("claim:"):
        return action.split(":", 1)[1]
    return None


def reserve_once() -> Invariant:
    def holds(h: History) -> bool:
        w = h[-1]
        spent: set[str] = set()
        for _, action in w.assignment:
            if not action.startswith("reserve:"):
                continue
            token = action.split(":", 1)[1]
            if token in spent:
                return False
            spent.add(token)
        return True
    return Invariant("INV-007", "reserve-once", holds)


def capacity_limit(resource_of: Callable[[Action], Optional[str]], max_agents: int) -> Invariant:
    def holds(h: History) -> bool:
        w = h[-1]
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
    def holds(h: History) -> bool:
        w = h[-1]
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


def sequential_dependency(action_A: Action, action_B: Action, action_C: Action) -> Invariant:
    # A true Kill Web: Action A must happen. If A happens, B must happen eventually. If B happens, C must happen eventually.
    # To evaluate this safely in an ongoing simulation, we check if anyone executed C in the current tick.
    # If they did, someone MUST have executed B in the past, and someone MUST have executed A before B.
    def holds(h: History) -> bool:
        curr = h[-1]
        has_C = any(act == action_C for ag, act in curr.assignment)
        if not has_C:
            return True
            
        # So C is happening NOW. Let's look back to see if B happened.
        found_B = -1
        for t_idx in range(len(h)-1, -1, -1):
            if any(act == action_B for ag, act in h[t_idx].assignment):
                found_B = t_idx
                break
                
        if found_B == -1:
            return False
            
        # We found B. Let's see if A happened before B.
        found_A = -1
        for t_idx in range(found_B-1, -1, -1):
            if any(act == action_A for ag, act in h[t_idx].assignment):
                found_A = t_idx
                break
                
        if found_A == -1:
            return False
            
        return True
        
    return Invariant("INV-010", f"kill_web: {action_A} -> {action_B} -> {action_C}", holds)


def killer_demo_contracts() -> list[IntentContract]:
    return [
        IntentContract("A", {0: frozenset({"claim:alpha"}), 12: frozenset({"claim:alpha", "claim:bravo"})}),
        IntentContract("B", {0: frozenset({"claim:bravo"}), 12: frozenset({"claim:bravo", "claim:alpha"})}),
        IntentContract("C", {0: frozenset({"idle"})}),
    ]


def killer_invariants() -> list[Invariant]:
    return [exclusive_resource_ownership(resource_of_claim)]


def _restrict_fallback(c: IntentContract, t_fb: int, keep: FrozenSet[Action]) -> IntentContract:
    sched = dict(c.schedule)
    sched[t_fb] = frozenset(a for a in c.admissible_at(t_fb) if a in keep)
    if not sched[t_fb]:
        raise ValueError("repair would empty admissible set")
    return c.with_schedule(sched)


def _subsets_nonempty(actions: list[Action]) -> list[FrozenSet[Action]]:
    return [
        frozenset(actions[i] for i in range(len(actions)) if mask & (1 << i))
        for mask in range(1, 1 << len(actions))
    ]


def repair_cost_search(
    contracts: list[IntentContract],
    invariants: list[Invariant],
    t0: int,
    t_end: int,
    h_target: int,
    fallback_time: int = 12,
) -> Optional[Repair]:
    by_agent = {c.agent: c for c in contracts}
    mutable = [c for c in contracts if fallback_time in c.schedule and not c.is_adversary]
    if not mutable:
        return None
    option_lists = []
    for c in mutable:
        extras = c.schedule[fallback_time]
        option_lists.append(
            [(c.agent, keep, len(extras) - len(keep)) for keep in _subsets_nonempty(sorted(extras))]
        )
    candidates: list[Repair] = []
    for combo in product(*option_lists):
        cost = sum(d for _, _, d in combo)
        if cost == 0:
            continue
        patched = dict(by_agent)
        bits = []
        try:
            for agent, keep, _ in combo:
                patched[agent] = _restrict_fallback(by_agent[agent], fallback_time, keep)
                bits.append(f"{agent}->keep {sorted(keep)}")
        except ValueError:
            continue
        result = NullMeshEngine(list(patched.values()), invariants).run(t0, t_end)
        restored = (t_end - t0 + 1) if result.t_star is None else result.horizon
        if result.t_star is None or (result.horizon is not None and result.horizon >= h_target):
            candidates.append(Repair("amend " + "; ".join(bits), cost, patched, restored))
    if not candidates:
        return None
    candidates.sort(key=lambda r: (r.cost, r.description))
    repair = candidates[0]
    original = NullMeshEngine(contracts, invariants).run(t0, t_end)
    repair.broken_invariant = original.first_violated[0] if original.first_violated else None
    repair.dropped_actions = [
        {"agent": c.agent, "action": action, "t": fallback_time}
        for c in sorted(mutable, key=lambda c: c.agent)
        for action in sorted(
            c.schedule[fallback_time]
            - repair.patched_contracts[c.agent].schedule[fallback_time]
        )
    ]
    return repair
"""

with open("engine.py", "w") as f:
    f.write(v1_engine)
print("v1 engine written.")
