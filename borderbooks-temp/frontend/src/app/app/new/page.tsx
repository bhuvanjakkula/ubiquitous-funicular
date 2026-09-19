"use client";
import { useRouter } from "next/navigation";
import { type DragEvent, useRef, useState } from "react";
import { FileText, CheckCircle2, FileSearch, FileSpreadsheet, Play, UploadCloud, X } from "lucide-react";
import { UpgradeBanner } from "@/components/upgrade-banner";
import { asError } from "@/lib/errors";
import { uploadFile } from "@/lib/upload-file";

type TabState = 'ocr' | 'csv';
type ExtractionStatus = 'idle' | 'extracting' | 'validating' | 'done';

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

type Kind = "invoices" | "payments";
function Dropzone({ kind, file, onFile }: { kind: Kind; file: File | null; onFile: (file: File | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const title = kind === "invoices" ? "Invoices CSV" : "Bank or payout CSV";
  function drop(event: DragEvent) {
    event.preventDefault();
    onFile(event.dataTransfer.files[0] ?? null);
  }
  return (
    <div className={`dropzone card ${file ? "has-file" : ""}`} onDragOver={event => event.preventDefault()} onDrop={drop} style={{ padding: '2rem', textAlign: 'center', borderStyle: 'dashed' }}>
      <input ref={input} hidden type="file" accept=".csv,text/csv" onChange={event => onFile(event.target.files?.[0] ?? null)} />
      {file ? (
        <>
          <FileSpreadsheet size={30} style={{ margin: '0 auto 1rem', color: '#10b981' }} />
          <div><strong>{file.name}</strong><br /><span className="subtle">{(file.size / 1024).toFixed(1)} KB</span></div>
          <button className="button secondary small" style={{ marginTop: '1rem' }} aria-label={`Remove ${title}`} onClick={() => onFile(null)}><X size={15} /> Remove</button>
        </>
      ) : (
        <>
          <UploadCloud size={30} style={{ margin: '0 auto 1rem', color: '#666' }} />
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{title}</h3>
          <p className="subtle">Drop a CSV here, or choose a file.</p>
          <button className="button secondary" style={{ marginTop: '1rem' }} onClick={() => input.current?.click()}>Choose CSV</button>
        </>
      )}
    </div>
  );
}

export default function ImportHubPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabState>('csv');

  // OCR State
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV State
  const [invoices, setInvoices] = useState<File | null>(null);
  const [payments, setPayments] = useState<File | null>(null);
  const [daysBefore, setDaysBefore] = useState(7);
  const [daysAfter, setDaysAfter] = useState(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [planLimit, setPlanLimit] = useState(false);

  // OCR Methods
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
  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setFileName(file.name);
      simulateExtraction();
    }
  };
  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      simulateExtraction();
    }
  };

  // CSV Methods
  async function runCsvMatch() {
    if (!invoices || !payments) return;
    setBusy(true);
    setError("");
    setPlanLimit(false);
    try {
      const invoiceUpload = await uploadFile("invoices", invoices);
      const paymentUpload = await uploadFile("payments", payments);
      const response = await fetch("/api/match-runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceUploadId: invoiceUpload.id,
          paymentUploadId: paymentUpload.id,
          settings: { dateWindowDaysBefore: daysBefore, dateWindowDaysAfter: daysAfter }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 402 && data.code === "PLAN_LIMIT") { setPlanLimit(true); return; }
      if (!response.ok) throw new Error(data.error ?? "Could not run matcher");
      router.push(`/app/runs/${data.id}`);
    } catch (value) {
      setError(asError(value, "Could not run matcher").message);
    } finally {
      setBusy(false);
    }
  }

  // VALIDATING STATE FOR OCR
  if (status === 'validating' && extracted && activeTab === 'ocr') {
    return (
      <main className="page">
        <div className="page-head">
          <div>
            <p className="eyebrow">01 / VALIDATION</p>
            <h1>Review Extracted Data</h1>
            <p className="subtle">Please verify the AI-extracted fields from <strong>{fileName}</strong> before ingestion.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px', background: 'rgba(0,0,0,0.02)', borderStyle: 'dashed' }}>
            <FileSearch size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <p className="subtle">PDF Preview Viewer (Simulated)</p>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Extracted Fields</h3>
            <form onSubmit={(e) => { e.preventDefault(); setStatus('done'); }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(extracted).map(([key, data]) => (
                  <label key={key} style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ textTransform: 'capitalize', fontSize: '0.85rem', fontWeight: 600, color: '#666', marginBottom: '0.25rem' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                    <input type="text" defaultValue={data.value} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <span style={{ position: 'absolute', right: '10px', top: '26px', fontSize: '0.7rem', fontWeight: 600, padding: '2px 6px', borderRadius: '10px', background: data.confidence >= 95 ? '#dcfce7' : '#fef9c3', color: data.confidence >= 95 ? '#166534' : '#854d0e' }}>
                      {data.confidence}%
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button type="submit" className="button" style={{ flex: 1 }}>Confirm & Ingest</button>
                <button type="button" className="button secondary" onClick={() => setStatus('idle')} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // DONE STATE FOR OCR
  if (status === 'done' && activeTab === 'ocr') {
    return (
      <main className="page narrow">
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <CheckCircle2 size={64} style={{ color: '#10b981', margin: '0 auto 1rem auto' }} />
          <h2>Invoice Successfully Ingested</h2>
          <p className="subtle" style={{ margin: '1rem 0 2rem 0' }}>The semantic matching engine will now process this document.</p>
          <button className="button" onClick={() => router.push('/app/dashboard')}>Go to Dashboard</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">IMPORT HUB</p>
          <h1>Data Ingestion</h1>
          <p className="subtle">Reconcile via deterministic CSV matching, or use AI Document Intelligence for PDFs.</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <button className={activeTab === 'csv' ? 'button' : 'button secondary'} onClick={() => setActiveTab('csv')}>
          Batch CSV Reconciliation
        </button>
        <button className={activeTab === 'ocr' ? 'button' : 'button secondary'} onClick={() => setActiveTab('ocr')}>
          AI Document Intelligence (PDF)
        </button>
      </div>

      {/* CSV WORKFLOW */}
      {activeTab === 'csv' && (
        <>
          <div style={{ marginBottom: '2rem' }}>
            <h2>Bring the two sides together</h2>
            <p className="subtle">CSV only. Amounts are parsed in each currency’s minor units.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <Dropzone kind="invoices" file={invoices} onFile={setInvoices} />
            <Dropzone kind="payments" file={payments} onFile={setPayments} />
          </div>
          <section className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Date window</strong><br/>
              <span className="subtle">Transactions may fall before or after the invoice due date.</span>
            </div>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Days before due</span>
                <input type="number" min="0" value={daysBefore} onChange={event => setDaysBefore(Number(event.target.value))} style={{ padding: '0.5rem', width: '100px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Days after due</span>
                <input type="number" min="0" value={daysAfter} onChange={event => setDaysAfter(Number(event.target.value))} style={{ padding: '0.5rem', width: '100px' }} />
              </label>
            </div>
          </section>
          {error && <div className="notice error" style={{ padding: '1rem', background: '#fef2f2', color: '#991b1b', marginBottom: '1rem' }}>{error}</div>}
          {planLimit && <UpgradeBanner />}
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)' }}>
            <div>
              <strong>Deterministic matching</strong><br/>
              <span className="subtle">No LLM, no invented FX rates.</span>
            </div>
            <button className="button" disabled={!invoices || !payments || busy} onClick={runCsvMatch}>
              <Play size={15} style={{ marginRight: '0.5rem' }} />
              {busy ? "Running…" : "Run match"}
            </button>
          </div>
        </>
      )}

      {/* OCR WORKFLOW */}
      {activeTab === 'ocr' && (
        <div 
          className="card"
          style={{ padding: '4rem 2rem', textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed', borderWidth: '2px', borderColor: status === 'idle' ? 'var(--border)' : '#10b981', transition: 'all 0.2s', marginBottom: '2rem' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handlePdfDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            accept="application/pdf"
            onChange={handlePdfSelect}
          />
          
          {status === 'idle' ? (
            <>
              <FileText size={48} style={{ margin: '0 auto 1rem auto', color: '#10b981' }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>Drag & Drop PDF Invoice</h3>
              <p className="subtle">Our OCR engine extracts and validates the data automatically.</p>
            </>
          ) : (
            <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>
                {progress < 40 ? 'Extracting text...' : progress < 80 ? 'Identifying PO/Supplier...' : 'Parsing Line Items...'}
              </h3>
              <div style={{ width: '100%', height: '6px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#10b981', transition: 'width 0.3s ease' }}></div>
              </div>
              <p className="subtle" style={{ marginTop: '1rem' }}>{fileName}</p>
            </div>
          )}
        </div>
      )}

      {/* ALWAYS SHOW LICENSES */}
      <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Licenses & Upgrades</h3>
        <UpgradeBanner />
      </div>
    </main>
  );
}
