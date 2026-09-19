"use client";

import { TrendingUp, TrendingDown, RefreshCw, ArrowLeftRight, Bot } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

type RateResult = { base: string; quote: string; date: string; rate: number; source: string };
type HistoryPoint = { base: string; quote: string; date: string; rate: number; source: string };

const CURRENCIES = [
  "USD","EUR","GBP","JPY","AUD","CAD","CHF","HKD","SGD","INR",
  "MXN","BRL","ZAR","SEK","NOK","DKK","PLN","CZK","AED","SAR",
  "KWD","BHD","OMR","NZD","TRY","IDR","KRW","CNY",
];

function Sparkline({ data, width = 280, height = 56 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const last = data[data.length - 1];
  const first = data[0];
  const up = last >= first;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={up ? "#10b981" : "#ef4444"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r={3} fill={up ? "#10b981" : "#ef4444"} />
    </svg>
  );
}

export default function FxRatesPage() {
  const [base, setBase] = useState("USD");
  const [quote, setQuote] = useState("EUR");
  const [date, setDate] = useState("");
  const [rate, setRate] = useState<RateResult | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRate = useCallback(async () => {
    if (base === quote) { setRate({ base, quote, date: date || new Date().toISOString().slice(0,10), rate: 1, source: "identity" }); return; }
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ base, quote });
      if (date) params.set("date", date);
      const [rateRes, histRes] = await Promise.all([
        fetch(`/api/fx/rates?${params}`),
        fetch(`/api/fx/rates?base=${base}&quote=${quote}&history=true&days=30`),
      ]);
      if (!rateRes.ok) { const d = await rateRes.json().catch(() => ({})); throw new Error(d.error ?? "Rate unavailable"); }
      const [rateData, histData] = await Promise.all([rateRes.json(), histRes.json().catch(() => ({ history: [] }))]);
      setRate(rateData);
      setHistory(histData.history ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch rate");
    } finally {
      setLoading(false);
    }
  }, [base, quote, date]);

  useEffect(() => { void fetchRate(); }, [fetchRate]);

  const swap = () => { setBase(quote); setQuote(base); };
  const histRates = history.map(h => h.rate);
  const change = histRates.length >= 2 ? ((histRates[histRates.length-1] - histRates[0]) / histRates[0] * 100) : 0;
  const up = change >= 0;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">MARKET INTELLIGENCE</p>
          <h1>FX Rate Lookup</h1>
          <p className="subtle">Live ECB mid-market rates via Frankfurter. Cached daily — no excess API calls.</p>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', padding: '1.5rem', marginBottom: '2rem' }}>
        <label style={{ flex: 1 }}>
          <span className="eyebrow">Base currency</span>
          <select value={base} onChange={e => setBase(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <button className="button secondary" onClick={swap} style={{ padding: '0.75rem' }} aria-label="Swap currencies">
          <ArrowLeftRight size={18} />
        </button>
        <label style={{ flex: 1 }}>
          <span className="eyebrow">Quote currency</span>
          <select value={quote} onChange={e => setQuote(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ flex: 1 }}>
          <span className="eyebrow">Date <small>(leave blank for today)</small></span>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().slice(0,10)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
        </label>
        <button className="button" onClick={fetchRate} disabled={loading} style={{ padding: '0.75rem 1.5rem' }}>
          {loading ? <RefreshCw size={15} className="spin" /> : "Get Rate"}
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}

      {rate && (
        <>
          {/* AI Insight Badge */}
          <div className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', padding: '1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.5rem', background: '#dcfce7', borderRadius: '50%', color: '#166534' }}><Bot size={20} /></div>
            <div>
              <strong style={{ color: '#166534', display: 'block', marginBottom: '0.25rem' }}>Copilot Insight</strong>
              <span style={{ color: '#15803d', fontSize: '0.9rem' }}>
                {base} is currently {up ? 'strengthening' : 'weakening'} against {quote}. Volatility over the last 30 days is {Math.abs(change).toFixed(2)}%. Consider using deterministic matching for historic invoices to avoid FX spread losses.
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div className="card" style={{ borderTop: '4px solid #10b981' }}>
              <p className="eyebrow">Mid-market rate</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', margin: '1rem 0' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'monospace' }}>
                  {rate.rate === 1 && base === quote ? "1.000000" : rate.rate.toFixed(6)}
                </span>
                <span style={{ fontSize: '1.25rem', color: 'var(--muted)' }}>{base}/{quote}</span>
              </div>
              <p className="subtle" style={{ margin: 0 }}>
                Date: {rate.date} · Source: {rate.source}
              </p>
              {histRates.length >= 2 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.75rem', background: up ? '#dcfce7' : '#fee2e2', color: up ? '#166534' : '#991b1b', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600, marginTop: '1rem' }}>
                  {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {up ? "+" : ""}{change.toFixed(3)}% vs 30d
                </div>
              )}
            </div>

            {histRates.length >= 2 && (
              <div className="card" style={{ gridColumn: 'span 2' }}>
                <p className="eyebrow">30-Day Trend (Monolithic Data)</p>
                <div style={{ margin: '1.5rem 0', display: 'flex', justifyContent: 'center' }}>
                  <Sparkline data={histRates} width={500} height={100} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <div><span className="eyebrow">Min</span> <strong style={{ fontFamily: 'monospace' }}>{Math.min(...histRates).toFixed(6)}</strong></div>
                  <div><span className="eyebrow">Max</span> <strong style={{ fontFamily: 'monospace' }}>{Math.max(...histRates).toFixed(6)}</strong></div>
                  <div><span className="eyebrow">Avg</span> <strong style={{ fontFamily: 'monospace' }}>{(histRates.reduce((a,b) => a+b,0)/histRates.length).toFixed(6)}</strong></div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
