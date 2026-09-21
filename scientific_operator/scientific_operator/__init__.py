from dataclasses import dataclass, field
from typing import Optional
from .risk_codex import (
    Side, Regime, SourceRank, Expectancy, LiquidityProfile, MarketDiagnosis,
    RiskBudget, Thesis, decide, Portfolio, Position, InformationClaim, Alignment
)
from .realtime import (
    MarketShock, LiquidityShock, CreditShock, CounterpartyShock, build_snapshot, Snapshot
)

@dataclass
class Invalidation:
    price_level: float
    fundamental_break: str = ""
    time_stop_sessions: Optional[int] = None

@dataclass
class ProposedTrade:
    ticker: str
    side: Side
    entry: float
    invalidation: Invalidation
    source_rank: SourceRank
    expected_value: Expectancy
    liquidity: LiquidityProfile
    diagnosis: MarketDiagnosis
    stock_rs: float
    group_rs: float
    thesis_notes: str = ""

class ScientificOperator:
    def __init__(self, equity: float, risk_fraction: float):
        self.budget = RiskBudget(account_equity=equity, risk_fraction_per_idea=risk_fraction)
        self.portfolio = Portfolio(self.budget)

    def evaluate(self, trade: ProposedTrade):
        thesis = Thesis(
            symbol=trade.ticker,
            side=trade.side,
            entry=trade.entry,
            invalidation=trade.invalidation.price_level,
            time_stop_sessions=trade.invalidation.time_stop_sessions,
            notes=trade.thesis_notes,
            what_proves_me_wrong="Invalidation price hit"
        )
        decision = decide(
            budget=self.budget,
            thesis=thesis,
            liquidity=trade.liquidity,
            diagnosis=trade.diagnosis,
            stock_rs=trade.stock_rs,
            group_rs=trade.group_rs,
            expectancy=trade.expected_value,
            portfolio=self.portfolio,
        )
        return {
            "accepted": decision.accepted,
            "shares": float(decision.shares),
            "dollars_risked": float(decision.planned_loss),
            "decision": decision,
            "trade": trade,
        }

    def commit(self, report):
        if report["accepted"]:
            trade = report["trade"]
            decision = report["decision"]
            pos = Position(
                thesis=Thesis(
                    symbol=trade.ticker,
                    side=trade.side,
                    entry=trade.entry,
                    invalidation=trade.invalidation.price_level,
                    what_proves_me_wrong="Invalidation price hit"
                ),
                shares=int(report["shares"]),
                liquidity=trade.liquidity,
                alignment=decision.alignment,
                expectancy=trade.expected_value,
                source=None,
                business=None,
                cluster=""
            )
            self.portfolio.positions.append(pos)
            return pos
        return None

    def inspect_exit(self, ticker: str, last: float):
        for p in self.portfolio.positions:
            if p.thesis.symbol == ticker:
                if p.thesis.invalidated_by_price(last):
                    return {"status": "exit", "reason": f"Price {last} crossed invalidation {p.thesis.invalidation}"}
                return {"status": "hold", "last": last}
        return {"status": "not_found"}
