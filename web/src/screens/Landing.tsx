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
    </div>
  );
}
