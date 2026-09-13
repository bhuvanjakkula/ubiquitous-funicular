import { useState } from 'react';

export default function Auth({ onLogin }: { onLogin: () => void }) {
  const [isLogin, setIsLogin] = useState(true);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Here you would typically validate against a backend API.
    // For now, we just log the user in directly.
    onLogin();
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="auth-header">LedgerTrace</h1>
        <p className="auth-sub">
          {isLogin ? 'Sign in to access your ledger' : 'Create your account'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email Address
            <input type="email" required placeholder="name@company.com" />
          </label>
          
          {!isLogin && (
            <label>
              Mobile Number
              <input type="tel" required placeholder="+1 (555) 000-0000" />
            </label>
          )}

          <label>
            Password
            <input type="password" required placeholder="••••••••" />
          </label>

          <button type="submit" className="gold-button">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? (
            <>
              Don't have an account? 
              <button type="button" onClick={() => setIsLogin(false)}>Sign Up</button>
            </>
          ) : (
            <>
              Already have an account? 
              <button type="button" onClick={() => setIsLogin(true)}>Sign In</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
