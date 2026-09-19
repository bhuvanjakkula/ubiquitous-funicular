"use client";
import { ShieldCheck, ShieldAlert, Key, Globe, Lock, Activity, Database, Server } from 'lucide-react';

type LogEvent = {
  id: string;
  who: string;
  role: string;
  what: string;
  when: string;
  deviceIp: string;
  before: string | null;
  after: string;
  authz: string;
  status: 'SUCCESS' | 'DENIED' | 'PENDING DUAL-APPROVAL';
};

const auditLogs: LogEvent[] = [
  {
    id: 'evt_99831',
    who: 'alice@borderbooks.com',
    role: 'Finance Admin',
    what: 'Vendor Bank Account Change',
    when: '2026-09-19T14:32:01Z',
    deviceIp: '192.168.1.105 (Mac OS)',
    before: 'Acct: ****4421, Routing: 021000021',
    after: 'Acct: ****9982, Routing: 122000661',
    authz: 'MFA_VERIFIED (Passkey)',
    status: 'PENDING DUAL-APPROVAL'
  },
  {
    id: 'evt_99830',
    who: 'system_matcher',
    role: 'AI Engine',
    what: 'Auto-Matched Invoice INV-4921',
    when: '2026-09-19T14:30:15Z',
    deviceIp: 'Internal Network',
    before: null,
    after: 'Matched with PO-4421',
    authz: 'SYSTEM_ROLE',
    status: 'SUCCESS'
  },
  {
    id: 'evt_99829',
    who: 'bob@borderbooks.com',
    role: 'Read-only',
    what: 'Attempted to approve payment',
    when: '2026-09-19T14:15:00Z',
    deviceIp: '203.0.113.45 (Windows)',
    before: 'Payment Pending',
    after: 'Payment Approved',
    authz: 'RBAC_EVALUATION',
    status: 'DENIED'
  }
];

export default function SecurityAuditLog() {
  return (
    <main className="page" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--line)', paddingBottom: '2rem', marginBottom: '2rem' }}>
        <div>
          <p style={{ color: 'var(--green)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock size={14} /> ZERO-TRUST ARCHITECTURE</p>
          <h1 style={{ color: 'var(--ink)', fontSize: '2.5rem', margin: '0 0 0.5rem 0', fontWeight: 700 }}>Immutable Audit Ledger</h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', maxWidth: '600px', margin: 0 }}>Cryptographically signed history of all financial mutations. Tenant-isolated and AES-256 encrypted at rest.</p>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--green)', fontSize: '0.9rem', fontWeight: 600, background: 'var(--green-soft)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <Activity size={16} /> SYSTEM NORMAL
          </div>
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>Last sync: {new Date().toISOString()}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--green-soft)', borderRadius: '8px', color: 'var(--green)' }}><ShieldCheck size={24} /></div>
          <div><p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em' }}>RBAC EVALUATION</p><strong style={{ fontSize: '1.25rem', color: 'var(--ink)' }}>Enforcing Strict</strong></div>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', color: '#3b82f6' }}><Key size={24} /></div>
          <div><p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em' }}>MFA / PASSKEYS</p><strong style={{ fontSize: '1.25rem', color: 'var(--ink)' }}>Required Globally</strong></div>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--purple-soft)', borderRadius: '8px', color: 'var(--purple)' }}><Database size={24} /></div>
          <div><p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em' }}>DATA ENCRYPTION</p><strong style={{ fontSize: '1.25rem', color: 'var(--ink)' }}>AES-256 GCM</strong></div>
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead style={{ background: 'var(--gray-soft)', borderBottom: '1px solid var(--line)' }}>
            <tr>
              <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>EVENT ID / UTC TIME</th>
              <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>IDENTITY</th>
              <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>MUTATION / FORENSICS</th>
              <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>ORIGIN</th>
              <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>AUTHZ TRACE</th>
              <th style={{ padding: '1rem', color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--line)', transition: 'background 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--paper)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '1rem', verticalAlign: 'top', fontFamily: 'monospace' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ink)' }}>
                    <Server size={12} style={{ color: 'var(--muted)' }} /> {log.id}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginTop: '0.25rem' }}>{log.when}</span>
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                  <strong style={{ color: 'var(--ink)' }}>{log.who}</strong><br/>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Role: {log.role}</span>
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                  <strong style={{ color: 'var(--ink)', display: 'block', marginBottom: '0.5rem' }}>{log.what}</strong>
                  {log.before && (
                    <div style={{ padding: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace', marginBottom: '0.25rem' }}>
                      <del>{log.before}</del>
                    </div>
                  )}
                  <div style={{ padding: '0.5rem', background: 'var(--green-soft)', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--green)', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {log.after}
                  </div>
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--ink)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    <Globe size={14} style={{ color: 'var(--muted)' }} />
                    {log.deviceIp}
                  </div>
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                  <span style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'var(--gray-soft)', color: 'var(--ink)', borderRadius: '4px', fontFamily: 'monospace', border: '1px solid var(--line)' }}>
                    {log.authz}
                  </span>
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                  {log.status === 'SUCCESS' && <span style={{ color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><ShieldCheck size={16}/> {log.status}</span>}
                  {log.status === 'DENIED' && <span style={{ color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><ShieldAlert size={16}/> {log.status}</span>}
                  {log.status === 'PENDING DUAL-APPROVAL' && <span style={{ color: 'var(--amber)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><Lock size={16}/> {log.status}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
