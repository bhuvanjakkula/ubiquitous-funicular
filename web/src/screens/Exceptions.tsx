import { useEffect, useState } from 'react';
import { getJob, getFindings, formatUsd, ApiError, type Finding } from '../api';

export default function Exceptions({ jobId, onNext }: { jobId: string, onNext: () => void }) {
  const [items, setItems] = useState<Finding[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Finding>();

  useEffect(() => {
    let live = true;
    Promise.all([getJob(jobId), getFindings(jobId)])
      .then(([, f]) => {
        if (live) setItems(f.items);
      })
      .catch(e => {
        if (live) setError(String(e));
      });
    return () => { live = false; };
  }, [jobId]);

  const exceptions = items?.filter(f => f.severity === 'FAIL' || f.severity === 'UNKNOWN') || [];

  return (
    <section>
      <p className="eyebrow">03 / EXCEPTION QUEUE</p>
      <h1>Manual Exceptions Review</h1>
      <p className="sub">
        {exceptions.length} exceptions require your attention (Unmatched lines or Integrity breaks).
      </p>

      {error && <pre role="alert">{error}</pre>}

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Severity</th>
              <th>Detector</th>
              <th>Title</th>
              <th>Amount</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map(f => (
              <tr key={f.id}>
                <td><span className={`badge ${f.severity === 'FAIL' ? 'low-confidence' : 'info'}`}>{f.severity}</span></td>
                <td>{f.detector_id}</td>
                <td>{f.title}</td>
                <td>{formatUsd(f.amount_cents)}</td>
                <td>
                  <button className="text-button" onClick={() => setSelected(f)}>Investigate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!exceptions?.length && !error && (
        <div className="panel" style={{ textAlign: 'center', marginTop: '2rem' }}>
          <h2>No Exceptions</h2>
          <p className="sub">All records perfectly matched or reconciled.</p>
        </div>
      )}

      {selected && (
        <aside>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{selected.title}</h2>
            <button className="secondary" onClick={() => setSelected(undefined)}>Close</button>
          </div>
          <pre>{JSON.stringify(selected.payload, null, 2)}</pre>
          {(['cite_bank_ids', 'cite_line_ids', 'cite_entry_ids'] as const).map(key => (
            <div key={key}>
              <h3 style={{ fontSize: '1rem', marginTop: '1rem' }}>{key.replace('cite_', '')}</h3>
              <ul>
                {selected[key]?.map(id => <li key={id}>{id}</li>)}
              </ul>
            </div>
          ))}
          <div style={{ marginTop: '2rem' }}>
            <button style={{ width: '100%' }}>Mark as Resolved</button>
          </div>
        </aside>
      )}

      <div style={{ marginTop: '3rem', textAlign: 'right' }}>
        <button onClick={onNext}>Finalize & Export</button>
      </div>
    </section>
  );
}
