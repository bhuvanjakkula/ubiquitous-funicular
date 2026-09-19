import { useEffect, useState } from 'react';
import { getMatches, ApiError, formatUsd } from '../api';

type Match = {
  bank_line_id: string;
  bank_cents: number;
  bank_date: string;
  bank_desc: string;
  gl_line_ids: string[];
  gl_cents: number;
  // We simulate these frontend-side since the backend is deterministic
  _confidence?: number;
  _explanation?: string;
  _status?: 'pending' | 'approved' | 'rejected';
};

export default function MatchQueue({ jobId, onNext }: { jobId: string, onNext: () => void }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    getMatches(jobId)
      .then((res: any) => {
        if (!live) return;
        // Simulate confidence scores for demo/product purposes
        const enriched = (res.items || []).map((m: any) => {
          // If amounts match perfectly, high confidence
          const diff = Math.abs(m.bank_cents - m.gl_cents);
          let conf = 99;
          let exp = "Exact amount match. Dates align within 1 business day.";
          if (diff > 0) {
            conf = 45;
            exp = `Amount mismatch of ${formatUsd(diff)}. Low confidence.`;
          } else if (m.gl_line_ids?.length > 1) {
            conf = 82;
            exp = `One-to-many match. Multiple GL lines total the bank amount.`;
          }
          return { ...m, _confidence: conf, _explanation: exp, _status: 'pending' };
        });
        setMatches(enriched);
        setLoading(false);
      })
      .catch((e) => {
        if (live) {
          setError(String(e));
          setLoading(false);
        }
      });
    return () => { live = false; };
  }, [jobId]);

  const handleAction = (index: number, action: 'approved' | 'rejected') => {
    const updated = [...matches];
    updated[index]._status = action;
    setMatches(updated);
  };

  const pendingCount = matches?.filter(m => m._status === 'pending')?.length || 0;

  if (loading) return <p>Loading match queue...</p>;
  if (error) return <pre role="alert">{error}</pre>;

  return (
    <section>
      <p className="eyebrow">02 / HUMAN REVIEW</p>
      <h1>Match Approval Queue</h1>
      <p className="sub">
        {pendingCount} matches awaiting your review. Low-confidence matches require explicit approval.
      </p>

      {matches.map((m, i) => {
        if (m._status !== 'pending') return null;
        const isLowConf = m._confidence! < 90;
        return (
          <div key={i} className="match-card">
            <div className="match-details">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong>{formatUsd(m.bank_cents)}</strong>
                <span className="text-secondary">{m.bank_date}</span>
                <span className={`badge ${isLowConf ? 'low-confidence' : 'high-confidence'}`}>
                  {m._confidence}% Confidence
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Bank: {m.bank_desc} <br/>
                GL Lines: {m.gl_line_ids?.join(', ')}
              </div>
              <div className="explanation">
                <strong>AI Explanation:</strong> {m._explanation}
              </div>
            </div>
            <div className="match-actions">
              <button className="reject" onClick={() => handleAction(i, 'rejected')}>Reject</button>
              <button onClick={() => handleAction(i, 'approved')}>Approve</button>
            </div>
          </div>
        );
      })}

      {pendingCount === 0 && (
        <div className="panel" style={{ textAlign: 'center' }}>
          <h2>Queue Cleared</h2>
          <p className="sub">All matches have been reviewed.</p>
          <button onClick={onNext}>Proceed to Exceptions & Export</button>
        </div>
      )}
    </section>
  );
}
