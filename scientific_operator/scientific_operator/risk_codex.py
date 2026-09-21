#!/usr/bin/env python3
"""
THE SCIENTIFIC STOCK OPERATOR — RISK CODEX
Facts → business → tape → liquidity → invalidation → size → execution → review
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from math import sqrt
from typing import Iterable, Optional
import json
import time


class Side(str, Enum):
    LONG = "long"
    SHORT = "short"


class Alignment(str, Enum):
    STRONG = "strong"
    MIXED_GROUP = "mixed_group"
    ISOLATED_STRENGTH = "isolated_strength"
    WEAK = "weak"


class Regime(str, Enum):
    ADVANCE = "advance"
    DECLINE = "decline"
    RANGE = "range"
    UNSTABLE = "unstable"


class SourceRank(int, Enum):
    AUDITED_FILING = 1
    EXCHANGE_REGULATORY = 2
    VERIFIED_MANAGEMENT = 3
    INDEPENDENT_RESEARCH = 4
    RUMOR_OR_TIP = 5


ALIGNMENT_SIZE = {
    Alignment.STRONG: 1.00,
    Alignment.MIXED_GROUP: 0.50,
    Alignment.ISOLATED_STRENGTH: 0.25,
    Alignment.WEAK: 0.00,
}


def recovery_gain_required(loss_fraction: float) -> float:
    if loss_fraction < 0:
        raise ValueError("loss_fraction must be >= 0")
    if loss_fraction >= 1.0:
        raise ValueError("A total loss cannot be recovered by a finite gain.")
    return loss_fraction / (1.0 - loss_fraction)


def compounded_drawdown(returns: Iterable[float]) -> dict:
    equity = peak = 1.0
    max_dd = 0.0
    path = [1.0]
    for r in returns:
        equity *= 1.0 + r
        path.append(equity)
        peak = max(peak, equity)
        dd = (peak - equity) / peak if peak else 0.0
        max_dd = max(max_dd, dd)
    rec = recovery_gain_required(max_dd) if max_dd < 1 else float("inf")
    return {
        "ending_equity": equity,
        "max_drawdown": max_dd,
        "recovery_required": rec,
        "path": path,
    }


def kelly_fraction(p_gain: float, payoff_ratio: float) -> float:
    if payoff_ratio <= 0:
        return 0.0
    return max(0.0, p_gain - (1.0 - p_gain) / payoff_ratio)


def operator_fraction(p_gain: float, payoff_ratio: float, haircut: float = 0.25) -> float:
    return kelly_fraction(p_gain, payoff_ratio) * haircut


@dataclass
class RiskBudget:
    """shares = permitted risk / |entry − invalidation| × alignment."""
    account_equity: float
    risk_fraction_per_idea: float = 0.01
    max_aggregate_risk: float = 0.06
    max_gross_exposure: float = 1.0
    max_correlated_cluster: float = 0.03
    max_leverage: float = 1.0

    def __post_init__(self) -> None:
        if self.account_equity <= 0:
            raise ValueError("account_equity must be positive")
        if not 0 < self.risk_fraction_per_idea < 0.25:
            raise ValueError("risk_fraction_per_idea must be a small positive fraction")

    @property
    def permitted_risk_dollars(self) -> float:
        return self.account_equity * self.risk_fraction_per_idea

    def shares_for_risk(
        self,
        entry: float,
        invalidation: float,
        side: Side = Side.LONG,
        alignment: Alignment = Alignment.STRONG,
    ) -> int:
        risk_ps = abs(entry - invalidation)
        if risk_ps <= 0 or entry <= 0:
            raise ValueError("entry/invalidation invalid")
        raw = self.permitted_risk_dollars / risk_ps * ALIGNMENT_SIZE[alignment]
        cap = (self.account_equity * self.max_gross_exposure * self.max_leverage) / entry
        return max(0, int(min(raw, cap)))

    def dollars_at_risk(self, shares: int, entry: float, invalidation: float) -> float:
        return abs(entry - invalidation) * shares


@dataclass
class LiquidityProfile:
    average_daily_volume: float
    bid_ask_spread: float
    displayed_price: float
    free_float_shares: float
    ownership_top10_pct: float = 0.0
    depth_at_touch: float = 0.0
    stressed_volume_fraction: float = 0.35
    max_participation: float = 0.10

    def days_to_exit(self, shares: int, stressed: bool = False) -> float:
        vol = self.average_daily_volume * (self.stressed_volume_fraction if stressed else 1.0)
        return shares / max(vol * self.max_participation, 1.0)

    def market_impact_per_share(self, shares: int, stressed: bool = False) -> float:
        vol = max(self.average_daily_volume * (self.stressed_volume_fraction if stressed else 1.0), 1.0)
        return self.displayed_price * 0.10 * sqrt(max(shares / vol, 0.0)) * (1.0 + self.ownership_top10_pct)

    def realized_price(self, shares: int, side: Side = Side.LONG, urgency: float = 0.0, stressed: bool = False) -> float:
        urgency = min(1.0, max(0.0, urgency))
        impact = self.market_impact_per_share(shares, stressed)
        cost = self.bid_ask_spread + impact + impact * urgency + self.bid_ask_spread * urgency
        return self.displayed_price - cost if side is Side.LONG else self.displayed_price + cost

    def paper_vs_realizable(self, shares: int, side: Side = Side.LONG, stressed: bool = True) -> dict:
        paper = self.displayed_price * shares
        px = self.realized_price(shares, side=side, urgency=0.8, stressed=stressed)
        real = px * shares
        haircut = abs(paper - real)
        return {
            "paper_value": paper,
            "realizable_value": real,
            "realized_price": px,
            "haircut": haircut,
            "haircut_pct": haircut / paper if paper else 0.0,
            "calm_days_to_exit": self.days_to_exit(shares, False),
            "stressed_days_to_exit": self.days_to_exit(shares, True),
        }


@dataclass
class Expectancy:
    p_gain: float
    gain: float
    p_loss: float
    loss: float
    costs: float = 0.0

    def __post_init__(self) -> None:
        if min(self.p_gain, self.p_loss, self.loss, self.gain) < 0:
            raise ValueError("inputs must be non-negative")
        if self.p_gain + self.p_loss > 1.0 + 1e-9:
            raise ValueError("probabilities exceed 1")

    @property
    def expected_value(self) -> float:
        return self.p_gain * self.gain - self.p_loss * self.loss - self.costs

    @property
    def payoff_ratio(self) -> float:
        return self.gain / self.loss if self.loss else float("inf")

    @property
    def favorable(self) -> bool:
        return self.expected_value > 0


@dataclass
class Thesis:
    symbol: str
    side: Side
    entry: float
    invalidation: float
    time_stop_sessions: Optional[int] = None
    fundamental_breaks: list[str] = field(default_factory=list)
    group: str = ""
    notes: str = ""
    what_proves_me_wrong: str = ""

    def risk_per_share(self) -> float:
        return abs(self.entry - self.invalidation)

    def invalidated_by_price(self, last: float) -> bool:
        return last <= self.invalidation if self.side is Side.LONG else last >= self.invalidation


@dataclass
class MarketDiagnosis:
    regime: Regime
    price_structure_higher_highs: bool
    volume_confirms_direction: bool
    breadth_expanding: bool
    volatility_elevated: bool
    liquidity_adequate: bool
    news_behavior_divergence: bool = False

    def deteriorating(self) -> bool:
        if self.regime in (Regime.DECLINE, Regime.UNSTABLE):
            return True
        weak = (
            int(not self.price_structure_higher_highs)
            + int(not self.volume_confirms_direction)
            + int(not self.breadth_expanding)
            + int(self.volatility_elevated)
            + 2 * int(not self.liquidity_adequate)
            + int(self.news_behavior_divergence)
        )
        return weak >= 3

    def alignment_with_stock(self, stock_rs: float, group_rs: float) -> Alignment:
        stock_strong, group_strong = stock_rs > 0, group_rs > 0
        market_ok = self.regime in (Regime.ADVANCE, Regime.RANGE) and not self.deteriorating()
        if market_ok and group_strong and stock_strong:
            return Alignment.STRONG
        if stock_strong and not group_strong:
            return Alignment.ISOLATED_STRENGTH
        if market_ok and group_strong and not stock_strong:
            return Alignment.MIXED_GROUP
        return Alignment.WEAK


@dataclass
class InformationClaim:
    claim: str
    source_rank: SourceRank
    dated: str
    primary_source_url: str = ""
    already_in_price: bool = False
    changes_cash_flow: bool = False
    changes_risk: bool = False

    def actionable(self) -> bool:
        if self.source_rank is SourceRank.RUMOR_OR_TIP:
            return False
        if self.already_in_price and not self.changes_risk:
            return False
        return self.changes_cash_flow or self.changes_risk


@dataclass
class BusinessSnapshot:
    revenue_trend: float = 0.0
    margin_trend: float = 0.0
    cash_conversion: float = 1.0
    interest_coverage: Optional[float] = None
    incremental_roic: Optional[float] = None
    wacc: Optional[float] = None
    dilution_pct: float = 0.0
    dividend_covered_by_fcf: bool = True

    def warnings(self) -> list[str]:
        out = []
        if self.revenue_trend < 0 and self.margin_trend < 0:
            out.append("Revenue and margins are both deteriorating.")
        if self.cash_conversion < 0.7:
            out.append("Earnings are not converting to cash.")
        if self.interest_coverage is not None and self.interest_coverage < 3:
            out.append("Interest coverage is below 3x.")
        if self.incremental_roic is not None and self.wacc is not None and self.incremental_roic < self.wacc:
            out.append("Incremental ROIC is below WACC — expansion destroys value.")
        if self.dilution_pct > 0.05:
            out.append("Dilution exceeds 5%.")
        if not self.dividend_covered_by_fcf:
            out.append("Dividend is not covered by free cash flow.")
        return out

    def financially_fragile(self) -> bool:
        return any("Interest" in s or "destroy" in s or "not converting" in s for s in self.warnings())


@dataclass
class Position:
    thesis: Thesis
    shares: int
    liquidity: LiquidityProfile
    alignment: Alignment
    expectancy: Optional[Expectancy] = None
    source: Optional[InformationClaim] = None
    business: Optional[BusinessSnapshot] = None
    cluster: str = ""

    @property
    def notional(self) -> float:
        return self.shares * self.thesis.entry

    @property
    def planned_loss(self) -> float:
        return self.shares * self.thesis.risk_per_share()


@dataclass
class Portfolio:
    budget: RiskBudget
    positions: list[Position] = field(default_factory=list)

    def planned_risk(self) -> float:
        return sum(p.planned_loss for p in self.positions)

    def cluster_risk(self, theme: str) -> float:
        return sum(p.planned_loss for p in self.positions if p.cluster == theme)

    def violations(self) -> list[str]:
        notes, eq = [], self.budget.account_equity
        if self.planned_risk() > eq * self.budget.max_aggregate_risk + 1e-6:
            notes.append("Aggregate planned risk exceeds cap.")
        if sum(p.notional for p in self.positions) > eq * self.budget.max_gross_exposure * self.budget.max_leverage + 1e-6:
            notes.append("Gross exposure exceeds budget cap.")
        for theme in {p.cluster for p in self.positions if p.cluster}:
            if self.cluster_risk(theme) > eq * self.budget.max_correlated_cluster + 1e-6:
                notes.append(f"Cluster '{theme}' exceeds cap.")
        for p in self.positions:
            if p.planned_loss > self.budget.permitted_risk_dollars + 1e-6:
                notes.append(f"{p.thesis.symbol}: exceeds single-idea budget.")
            if p.alignment is Alignment.WEAK:
                notes.append(f"{p.thesis.symbol}: WEAK alignment.")
            if p.liquidity.days_to_exit(p.shares, True) > 5:
                notes.append(f"{p.thesis.symbol}: stressed exit too slow.")
            if p.source and p.source.source_rank is SourceRank.RUMOR_OR_TIP:
                notes.append(f"{p.thesis.symbol}: tip.")
            if p.expectancy and not p.expectancy.favorable:
                notes.append(f"{p.thesis.symbol}: bad expectancy.")
            if p.business and p.business.financially_fragile() and p.thesis.side is Side.LONG:
                notes.append(f"{p.thesis.symbol}: fragile business.")
        return notes

    def can_add(self, candidate: Position) -> tuple[bool, list[str]]:
        v = Portfolio(self.budget, self.positions + [candidate]).violations()
        return (not v, v)

    def mark(self, prices: dict[str, float]) -> list[str]:
        hits, keep = [], []
        for p in self.positions:
            last = prices.get(p.thesis.symbol)
            if last is not None and p.thesis.invalidated_by_price(last):
                hits.append(p.thesis.symbol)
            else:
                keep.append(p)
        self.positions = keep
        return hits


@dataclass
class OperatorDecision:
    accepted: bool
    shares: int
    planned_loss: float
    alignment: Alignment
    reasons: list[str]
    warnings: list[str]
    realized_exit_preview: dict
    kelly_quarter: float = 0.0

    def as_dict(self) -> dict:
        return asdict(self)


def decide(
    budget: RiskBudget,
    thesis: Thesis,
    liquidity: LiquidityProfile,
    diagnosis: MarketDiagnosis,
    stock_rs: float,
    group_rs: float,
    expectancy: Optional[Expectancy] = None,
    source: Optional[InformationClaim] = None,
    business: Optional[BusinessSnapshot] = None,
    portfolio: Optional[Portfolio] = None,
    cluster: str = "",
    max_stressed_days: float = 5.0,
) -> OperatorDecision:
    reasons, warnings = [], []
    alignment = diagnosis.alignment_with_stock(stock_rs, group_rs)
    if alignment is Alignment.WEAK:
        reasons.append("Market, group, and stock are not aligned. Step aside.")
    if diagnosis.deteriorating() and thesis.side is Side.LONG:
        reasons.append("Vital signs deteriorating; long risk is not confirmed.")
    if source and not source.actionable():
        reasons.append("Information is a tip, already priced, or does not change cash flow/risk.")
    if expectancy and not expectancy.favorable:
        reasons.append("Expected value after costs is not positive.")
    if business:
        warnings.extend(business.warnings())
        if business.financially_fragile() and thesis.side is Side.LONG:
            reasons.append("Business snapshot is fragile; prestige does not cancel arithmetic.")

    shares = budget.shares_for_risk(thesis.entry, thesis.invalidation, thesis.side, alignment)
    preview = liquidity.paper_vs_realizable(max(shares, 1), thesis.side, True)
    if shares and preview["stressed_days_to_exit"] > max_stressed_days:
        warnings.append(f"Stressed liquidation may take {preview['stressed_days_to_exit']:.1f} days.")
        while shares and liquidity.days_to_exit(shares, True) > max_stressed_days:
            shares = int(shares * 0.8)
    if preview["haircut_pct"] > 0.08:
        warnings.append(f"Realizable haircut under stress is {preview['haircut_pct']:.1%}.")

    candidate = Position(thesis, shares, liquidity, alignment, expectancy, source, business, cluster)
    if portfolio is not None and shares:
        ok, viol = portfolio.can_add(candidate)
        if not ok:
            reasons.extend(viol)

    accepted = shares > 0 and not reasons
    if not accepted:
        shares = 0
    kq = operator_fraction(expectancy.p_gain, expectancy.payoff_ratio) if expectancy else 0.0
    return OperatorDecision(
        accepted=accepted,
        shares=shares,
        planned_loss=shares * thesis.risk_per_share(),
        alignment=alignment,
        reasons=reasons,
        warnings=warnings,
        realized_exit_preview=liquidity.paper_vs_realizable(max(candidate.shares, 1), thesis.side, True),
        kelly_quarter=kq,
    )


@dataclass
class DecisionRecord:
    symbol: str
    action: str
    known_at_the_time: dict
    created_at: float = field(default_factory=time.time)
    outcome: Optional[dict] = None
    process_error: Optional[str] = None


class Journal:
    def __init__(self) -> None:
        self.records: list[DecisionRecord] = []

    def write(self, rec: DecisionRecord) -> DecisionRecord:
        self.records.append(rec)
        return rec

    def close(self, symbol: str, outcome: dict, process_error: Optional[str] = None) -> None:
        for rec in reversed(self.records):
            if rec.symbol == symbol and rec.outcome is None:
                rec.outcome = outcome
                rec.process_error = process_error
                return
        raise KeyError(f"no open record for {symbol}")
