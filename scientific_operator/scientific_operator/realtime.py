from dataclasses import dataclass, asdict
from typing import List

@dataclass
class MarketShock:
    ticker: str
    last: float
    var_1d: float
    beta: float
    realized_vol: float

@dataclass
class LiquidityShock:
    ticker: str
    spread: float
    depth: int
    stressed_days_to_exit: float
    haircut_vs_quote: float

@dataclass
class CreditShock:
    entity: str
    interest_coverage: float
    debt_due_12m: float
    cash: float

@dataclass
class CounterpartyShock:
    name: str
    role: str
    exposure: float
    collateral: float
    concentration_fraction: float

@dataclass
class Snapshot:
    equity: float
    market: List[MarketShock]
    liquidity: List[LiquidityShock]
    credit: List[CreditShock]
    counterparties: List[CounterpartyShock]

    def report(self):
        total_shocks = len(self.market) + len(self.liquidity) + len(self.credit) + len(self.counterparties)
        if total_shocks == 0:
            status = "GREEN"
        elif total_shocks <= 2:
            status = "AMBER"
        else:
            status = "RED"
            
        return {
            "light": status,
            "full": asdict(self)
        }

def build_snapshot(equity, market=None, liquidity=None, credit=None, counterparties=None):
    return Snapshot(
        equity=equity,
        market=market or [],
        liquidity=liquidity or [],
        credit=credit or [],
        counterparties=counterparties or []
    )
