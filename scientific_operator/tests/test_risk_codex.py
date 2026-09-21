from scientific_operator.risk_codex import (
    RiskBudget, Thesis, Side, LiquidityProfile, MarketDiagnosis, Regime,
    Expectancy, InformationClaim, SourceRank, BusinessSnapshot, Portfolio,
    Position, Alignment, decide, ALIGNMENT_SIZE
)

def test_1_recovery_gain_required():
    from scientific_operator.risk_codex import recovery_gain_required
    assert abs(recovery_gain_required(0.1) - 0.1111) < 0.001
    assert abs(recovery_gain_required(0.5) - 1.0) < 0.001

def test_2_compounded_drawdown():
    from scientific_operator.risk_codex import compounded_drawdown
    res = compounded_drawdown([0.1, -0.2, 0.1])
    assert res['max_drawdown'] > 0

def test_3_risk_budget():
    b = RiskBudget(100000, 0.01)
    shares = b.shares_for_risk(100.0, 98.0, Side.LONG, Alignment.STRONG)
    assert shares == 500

def test_4_liquidity_profile():
    liq = LiquidityProfile(1e6, 0.01, 100.0, 10e6)
    assert liq.days_to_exit(10000, False) > 0
    
def test_5_expectancy():
    ev = Expectancy(0.5, 2.0, 0.5, 1.0)
    assert ev.expected_value == 0.5

def test_6_thesis():
    t = Thesis("ABC", Side.LONG, 10.0, 9.0)
    assert t.risk_per_share() == 1.0

def test_7_market_diagnosis():
    md = MarketDiagnosis(Regime.DECLINE, False, False, False, True, False)
    assert md.deteriorating() is True

def test_8_information_claim():
    c = InformationClaim("rumor", SourceRank.RUMOR_OR_TIP, "2023")
    assert c.actionable() is False

def test_9_business_snapshot():
    bs = BusinessSnapshot(revenue_trend=-0.1, margin_trend=-0.1)
    assert len(bs.warnings()) > 0

def test_10_portfolio():
    b = RiskBudget(100_000)
    p = Portfolio(b)
    assert len(p.violations()) == 0

def test_11_decide_accept():
    b = RiskBudget(100_000, 0.01)
    t = Thesis("XYZ", Side.LONG, 10.0, 9.0)
    l = LiquidityProfile(1e6, 0.01, 10.0, 10e6)
    md = MarketDiagnosis(Regime.ADVANCE, True, True, True, False, True)
    d = decide(b, t, l, md, 0.1, 0.1)
    assert d.accepted is True

def test_12_decide_reject():
    b = RiskBudget(100_000, 0.01)
    t = Thesis("BAD", Side.LONG, 10.0, 9.0)
    l = LiquidityProfile(1e6, 0.01, 10.0, 10e6)
    md = MarketDiagnosis(Regime.DECLINE, False, False, False, True, False)
    d = decide(b, t, l, md, -0.1, -0.1)
    assert d.accepted is False

if __name__ == "__main__":
    test_1_recovery_gain_required()
    test_2_compounded_drawdown()
    test_3_risk_budget()
    test_4_liquidity_profile()
    test_5_expectancy()
    test_6_thesis()
    test_7_market_diagnosis()
    test_8_information_claim()
    test_9_business_snapshot()
    test_10_portfolio()
    test_11_decide_accept()
    test_12_decide_reject()
    print("All 12 checks passed.")
