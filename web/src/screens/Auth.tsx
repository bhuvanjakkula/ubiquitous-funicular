import { useState } from 'react';

export type UserRole = 'Owner' | 'Finance Admin' | 'Accountant' | 'Approver' | 'Auditor' | 'Read-only';

export default function Auth({ onLogin }: { onLogin: (role: UserRole) => void }) {
  const [step, setStep] = useState<'credentials' | 'mfa' | 'role'>('credentials');
  const [role, setRole] = useState<UserRole>('Finance Admin');

  function handleCredentialsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep('mfa');
  }

  function handleMfaSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStep('role');
  }

  if (step === 'mfa') {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1 className="auth-header">Verify Identity</h1>
          <p className="auth-sub">Enter the code from your authenticator app or use your Passkey.</p>
          <form className="auth-form" onSubmit={handleMfaSubmit}>
            <label>
              MFA Code
              <input type="text" required placeholder="000000" maxLength={6} style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.25rem' }} />
            </label>
            <button type="button" className="gold-button" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} onClick={() => setStep('role')}>
              Use Hardware Passkey
            </button>
            <button type="submit" className="gold-button" style={{ marginTop: '0.5rem' }}>
              Verify Code
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'role') {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <h1 className="auth-header">Select Session Role</h1>
          <p className="auth-sub">Choose your active RBAC role for this session.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
            {(['Owner', 'Finance Admin', 'Accountant', 'Approver', 'Auditor', 'Read-only'] as UserRole[]).map(r => (
              <button 
                key={r}
                type="button" 
                className="secondary" 
                style={{ borderColor: role === r ? 'var(--accent-gold)' : '', color: role === r ? 'var(--accent-gold)' : '' }}
                onClick={() => setRole(r)}
              >
                {r}
              </button>
            ))}
            <button type="button" className="gold-button" style={{ marginTop: '1.5rem' }} onClick={() => onLogin(role)}>
              Enter LedgerTrace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-header">LedgerTrace Auth</h1>
        <p className="auth-sub">Sign in to your intelligent financial-control layer.</p>

        <form className="auth-form" onSubmit={handleCredentialsSubmit}>
          <label>
            Email Address
            <input type="email" required placeholder="name@company.com" />
          </label>
          <label>
            Password
            <input type="password" required placeholder="••••••••" />
          </label>
          <button type="submit" className="gold-button">
            Sign In securely
          </button>
        </form>
      </div>
    </div>
  );
}
