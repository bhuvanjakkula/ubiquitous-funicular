import { useState } from 'react';

export default function CopilotDashboard({ onReviewExceptions }: { onReviewExceptions: () => void }) {
  const [query, setQuery] = useState('');

  return (
    <section>
      <p className="eyebrow">COMMAND CENTER</p>
      <h1>BorderBooks AI Copilot</h1>
      <p className="sub">
        Intelligent financial-control layer. Real-time invoice-to-PO matching and anomaly detection.
      </p>

      <div className="nlp-search">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          placeholder='Try asking: "Show unpaid invoices above ₹5 lakh that are more than 30 days overdue"' 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="secondary" style={{padding: '0.5rem 1rem'}}>Ask AI</button>
      </div>

      <h2 style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1rem', marginTop: '2rem' }}>Core AP Operations</h2>
      <div className="dashboard-grid">
        <div className="metric-card" style={{ borderColor: 'var(--accent-emerald)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <small>STRAIGHT-THROUGH PROCESSING (STP)</small>
          <strong>91.5%</strong>
          <span className="trend positive">Safely processed without manual intervention</span>
        </div>
        <div className="metric-card">
          <small>INVOICES PROCESSED</small>
          <strong>1,284</strong>
          <span className="trend positive">1,176 auto-matched</span>
        </div>
        <div className="metric-card action-required" onClick={onReviewExceptions}>
          <small>NEEDS REVIEW</small>
          <strong>73</strong>
          <span className="trend negative">Action Required</span>
        </div>
        <div className="metric-card alert">
          <small>HIGH RISK ANOMALIES</small>
          <strong>35</strong>
          <span className="trend negative">21 duplicates, 14 unusual</span>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '3rem' }}>
        <h2>AI Value & Performance Metrics</h2>
        <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Extraction Accuracy</span>
              <span style={{ fontWeight: 'bold' }}>99.2%</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px' }}><div style={{ width: '99.2%', height: '100%', background: 'var(--accent-emerald)', borderRadius: '2px' }}></div></div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Match Precision / Recall</span>
              <span style={{ fontWeight: 'bold' }}>98.5% / 96.0%</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px' }}><div style={{ width: '98.5%', height: '100%', background: 'var(--accent-gold)', borderRadius: '2px' }}></div></div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>False-Positive Anomaly Rate</span>
              <span style={{ fontWeight: 'bold' }}>1.2%</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px' }}><div style={{ width: '1.2%', height: '100%', background: 'var(--accent-red)', borderRadius: '2px' }}></div></div>
          </div>
        </div>
        
        <div className="dashboard-grid" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
          <div>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Avg Processing Time</small>
            <strong style={{ fontSize: '1.5rem' }}>1.4s</strong>
          </div>
          <div>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Avg Exception-Resolution</small>
            <strong style={{ fontSize: '1.5rem' }}>45s</strong>
          </div>
          <div>
            <small style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Customer Corrections (30d)</small>
            <strong style={{ fontSize: '1.5rem' }}>142</strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)', display: 'block' }}>Improving models...</span>
          </div>
        </div>
      </div>
    </section>
  );
}
