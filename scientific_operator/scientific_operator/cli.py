import argparse
import json
import sys
import subprocess
from .risk_codex import (
    RiskBudget, Thesis, Side, Alignment, recovery_gain_required, 
    MarketDiagnosis, Regime, LiquidityProfile, decide, Expectancy, InformationClaim, SourceRank,
    kelly_fraction, operator_fraction
)
from .realtime import build_snapshot, MarketShock, LiquidityShock, CreditShock, CounterpartyShock
from . import ScientificOperator, ProposedTrade, Invalidation

TEN_RULES = [
    "1. Never ask capital to obey an untested opinion.",
    "2. Always define the invalidation level before entry.",
    "3. Size for the maximum acceptable loss.",
    "4. Align with the market regime and group strength.",
    "5. Reject tips and unverified rumors.",
    "6. Check liquidity under stressed conditions.",
    "7. Cut losses at the invalidation level without hesitation.",
    "8. Avoid financially fragile businesses for long ideas.",
    "9. Demand positive expected value.",
    "10. Respect the portfolio limits."
]

CHECKLIST = [
    "1. Is the market regime favorable?",
    "2. Is the group outperforming?",
    "3. Is the stock outperforming its group?",
    "4. Is liquidity adequate for stressed exit?",
    "5. Is the expected value positive?",
    "6. Is the information source verified?"
]

