import { useState } from 'react';

type Exception = {
  id: string;
  supplier: string;
  invoiceNumber: string;
  poNumber: string;
  confidence: number;
  reasons: string[];
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'corrected';
};

const MOCK_EXCEPTIONS: Exception[] = [
  {
    id: 'INV-8823',
    supplier: 'Acme Corp',
    invoiceNumber: 'AC-2026-99',
    poNumber: 'PO-4421',
    confidence: 97,
    reasons: ['Supplier exact', 'PO exact', 'Currency exact', 'Total differs by ₹1,250', 'Tax differs by ₹225'],
    amount: 145250,
    status: 'pending'
  },
  {
    id: 'INV-8845',
    supplier: 'Global Logistics',
    invoiceNumber: 'GL-902',
    poNumber: 'PO-4100',
    confidence: 82,
    reasons: ['Supplier fuzzy match (Global Logis)', 'PO exact', 'Line items match 80%'],
    amount: 45000,
    status: 'pending'
  }
];

export default function InvoiceExceptions({ onBack }: { onBack: () => void }) {
  const [exceptions, setExceptions] = useState<Exception[]>(MOCK_EXCEPTIONS);
  const [selected, setSelected] = useState<Exception | null>(null);

  const handleAction = (id: string, action: Exception['status']) => {
    setExceptions(exceptions.map(e => e.id === id ? { ...e, status: action } : e));
    setSelected(null);
  };

  const pendingCount = exceptions.filter(e => e.status === 'pending').length;

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">HUMAN-IN-THE-LOOP</p>
          <h1>Invoice Exceptions Queue</h1>
          <p className="sub">Review flagged invoices. Your corrections train the supplier-specific matching models.</p>
        </div>
        <button className="secondary" onClick={onBack}>← Back to Dashboard</button>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '2rem' }}>
        {exceptions.map(exc => {
          if (exc.status !== 'pending') return null;
          return (
            <div key={exc.id} className="metric-card" style={{ cursor: 'pointer', border: selected?.id === exc.id ? '1px solid var(--accent-gold)' : '' }} onClick={() => setSelected(exc)}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{exc.supplier}</strong>
                <span className={`badge ${exc.confidence > 90 ? 'high-confidence' : 'low-confidence'}`}>{exc.confidence}% Match</span>
              </div>
              <small style={{ display: 'block', marginTop: '0.5rem' }}>Inv: {exc.invoiceNumber} | PO: {exc.poNumber}</small>
              <div style={{ fontSize: '1.25rem', marginTop: '1rem', fontFamily: 'var(--font-display)' }}>₹{(exc.amount).toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {pendingCount === 0 && (
        <div className="panel" style={{ textAlign: 'center', marginTop: '2rem' }}>
          <h2>Queue Cleared</h2>
          <p className="sub">All invoice exceptions have been reviewed.</p>
        </div>
      )}

      {selected && (
        <aside>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>AI Explanation: {selected.invoiceNumber}</h2>
            <button className="secondary" onClick={() => setSelected(null)}>Close</button>
          </div>
          
          <div className="explanation" style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Match Confidence: {selected.confidence}%</h3>
            <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
              {selected.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>

          <p style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <em>Note: Correcting this invoice will update the semantic matching rules for supplier "{selected.supplier}". Separation of duties requires dual-approval for supplier bank detail changes.</em>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
            <button onClick={() => handleAction(selected.id, 'approved')}>Approve as is</button>
            <button className="secondary" onClick={() => handleAction(selected.id, 'corrected')} style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>Correct Line Items</button>
            <button className="reject" onClick={() => handleAction(selected.id, 'rejected')} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Reject & Flag Fraud</button>
          </div>
        </aside>
      )}
    </section>
  );
}
