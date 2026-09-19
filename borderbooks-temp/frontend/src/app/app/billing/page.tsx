"use client";
import { Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { asError } from "@/lib/errors";

export default function BillingPage() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function open(path: string, body: unknown) {
    setBusy(path);
    setError("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error ?? "Could not open billing");
      window.location.assign(data.url);
    } catch (value) {
      setError(asError(value, "Could not open billing").message);
      setBusy("");
    }
  }

  return (
    <main className="page narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>Plans sized to the work</h1>
          <p className="subtle">Access the intelligent financial-control layer, OCR, and deterministic matching engine.</p>
        </div>
        <button className="button secondary" onClick={() => open("/api/billing/portal", {})} disabled={Boolean(busy)}>
          Manage billing <ExternalLink size={15} />
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}

      <div className="pricing-grid">
        <section className="price-card card">
          <p className="eyebrow">Solo License</p>
          <h2>$29 <small>/ month</small></h2>
          <ul>
            <li><Check size={15} /> One workspace</li>
            <li><Check size={15} /> 2,000 rows per run</li>
            <li><Check size={15} /> CSV & PDF OCR uploads</li>
            <li><Check size={15} /> Standard Support</li>
          </ul>
          <a className="button secondary" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }} href="https://buy.stripe.com/test_00w28japEcKhaPd3022oE04" target="_blank" rel="noopener noreferrer">
            Choose Solo
          </a>
        </section>
        
        <section className="price-card featured card">
          <p className="eyebrow">Firm / Company</p>
          <h2>$79 <small>/ month</small></h2>
          <ul>
            <li><Check size={15} /> Multi-user RBAC</li>
            <li><Check size={15} /> 10,000 rows per run</li>
            <li><Check size={15} /> Stripe & Forensic splits</li>
            <li><Check size={15} /> Priority Support</li>
          </ul>
          <a className="button" style={{ textDecoration: 'none', textAlign: 'center', display: 'block' }} href="https://buy.stripe.com/test_fZu00bgO211z3mLbwy2oE05" target="_blank" rel="noopener noreferrer">
            Choose Firm
          </a>
        </section>
      </div>

      <p className="privacy-line">Statement data is not used for training. BorderBooks sends only workspace and plan identifiers to Stripe.</p>
    </main>
  );
}
