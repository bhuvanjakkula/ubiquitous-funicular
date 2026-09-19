"use client";

import {
  TrendingUp, TrendingDown, Download, Loader2, AlertCircle,
  DollarSign, ArrowUpRight, ArrowDownRight, Minus, Bot
} from "lucide-react";
import { useState } from "react";

type SplitLeg = {
  type: "sale" | "fee" | "refund" | "other";
  id: string;
  description: string;
  currency: string;
  amountMinor: number;
  settlementAmountMinor: number;
  settlementCurrency: string;
  fxRate: number;
  fxGainLossMinor: number;
  created: string;
};

type PayoutSplit = {
  payoutId: string;
  settlementCurrency: string;
  totalSaleMinor: number;
  totalFeeMinor: number;
  totalDepositMinor: number;
  totalFxGainMinor: number;
  totalFxLossMinor: number;
  legs: SplitLeg[];
  midRateUsed: Record<string, number>;
};

const EXP: Record<string, number> = { USD:2, EUR:2, GBP:2, JPY:0, KRW:0, KWD:3, BHD:3, AUD:2, CAD:2, CHF:2, HKD:2, SGD:2, INR:2, AED:2, SAR:2 };
function major(minor: number, ccy: string): string {
  const e = EXP[ccy.toUpperCase()] ?? 2;
  if (e === 0) return minor.toString();
  const neg = minor < 0, abs = Math.abs(minor).toString().padStart(e + 1, "0");
  return `${neg ? "-" : ""}${abs.slice(0, -e)}.${abs.slice(-e)}`;
}
function fmt(minor: number, ccy: string, sign = false): string {
  const m = major(minor, ccy);
  return `${sign && minor > 0 ? "+" : ""}${ccy} ${m}`;
}

