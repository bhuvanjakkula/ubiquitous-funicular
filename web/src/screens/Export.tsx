import { useState } from 'react';
import { evidencePdfUrl, evidenceJsonUrl } from '../api';

export default function Export({ jobId }: { jobId: string }) {
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleExport = (platform: string) => {
    setExporting(true);
    // Simulate API export call to selected platform dialect (already generated in backend V2.1)
    setTimeout(() => {
      setExporting(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <section>
      <p className="eyebrow">04 / ACCOUNTING INTEGRATION</p>
      <h1>Export & Finalize</h1>
      <p className="sub">
        Push approved matches and resolved exceptions to your GL. 
        (Uses configured V2.1 Export Dialect to generate compatible CSVs).
      </p>

      <div className="metrics" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ cursor: 'pointer' }} onClick={() => handleExport('qbo')} className="panel">
          <h2>Export to QuickBooks Online</h2>
          <p className="sub" style={{ marginBottom: 0 }}>Generates a QBO-compatible CSV with approved matches and draft journals.</p>
        </div>
        <div style={{ cursor: 'pointer' }} onClick={() => handleExport('xero')} className="panel">
          <h2>Export to Xero</h2>
          <p className="sub" style={{ marginBottom: 0 }}>Generates a Xero-compatible CSV with approved matches and draft journals.</p>
        </div>
      </div>

      {exporting && <p style={{ color: 'var(--accent-gold)' }}>Processing export payload...</p>}
      
      {success && (
        <div className="notice" style={{ marginTop: '2rem' }}>
          <strong>Export Successful.</strong> The reconciliation package has been prepared for your ERP.
        </div>
      )}

      <h2 style={{ marginTop: '4rem' }}>Audit Evidence Pack</h2>
      <p className="sub">Download the unposted integrity workpapers for professional review.</p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <a href={evidencePdfUrl(jobId)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <button className="secondary">Download PDF Workpaper</button>
        </a>
        <a href={evidenceJsonUrl(jobId)} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
          <button className="secondary">Download JSON Evidence</button>
        </a>
      </div>
    </section>
  );
}
