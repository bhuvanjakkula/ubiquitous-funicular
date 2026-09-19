import { useState, useRef } from 'react';
import { createJob, runJob, DISCLAIMER } from '../api';
import { previewCsv } from '../csv';

type ExtractionStatus = 'idle' | 'uploading' | 'extracting' | 'validating' | 'done';

type ExtractedData = {
  supplier: { value: string, confidence: number };
  poNumber: { value: string, confidence: number };
  invoiceNumber: { value: string, confidence: number };
  amount: { value: string, confidence: number };
  tax: { value: string, confidence: number };
  date: { value: string, confidence: number };
};

const MOCK_EXTRACTION: ExtractedData = {
  supplier: { value: 'Acme Corp', confidence: 99 },
  poNumber: { value: 'PO-4421', confidence: 85 },
  invoiceNumber: { value: 'AC-2026-99', confidence: 92 },
  amount: { value: '145250', confidence: 99 },
  tax: { value: '225', confidence: 95 },
  date: { value: '2026-09-15', confidence: 98 },
};

export default function Upload({ jobId, onCreated, onRun }: { jobId: string, onCreated: (id: string) => void, onRun: () => void }) {
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bank, setBank] = useState<File>();
  const [gl, setGl] = useState<File>();
  const [previews, setPreviews] = useState<Record<string, string[][]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const simulateExtraction = () => {
    setStatus('extracting');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          setStatus('validating');
          setExtracted(MOCK_EXTRACTION);
          return 100;
        }
        return p + 20;
      });
    }, 500);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setFileName(file.name);
      simulateExtraction();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      simulateExtraction();
    }
  };

  async function file(kind: string, f?: File) {
    if (kind === 'bank') setBank(f);
    else setGl(f);
    setPreviews(p => ({ ...p, [kind]: [] }));
    if (f) {
      const rows = previewCsv(await f.text());
      setPreviews(p => ({ ...p, [kind]: rows }));
    }
  }

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bank || !gl) return;
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const optional = (key: string) => {
      const raw = String(form.get(key) || '');
      if (!raw) return null;
      const n = Number(raw);
      if (!Number.isSafeInteger(n)) throw Error(key + ' must be integer cents');
      return n;
    };
    try {
      const config = {
        entity_name: form.get('entity_name'),
        currency: form.get('currency'),
        cash_account_ids: String(form.get('cash_account_ids')).split(',').map(s => s.trim()).filter(Boolean),
        period_start: form.get('period_start'),
        period_end: form.get('period_end'),
        period_close_date: form.get('period_close_date') || null,
        expected_opening_cash_cents: optional('expected_opening_cash_cents'),
        expected_closing_cash_cents: optional('expected_closing_cash_cents'),
        expected_bank_statement_ending_cents: optional('expected_bank_statement_ending_cents'),
        export_dialect: form.get('export_dialect'),
        license_key: form.get('license_key')
      };
      const r = await createJob(bank, gl, config);
      onCreated(r.job_id);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    setBusy(true);
    setError('');
    try {
      await runJob(jobId);
      onRun();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  if (status === 'validating' && extracted) {
    return (
      <section>
        <p className="eyebrow">01 / VALIDATION</p>
        <h1>Review Extracted Data</h1>
        <p className="sub">Please verify the AI-extracted fields from <strong>{fileName}</strong> before ingestion.</p>
        
        <div className="dashboard-grid" style={{ marginTop: '2rem' }}>
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px dashed var(--border-color)' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: '1rem' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p style={{ color: 'var(--text-secondary)' }}>PDF Preview Viewer (Simulated)</p>
          </div>

          <div className="panel">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>Extracted Fields</h3>
            <form className="form-grid" style={{ gridTemplateColumns: '1fr' }} onSubmit={(e) => { e.preventDefault(); setStatus('done'); onCreated('job-8842'); }}>
              {Object.entries(extracted).map(([key, data]) => (
                <label key={key} style={{ position: 'relative' }}>
                  <span style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                  <input type="text" defaultValue={data.value} />
                  <span className={`badge ${data.confidence >= 95 ? 'high-confidence' : 'low-confidence'}`} style={{ position: 'absolute', right: '10px', top: '35px', fontSize: '0.65rem' }}>
                    {data.confidence}%
                  </span>
                </label>
              ))}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <button type="submit" style={{ flex: 1 }}>Confirm & Ingest</button>
                <button type="button" className="secondary" onClick={() => setStatus('idle')} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'done') {
    return (
      <section>
        <div className="panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ color: 'var(--accent-emerald)', fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <h2>Invoice Successfully Ingested</h2>
          <p className="sub">The semantic matching engine will now process this document.</p>
          <button style={{ marginTop: '2rem' }} onClick={onRun}>Go to Dashboard</button>
        </div>
      </section>
    );
  }

  return (
    <section>
      <p className="eyebrow">01 / IMPORT HUB</p>
      <h1>Document Intelligence Center</h1>
      <p className="sub">Upload PDF invoices or CSV bank/GL exports. Our system handles both seamlessly.</p>
      <p className="notice">{DISCLAIMER}</p>
      
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <div className="panel" style={{height: '100%'}}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>PDF Invoice Extraction</h2>
            <div 
              className="upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ marginTop: '1rem' }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="application/pdf"
                onChange={handleFileSelect}
              />
              {status === 'idle' ? (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Drag & Drop PDF</h3>
                  <p style={{ color: 'var(--text-secondary)' }}>or click to browse</p>
                </>
              ) : (
                <div style={{ width: '100%', maxWidth: '300px' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
                    {progress < 40 ? 'Extracting text...' : progress < 80 ? 'Identifying PO/Supplier...' : 'Parsing Line Items...'}
                  </h3>
                  <div style={{ width: '100%', height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-gold)', transition: 'width 0.3s ease' }}></div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{fileName}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: '2 1 500px' }}>
          <div className="panel">
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Bank & GL CSV Matching</h2>
            <form onSubmit={create}>
              <fieldset disabled={busy}>
                <div className="form-grid">
                  {[
                    ['entity_name','Entity name','text','Acme LLC'],
                    ['currency','Currency','text','USD'],
                    ['cash_account_ids','Cash account IDs','text','1000'],
                    ['period_start','Period start','date','2025-01-01'],
                    ['period_end','Period end','date','2025-12-31'],
                    ['period_close_date','Close date (optional)','date','2026-01-15'],
                    ['expected_opening_cash_cents','Opening cash (cents)','number','100000'],
                    ['expected_closing_cash_cents','Closing cash (cents)','number',''],
                    ['expected_bank_statement_ending_cents','Bank ending (cents)','number',''],
                    ['license_key','License Key (Required)','password','test_stripe_key']
                  ].map(([name,label,type,value]) => (
                    <label key={name}>
                      {label} 
                      {name==='license_key'&&<small>(Purchase <a href="https://buy.stripe.com/test_bJe5kv1T8cKh1eD8km2oE06" target="_blank" rel="noreferrer">Solo</a> or <a href="https://buy.stripe.com/test_4gM7sDgO29y53mL6ce2oE07" target="_blank" rel="noreferrer">Firm</a> license)</small>}
                      <input name={name} type={type} defaultValue={value} step={type==='number'?'1':undefined} required={!name.includes('expected_')&&name!=='period_close_date'}/>
                    </label>
                  ))}
                  <label>
                    Export dialect
                    <select name="export_dialect" defaultValue="generic">
                      <option value="generic">Generic</option>
                      <option value="qbo">QBO CSV</option>
                      <option value="xero">Xero CSV</option>
                    </select>
                  </label>
                </div>
                <div className="uploads" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                  {['bank','gl'].map(kind=><label className="file" key={kind}>{kind==='bank'?'Bank CSV':'GL CSV'}<input type="file" accept=".csv" required onChange={e=>void file(kind,e.target.files?.[0])}/></label>)}
                </div>
                <button type="submit">Create job</button>
              </fieldset>
            </form>

            {jobId && <p className="job" style={{ marginTop: '1rem' }}>Job {jobId} · ingested</p>}
            <button className="secondary" disabled={!jobId||busy} onClick={run} style={{ marginTop: '1rem', width: '100%' }}>
              {busy?'Working…':'Run AI Matching & Detectors'}
            </button>
            
            {error && <pre role="alert" style={{ marginTop: '1rem' }}>{error}</pre>}
            
            {Object.entries(previews).map(([kind,rows]) => rows?.length > 0 && (
              <div className="preview" key={kind} style={{ marginTop: '2rem' }}>
                <h2>{kind.toUpperCase()} preview</h2>
                <div className="scroll">
                  <table>
                    <thead>
                      <tr>{rows[0].map((h,i)=><th key={i}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.slice(1).map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>)}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
