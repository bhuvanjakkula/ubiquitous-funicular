import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scientific_operator import (
    ScientificOperator, ProposedTrade, Side, Invalidation,
    Expectancy, LiquidityProfile, MarketDiagnosis, Regime, SourceRank,
)

def main():
    op = ScientificOperator(equity=100_000, risk_fraction=0.01)
    report = op.evaluate(ProposedTrade(
        ticker="EXAMPLE",
        side=Side.LONG,
        entry=50.0,
        invalidation=Invalidation(price_level=48.0),
        source_rank=SourceRank.AUDITED_FILING,
        expected_value=Expectancy(0.45, 3000, 0.55, 1000, 25),
        liquidity=LiquidityProfile(5_000_000, 0.01, 50.0, 80_000_000),
        diagnosis=MarketDiagnosis(Regime.ADVANCE, True, True, True, False, True),
        stock_rs=0.08,
        group_rs=0.05,
    ))
    print(report["accepted"], report["shares"], report["dollars_risked"])

if __name__ == "__main__":
    main()
