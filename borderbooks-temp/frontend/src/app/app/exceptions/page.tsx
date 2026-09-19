"use client";
import { Check, X, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

const mockExceptions = [
  {
    id: 'INV-4921',
    supplier: 'Acme Corp',
    amount: '₹1,45,250',
    issue: 'Amount Mismatch',
    confidence: 97,
    explanation: [
      { text: 'Supplier exact match', status: 'pass' },
      { text: 'PO #4421 exact match', status: 'pass' },
      { text: 'Currency exact (INR)', status: 'pass' },
      { text: 'Total differs by ₹1,250', status: 'fail' },
      { text: 'Tax differs by ₹225', status: 'fail' }
    ]
  },
  {
    id: 'INV-8832',
    supplier: 'Global Tech',
    amount: '$4,200',
    issue: 'Suspected Duplicate',
    confidence: 82,
    explanation: [
      { text: 'Supplier exact match', status: 'pass' },
      { text: 'Amount exact match', status: 'pass' },
      { text: 'Date within 3 days of INV-8830', status: 'fail' },
      { text: 'Invoice number is 1 digit off', status: 'fail' }
    ]
  }
];

export default function InvoiceExceptions() {
  const [exceptions, setExceptions] = useState(mockExceptions);

  const resolve = (id: string) => {
    setExceptions(exceptions.filter(e => e.id !== id));
  };

  return (
    <main className="page narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">02 / HUMAN IN THE LOOP</p>
          <h1>Exceptions Queue</h1>
          <p className="subtle">Review flagged invoices. Your corrections become training data to improve supplier-specific matching models.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2rem' }}>
        {exceptions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <h3 style={{ color: '#10b981' }}>Inbox Zero!</h3>
            <p className="subtle">All invoices have been processed or reviewed.</p>
          </div>
        ) : (
          exceptions.map(exc => (
            <div key={exc.id} className="card" style={{ borderLeft: '4px solid #f59e0b', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                    {exc.supplier} - {exc.id}
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#fef3c7', color: '#b45309', borderRadius: '12px', fontWeight: 600 }}>{exc.issue}</span>
                  </h3>
                  <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{exc.amount}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="eyebrow" style={{ margin: 0 }}>AI CONFIDENCE</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 600, color: exc.confidence > 90 ? '#10b981' : '#f59e0b' }}>{exc.confidence}%</p>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #eee' }}>
                <p className="eyebrow" style={{ marginBottom: '0.5rem' }}>EXPLANATION TRACE</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {exc.explanation.map((exp, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: exp.status === 'pass' ? '#166534' : '#991b1b' }}>
                      {exp.status === 'pass' ? <Check size={16} /> : <AlertTriangle size={16} />}
                      {exp.text}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="button" style={{ background: '#10b981' }} onClick={() => resolve(exc.id)}>Approve Exception</button>
                <button className="button secondary" onClick={() => resolve(exc.id)}>Reject & Flag</button>
                <button className="button secondary">Edit Fields</button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
