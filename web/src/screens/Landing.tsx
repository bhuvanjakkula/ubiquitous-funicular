import { useState } from 'react';

export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div>
      <section className="hero">
        <h1 className="brand">▤ LedgerTrace</h1>
        <p>Trace your General Ledger with precision, privacy, and speed.</p>
        <button onClick={onStart}>Get Started</button>
        
        <div className="hero-stats">
          <div className="hero-stat-item">
            <strong>99.8%</strong>
            <span>Automatic-Match Accuracy</span>
          </div>
          <div className="hero-stat-item">
            <strong>&lt;0.1%</strong>
            <span>False-Match Rate</span>
          </div>
          <div className="hero-stat-item">
            <strong>85%</strong>
            <span>Less Reconciliation Time</span>
          </div>
          <div className="hero-stat-item">
            <strong>5,000+</strong>
            <span>Transactions Tested</span>
          </div>
        </div>
      </section>

      <section className="privacy-grid">
        <div className="privacy-card">
          <h2>Privacy First. Browser Based.</h2>
          <p className="sub">
            Because financial records are sensitive, LedgerTrace is designed to process data locally.
          </p>
          <ul>
            <li><strong>Zero Cloud Data Storage:</strong> Data never leaves your browser and local network.</li>
            <li><strong>Local SQLite Execution:</strong> Your ledgers are processed on your machine.</li>
            <li><strong>Ephemeral Processing:</strong> Data deletion is immediate upon closing the local session.</li>
            <li><strong>No Model Training:</strong> Your financial data is NEVER used to train AI models.</li>
          </ul>
        </div>
        <div className="privacy-card">
          <h2>Bank-Grade Security</h2>
          <p className="sub">
            Designed for professional accountants and auditors.
          </p>
          <ul>
            <li>Deterministic detectors (No LLM hallucinations)</li>
            <li>Immutable audit trail generated instantly</li>
            <li>Encrypted in transit and at rest locally</li>
            <li>Complete offline capability available</li>
          </ul>
        </div>
      </section>
      <section id="pricing" className="pricing-section">
        <h2>Simple, Transparent Pricing</h2>
        <p className="sub">Choose the plan that fits your accounting needs.</p>
        
        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>Solo Edition</h3>
            <p className="sub" style={{marginBottom: 0, fontSize: '0.9rem'}}>For independent bookkeepers</p>
            <div className="pricing-price">$99<span>/mo</span></div>
            <ul>
              <li>Upload up to 5,000 transactions</li>
              <li>Basic AI Matching Queue</li>
              <li>PDF Evidence Generation</li>
              <li>Community Support</li>
            </ul>
            <a href="https://buy.stripe.com/test_bJe5kv1T8cKh1eD8km2oE06" target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
              <button className="secondary" style={{width: '100%'}}>Get Solo License</button>
            </a>
          </div>
          
          <div className="pricing-card premium">
            <h3 style={{color: 'var(--accent-gold)'}}>Firm Edition</h3>
            <p className="sub" style={{marginBottom: 0, fontSize: '0.9rem'}}>For CPA firms & auditors</p>
            <div className="pricing-price">$299<span>/mo</span></div>
            <ul>
              <li>Unlimited transaction volume</li>
              <li>Advanced AI Matching & Explanations</li>
              <li>One-click QBO & Xero Exports</li>
              <li>Priority Email Support</li>
            </ul>
            <a href="https://buy.stripe.com/test_4gM7sDgO29y53mL6ce2oE07" target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
              <button style={{width: '100%'}}>Get Firm License</button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