def main():
    parser = argparse.ArgumentParser(prog="scientific_operator")
    subparsers = parser.add_subparsers(dest="command")
    
    subparsers.add_parser("commands")
    subparsers.add_parser("rules")
    subparsers.add_parser("checklist")
    subparsers.add_parser("demo")
    subparsers.add_parser("snapshot")
    subparsers.add_parser("recovery-table")
    
    p_size = subparsers.add_parser("size")
    p_size.add_argument("--equity", type=float, required=True)
    p_size.add_argument("--entry", type=float, required=True)
    p_size.add_argument("--stop", type=float, required=True)
    
    p_recover = subparsers.add_parser("recover")
    p_recover.add_argument("--loss-pct", type=float, required=True)
    
    p_decide = subparsers.add_parser("decide")
    p_decide.add_argument("--equity", type=float, default=100_000)
    p_decide.add_argument("--entry", type=float, default=50)
    p_decide.add_argument("--stop", type=float, default=48)
    p_decide.add_argument("--stock-rs", type=float, default=0.0)
    p_decide.add_argument("--group-rs", type=float, default=0.0)
    p_decide.add_argument("--regime", type=str, default="advance")
    p_decide.add_argument("--tip", action="store_true")
    
    p_liquidate = subparsers.add_parser("liquidate")
    p_liquidate.add_argument("--price", type=float, required=True)
    p_liquidate.add_argument("--shares", type=int, required=True)
    p_liquidate.add_argument("--adv", type=float, required=True)
    p_liquidate.add_argument("--spread", type=float, required=True)
    
    p_kelly = subparsers.add_parser("kelly")
    p_kelly.add_argument("--p-gain", type=float, required=True)
    p_kelly.add_argument("--payoff", type=float, required=True)
    
    p_align = subparsers.add_parser("align")
    p_align.add_argument("--regime", type=str, required=True)
    p_align.add_argument("--stock-rs", type=float, required=True)
    p_align.add_argument("--group-rs", type=float, required=True)
    
    p_invalidate = subparsers.add_parser("invalidate")
    p_invalidate.add_argument("--stop", type=float, required=True)
    p_invalidate.add_argument("--last", type=float, required=True)
    
    p_coverage = subparsers.add_parser("coverage")
    p_coverage.add_argument("--ebit", type=float, required=True)
    p_coverage.add_argument("--interest", type=float, required=True)
    
    p_ev = subparsers.add_parser("ev")
    p_ev.add_argument("--p-gain", type=float, required=True)
    p_ev.add_argument("--gain", type=float, required=True)
    p_ev.add_argument("--p-loss", type=float, required=True)
    p_ev.add_argument("--loss", type=float, required=True)
    p_ev.add_argument("--costs", type=float, required=True)

    args = parser.parse_args()
    
    if args.command == "commands":
        parser.print_help()
        
    elif args.command == "rules":
        print(json.dumps(TEN_RULES, indent=2))
        
    elif args.command == "checklist":
        print(json.dumps(CHECKLIST, indent=2))
        
    elif args.command == "demo":
        subprocess.run([sys.executable, "examples/demo.py"])
        
    elif args.command == "snapshot":
        snap = build_snapshot(
            equity=100_000,
            market=[MarketShock("EXAMPLE", last=50, var_1d=800, beta=1.1, realized_vol=0.28)]
        )
        print(json.dumps(snap.report(), indent=2))
        
    elif args.command == "recovery-table":
        table = {}
        for loss in [0.05, 0.1, 0.2, 0.5, 0.75, 0.9]:
            table[f"{loss*100:.0f}%"] = f"{recovery_gain_required(loss)*100:.1f}%"
        print(json.dumps(table, indent=2))

    elif args.command == "size":
        budget = RiskBudget(args.equity)
        shares = budget.shares_for_risk(args.entry, args.stop, Side.LONG, Alignment.STRONG)
        loss = budget.dollars_at_risk(shares, args.entry, args.stop)
        print(json.dumps({
            "permitted_risk": budget.permitted_risk_dollars,
            "shares": shares,
            "planned_loss": loss
        }, indent=2))
        
    elif args.command == "recover":
        req = recovery_gain_required(args.loss_pct / 100.0)
        print(json.dumps({"recovery_required_pct": req * 100.0}, indent=2))
        
    elif args.command == "decide":
        budget = RiskBudget(args.equity)
        thesis = Thesis("CLI", Side.LONG, args.entry, args.stop)
        liq = LiquidityProfile(5_000_000, 0.01, args.entry, 100_000_000)
        try:
            regime = Regime(args.regime.lower())
        except ValueError:
            regime = Regime.UNSTABLE
        md = MarketDiagnosis(
            regime=regime,
            price_structure_higher_highs=regime == Regime.ADVANCE,
            volume_confirms_direction=regime == Regime.ADVANCE,
            breadth_expanding=regime == Regime.ADVANCE,
            volatility_elevated=regime == Regime.UNSTABLE,
            liquidity_adequate=regime != Regime.UNSTABLE
        )
        source = InformationClaim("tip", SourceRank.RUMOR_OR_TIP if args.tip else SourceRank.AUDITED_FILING, "now")
        d = decide(budget, thesis, liq, md, args.stock_rs, args.group_rs, source=source)
        print(json.dumps({
            "accepted": d.accepted,
            "action": "accept" if d.accepted else "stand_aside",
            "shares": d.shares,
            "planned_loss": d.planned_loss,
            "reasons": d.reasons
        }, indent=2))

    elif args.command == "liquidate":
        liq = LiquidityProfile(args.adv, args.spread, args.price, args.adv * 100)
        res = liq.paper_vs_realizable(args.shares, Side.LONG, stressed=True)
        print(json.dumps(res, indent=2))

    elif args.command == "kelly":
        raw = kelly_fraction(args.p_gain, args.payoff)
        op_frac = operator_fraction(args.p_gain, args.payoff)
        print(json.dumps({"kelly_fraction": raw, "operator_fraction": op_frac}, indent=2))

    elif args.command == "align":
        try:
            regime = Regime(args.regime.lower())
        except ValueError:
            regime = Regime.UNSTABLE
        md = MarketDiagnosis(
            regime=regime,
            price_structure_higher_highs=regime == Regime.ADVANCE,
            volume_confirms_direction=regime == Regime.ADVANCE,
            breadth_expanding=regime == Regime.ADVANCE,
            volatility_elevated=regime == Regime.UNSTABLE,
            liquidity_adequate=regime != Regime.UNSTABLE
        )
        al = md.alignment_with_stock(args.stock_rs, args.group_rs)
        print(json.dumps({"alignment": al.value}, indent=2))

    elif args.command == "invalidate":
        t = Thesis("CLI", Side.LONG, args.stop + 2, args.stop)
        hit = t.invalidated_by_price(args.last)
        print(json.dumps({"invalidated": hit, "action": "cut_losses" if hit else "hold"}, indent=2))

    elif args.command == "coverage":
        cov = args.ebit / args.interest if args.interest > 0 else float("inf")
        print(json.dumps({"interest_coverage": cov, "fragile": cov < 3.0}, indent=2))

    elif args.command == "ev":
        ev_obj = Expectancy(args.p_gain, args.gain, args.p_loss, args.loss, args.costs)
        print(json.dumps({"expected_value": ev_obj.expected_value, "favorable": ev_obj.favorable, "payoff_ratio": ev_obj.payoff_ratio}, indent=2))

if __name__ == "__main__":
    main()
