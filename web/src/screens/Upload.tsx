import { useState, useRef } from 'react';
import { DISCLAIMER } from '../api';

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
      <p className="sub">Upload PDF invoices or receipts. Our OCR engine extracts and validates the data automatically.</p>
      <p className="notice">{DISCLAIMER}</p>
      
      <div 
        className="upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        onClick={() => fileInputRef.current?.click()}
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
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Drag & Drop PDF Invoice</h3>
            <p style={{ color: 'var(--text-secondary)' }}>or click to browse local files</p>
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
    </section>
  );
}
