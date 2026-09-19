"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function CopilotDashboard() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">COMMAND CENTER</p>
          <h1>BorderBooks AI Copilot</h1>
          <p className="subtle">
            Intelligent financial-control layer. Real-time invoice-to-PO matching and anomaly detection.
          </p>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 2rem', marginBottom: '2rem' }}>
        <Search size={24} style={{ color: '#10b981' }} />
        <input 
          type="text" 
          placeholder='Try asking: "Show unpaid invoices above ₹5 lakh that are more than 30 days overdue"' 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '1rem', outline: 'none' }}
        />
        <button className="button secondary">Ask AI</button>
      </div>

      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', marginTop: '2rem' }}>Core AP Operations</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
        <div className="card" style={{ borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
          <p className="eyebrow">STRAIGHT-THROUGH PROCESSING (STP)</p>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>91.5%</h2>
          <span style={{ color: '#10b981', fontSize: '0.85rem' }}>Safely processed without manual intervention</span>
        </div>
        <div className="card">
          <p className="eyebrow">INVOICES PROCESSED</p>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>1,284</h2>
          <span style={{ color: '#10b981', fontSize: '0.85rem' }}>1,176 auto-matched</span>
        </div>
        <div className="card" style={{ cursor: 'pointer', border: '1px solid #f59e0b' }} onClick={() => router.push('/app/exceptions')}>
          <p className="eyebrow">NEEDS REVIEW</p>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>73</h2>
          <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>Action Required</span>
        </div>
        <div className="card" style={{ border: '1px solid #ef4444' }}>
          <p className="eyebrow">HIGH RISK ANOMALIES</p>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0' }}>35</h2>
          <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>21 duplicates, 14 unusual</span>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>AI Value & Performance Metrics</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="subtle">Extraction Accuracy</span>
              <strong>99.2%</strong>
            </div>
            <div style={{ width: '100%', height: '4px', background: '#e5e7eb', borderRadius: '2px' }}><div style={{ width: '99.2%', height: '100%', background: '#10b981', borderRadius: '2px' }}></div></div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="subtle">Match Precision / Recall</span>
              <strong>98.5% / 96.0%</strong>
            </div>
            <div style={{ width: '100%', height: '4px', background: '#e5e7eb', borderRadius: '2px' }}><div style={{ width: '98.5%', height: '100%', background: '#f59e0b', borderRadius: '2px' }}></div></div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="subtle">False-Positive Anomaly Rate</span>
              <strong>1.2%</strong>
            </div>
            <div style={{ width: '100%', height: '4px', background: '#e5e7eb', borderRadius: '2px' }}><div style={{ width: '1.2%', height: '100%', background: '#ef4444', borderRadius: '2px' }}></div></div>
          </div>
        </div>
        
        <hr style={{ margin: '2rem 0', borderColor: 'var(--border)' }} />
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>Avg Processing Time</p>
            <strong style={{ fontSize: '1.5rem' }}>1.4s</strong>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>Avg Exception-Resolution</p>
            <strong style={{ fontSize: '1.5rem' }}>45s</strong>
          </div>
          <div>
            <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>Customer Corrections (30d)</p>
            <strong style={{ fontSize: '1.5rem' }}>142</strong>
            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'block' }}>Improving models...</span>
          </div>
        </div>
      </div>
    </main>
  );
}
