import { useState } from 'react';

type LogEvent = {
  id: string;
  who: string;
  role: string;
  what: string;
  when: string;
  deviceIp: string;
  before: string;
  after: string;
  authz: string;
  status: 'SUCCESS' | 'DENIED' | 'FLAGGED' | 'PENDING DUAL-APPROVAL';
};

const MOCK_LOGS: LogEvent[] = [
  { id: 'EV-1004', who: 'sarah.j@LedgerTrace.com', role: 'Finance Admin', what: 'Supplier Bank Account Change', when: '2026-09-19 14:32:10 UTC', deviceIp: 'MacBook Pro / 192.168.1.5', before: 'Acc: ****1122 (Chase)', after: 'Acc: ****9988 (BofA)', authz: 'MFA Verified', status: 'PENDING DUAL-APPROVAL' },
  { id: 'EV-1005', who: 'sarah.j@LedgerTrace.com', role: 'Finance Admin', what: 'Payment Approval Attempt', when: '2026-09-19 14:35:05 UTC', deviceIp: 'MacBook Pro / 192.168.1.5', before: 'Status: Pending', after: 'Status: Approved', authz: 'MFA Verified', status: 'DENIED' },
  { id: 'EV-1006', who: 'david.r@LedgerTrace.com', role: 'Approver', what: 'Payment Approved', when: '2026-09-19 14:40:12 UTC', deviceIp: 'Windows / 10.0.0.12', before: 'Status: Pending', after: 'Status: Approved', authz: 'Hardware Passkey', status: 'SUCCESS' },
  { id: 'EV-1007', who: 'System (Malware Scanner)', role: 'System', what: 'File Upload Scanned', when: '2026-09-19 15:01:22 UTC', deviceIp: 'Internal Network', before: 'Unscanned', after: 'Clean', authz: 'System Role', status: 'SUCCESS' },
  { id: 'EV-1008', who: 'unknown', role: 'None', what: 'API Authentication', when: '2026-09-19 15:15:40 UTC', deviceIp: '198.51.100.14', before: 'N/A', after: 'N/A', authz: 'Failed Token', status: 'FLAGGED' },
];

export default function SecurityAuditLog() {
  const [logs] = useState<LogEvent[]>(MOCK_LOGS);

  return (
    <section>
      <p className="eyebrow">SECURITY ARCHITECTURE</p>
      <h1>Immutable Audit Log</h1>
      <p className="sub">
        Cryptographically secured event history. Enforcing separation of duties, RBAC, and tenant isolation. Ordinary application users cannot alter this history.
      </p>

      <div className="dashboard-grid" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <div className="metric-card" style={{ borderColor: 'var(--accent-emerald)' }}>
          <small>FRAUD CONTROL</small>
          <strong>Dual-Approval</strong>
          <span className="trend positive">Active on Bank Changes</span>
        </div>
        <div className="metric-card" style={{ borderColor: 'var(--accent-emerald)' }}>
          <small>ENCRYPTION</small>
          <strong>AES-256</strong>
          <span className="trend positive">At Rest & In Transit</span>
        </div>
        <div className="metric-card" style={{ borderColor: 'var(--accent-gold)' }}>
          <small>SEPARATION OF DUTIES</small>
          <strong>Active</strong>
          <span className="trend positive">Creator != Approver</span>
        </div>
      </div>

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Who (Device)</th>
              <th>What</th>
              <th>Before → After</th>
              <th>Authz / Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderLeft: log.status === 'PENDING DUAL-APPROVAL' ? '4px solid var(--accent-gold)' : 'none' }}>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{log.when}</td>
                <td>
                  <strong>{log.who}</strong> <br/>
                  <small style={{ color: 'var(--accent-gold)' }}>{log.role}</small> <br/>
                  <small style={{ color: 'var(--text-secondary)' }}>{log.deviceIp}</small>
                </td>
                <td>{log.what}</td>
                <td style={{ fontSize: '0.8rem' }}>
                  <div style={{ color: 'var(--accent-red)' }}>- {log.before}</div>
                  <div style={{ color: 'var(--accent-emerald)' }}>+ {log.after}</div>
                </td>
                <td>
                  <small style={{ display: 'block', marginBottom: '4px' }}>{log.authz}</small>
                  <span className={`badge ${log.status === 'SUCCESS' ? 'high-confidence' : log.status.includes('PENDING') ? 'info' : 'low-confidence'}`}>
                    {log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