function exportSplitCsv(split: PayoutSplit): void {
  const headers = ["ID","Type","Description","Currency","Amount","SettlementCurrency","SettlementAmount","FxRate","FxGainLoss","Created"];
  const rows = split.legs.map(l => [
    l.id, l.type, `"${l.description.replace(/"/g,'""')}"`,
    l.currency, major(l.amountMinor, l.currency),
    l.settlementCurrency, major(l.settlementAmountMinor, l.settlementCurrency),
    l.fxRate.toFixed(6), major(l.fxGainLossMinor, l.settlementCurrency),
    l.created,
  ].join(","));
  const csv = [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `stripe-split-${split.payoutId}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function LegTypeIcon({ type }: { type: SplitLeg["type"] }) {
  if (type === "sale") return <ArrowUpRight size={14} style={{ color: '#10b981' }} />;
  if (type === "refund") return <ArrowDownRight size={14} style={{ color: '#f59e0b' }} />;
  if (type === "fee") return <Minus size={14} style={{ color: '#ef4444' }} />;
  return <DollarSign size={14} style={{ color: '#6366f1' }} />;
}

export default function StripeSplitPage() {
  const [payoutId, setPayoutId] = useState("");
  const [split, setSplit] = useState<PayoutSplit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const stripeConfigured = true;

  async function fetchSplit() {
    if (!payoutId.startsWith("po_")) { setError("Payout ID must start with 'po_'"); return; }
    setLoading(true); setError(""); setSplit(null);
    try {
      const res = await fetch("/api/stripe-split", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payoutId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch split");
      setSplit(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const netFx = split ? split.totalFxGainMinor - split.totalFxLossMinor : 0;

  return (
    <main className="page narrow" style={{ maxWidth: '1000px' }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">FORENSIC ACCOUNTING</p>
          <h1>Payout FX Split</h1>
          <p className="subtle">
            Decompose any Stripe payout into sale / deposit / fee / FX gain-loss legs.
            Mid-market rates from ECB — reveals the true cost of currency conversion.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1 }}>
          <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>Stripe Payout ID</p>
          <input
            id="payout-id"
            value={payoutId}
            onChange={e => setPayoutId(e.target.value)}
            placeholder="po_1ABcDE2fGhIjKL3MnOpQrSt"
            onKeyDown={e => e.key === "Enter" && void fetchSplit()}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', fontFamily: 'monospace' }}
          />
        </div>
        <button className="button" onClick={fetchSplit} disabled={loading || !payoutId} style={{ padding: '0.75rem 1.5rem', marginTop: '1.5rem' }}>
          {loading ? <Loader2 size={15} className="spin" style={{ marginRight: '0.5rem' }} /> : <TrendingUp size={15} style={{ marginRight: '0.5rem' }} />}
          {loading ? "Loading…" : "Analyse Payout"}
        </button>
      </div>

      {error && (
        <div className="notice error" style={{ display: "flex", alignItems: "center", gap: 8, padding: '1rem', background: '#fef2f2', color: '#991b1b', marginBottom: '2rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {split && (
        <>
          {/* AI Insight */}
          <div className="card" style={{ background: '#f8fafc', borderColor: '#e2e8f0', padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ padding: '0.75rem', background: '#e0e7ff', borderRadius: '50%', color: '#4f46e5' }}><Bot size={24} /></div>
            <div>
              <strong style={{ color: '#3730a3', display: 'block', marginBottom: '0.5rem', fontSize: '1.1rem' }}>AI Forensic Analysis</strong>
              <p style={{ color: '#4338ca', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                This payout processed <strong>{split.legs.length}</strong> individual legs. You paid <strong>{fmt(split.totalFeeMinor, split.settlementCurrency)}</strong> in Stripe processing fees.
                Due to currency conversions from {Object.keys(split.midRateUsed).join(', ')}, you incurred a hidden spread of <strong style={{ color: netFx >= 0 ? '#166534' : '#991b1b' }}>{fmt(Math.abs(netFx), split.settlementCurrency)}</strong> compared to the ECB mid-market rate.
              </p>
            </div>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <span className="eyebrow">Total Sales (Gross)</span>
              <strong style={{ display: 'block', fontSize: '1.75rem', margin: '0.5rem 0' }}>{fmt(split.totalSaleMinor, split.legs.find(l=>l.type==="sale")?.currency ?? split.settlementCurrency)}</strong>
              <small className="subtle">Across all charges</small>
            </div>
            <div className="card" style={{ borderTop: '4px solid #ef4444' }}>
              <span className="eyebrow">Total Fees</span>
              <strong style={{ display: 'block', fontSize: '1.75rem', margin: '0.5rem 0', color: '#ef4444' }}>{fmt(split.totalFeeMinor, split.settlementCurrency)}</strong>
              <small className="subtle">Stripe processing fees</small>
            </div>
            <div className="card">
              <span className="eyebrow">Net Deposited</span>
              <strong style={{ display: 'block', fontSize: '1.75rem', margin: '0.5rem 0' }}>{fmt(split.totalDepositMinor, split.settlementCurrency)}</strong>
              <small className="subtle">Settled to bank</small>
            </div>
            <div className="card" style={{ borderTop: `4px solid ${netFx >= 0 ? '#10b981' : '#f59e0b'}` }}>
              <span className="eyebrow">FX Spread vs Mid</span>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.75rem', margin: '0.5rem 0', color: netFx >= 0 ? '#10b981' : '#f59e0b' }}>
                {netFx >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                {fmt(Math.abs(netFx), split.settlementCurrency, false)}
              </strong>
              <small className="subtle">{netFx >= 0 ? "Favourable vs ECB" : "Cost vs ECB"}</small>
            </div>
          </div>

          {/* Legs table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"1.5rem", borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Balance Transaction Legs</h3>
                <p className="subtle" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>Full forensic breakdown of {split.payoutId}</p>
              </div>
              <button className="button secondary small" onClick={() => exportSplitCsv(split)}>
                <Download size={15} style={{ marginRight: '0.5rem' }} /> Export CSV
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <th style={{ padding: '1rem' }}>TYPE</th>
                  <th style={{ padding: '1rem' }}>TX ID</th>
                  <th style={{ padding: '1rem' }}>CURRENCY</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>AMOUNT</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>SETTLED ({split.settlementCurrency})</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>FX RATE</th>
                  <th style={{ padding: '1rem', textAlign: 'right' }}>SPREAD</th>
                </tr>
              </thead>
              <tbody>
                {split.legs.map(leg => (
                  <tr key={leg.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'capitalize', fontWeight: 600 }}>
                        <LegTypeIcon type={leg.type} /> {leg.type}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <code style={{ fontSize: '0.8rem', color: '#666' }}>{leg.id.slice(0,20)}…</code>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#666' }}>{leg.currency}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '1rem' }}>{major(leg.amountMinor, leg.currency)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600 }}>{major(leg.settlementAmountMinor, leg.settlementCurrency)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace' }}>{leg.currency === leg.settlementCurrency ? "—" : leg.fxRate.toFixed(6)}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: leg.fxGainLossMinor >= 0 ? '#10b981' : '#ef4444' }}>
                      {leg.currency === leg.settlementCurrency ? "—" : fmt(leg.fxGainLossMinor, leg.settlementCurrency, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
