"use client";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

export function UpgradeBanner() {
  return (
    <aside className="upgrade-banner" role="alert" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--amber-soft)', border: '1px solid #fcd34d', color: 'var(--ink)', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)' }}>
      <div>
        <strong style={{ fontSize: '1.1rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={18} style={{ color: '#b45309' }} />
          Plan Limit Reached
        </strong>
        <p style={{ color: '#b45309', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Your current plan cannot process this many rows. Please select a license to upgrade your capacity.
        </p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ background: 'rgba(255,255,255,0.7)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.9)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--green)', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Solo License</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>Up to 5,000 transactions / run</p>
          <a href="https://buy.stripe.com/test_00w28japEcKhaPd3022oE04" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="button secondary" style={{ width: '100%' }}>
              Upgrade to Solo <ArrowUpRight size={15} />
            </button>
          </a>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.7)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.9)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--amber)', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Firm / Company License</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>Unlimited volume & RBAC support</p>
          <a href="https://buy.stripe.com/test_fZu00bgO211z3mLbwy2oE05" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <button className="button" style={{ width: '100%', background: 'linear-gradient(135deg, var(--amber), #d97706)', color: 'white', border: 'none', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.3)' }}>
              Upgrade to Firm <ArrowUpRight size={15} />
            </button>
          </a>
        </div>
      </div>
    </aside>
  );
}
