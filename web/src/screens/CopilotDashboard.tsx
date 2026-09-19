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

      <div className="dashboard-grid">
        <div className="metric-card">
          <small>INVOICES PROCESSED</small>
          <strong>1,284</strong>
          <span className="trend positive">↑ 12% vs last week</span>
        </div>
        <div className="metric-card">
          <small>AUTOMATICALLY MATCHED</small>
          <strong>1,176</strong>
          <span className="trend positive">91.5% Match Rate</span>
        </div>
        <div className="metric-card action-required" onClick={onReviewExceptions}>
          <small>NEEDS REVIEW</small>
          <strong>73</strong>
          <span className="trend negative">Action Required</span>
        </div>
        <div className="metric-card alert">
          <small>SUSPECTED DUPLICATES</small>
          <strong>21</strong>
          <span className="trend negative">High Risk</span>
        </div>
        <div className="metric-card alert">
          <small>UNUSUAL TRANSACTIONS</small>
          <strong>14</strong>
          <span className="trend negative">Anomaly Detected</span>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '3rem' }}>
        <h2>System Intelligence Status</h2>
        <ul style={{ marginTop: '1rem', lineHeight: '1.8' }}>
          <li>✓ <strong>Document Intelligence:</strong> OCR engine active and learning.</li>
          <li>✓ <strong>Semantic Matching:</strong> Invoice-to-PO exact & fuzzy matching enabled.</li>
          <li>✓ <strong>Duplicate Detection:</strong> Cross-referencing amount, supplier, and dates.</li>
          <li>✓ <strong>Continuous Learning:</strong> Human-in-the-loop corrections updating matching weights.</li>
        </ul>
      </div>
    </section>
  );
}
