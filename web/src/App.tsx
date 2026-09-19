import { useState } from 'react';
import Landing from './screens/Landing';
import Auth, { UserRole } from './screens/Auth';
import CopilotDashboard from './screens/CopilotDashboard';
import InvoiceExceptions from './screens/InvoiceExceptions';
import SecurityAuditLog from './screens/SecurityAuditLog';
import Upload from './screens/Upload';
import { DISCLAIMER } from './api';

type View = 'landing' | 'dashboard' | 'exceptions' | 'security' | 'upload';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [role, setRole] = useState<UserRole>('Read-only');
  const [view, setView] = useState<View>('landing');
  const [jobId, setJobId] = useState('');

  if (showAuth && !isAuthenticated) {
    return <Auth onLogin={(selectedRole) => {
      setRole(selectedRole);
      setIsAuthenticated(true);
      setShowAuth(false);
      setView('dashboard');
    }} />;
  }

  if (view === 'landing' && !isAuthenticated) {
    return (
      <>
        <header>
          <div className="brand">▤ LedgerTrace <small>AP COPILOT</small></div>
          <nav>
            <button onClick={() => setShowAuth(true)}>Sign In / Register</button>
          </nav>
        </header>
        <main>
          <Landing onStart={() => setShowAuth(true)} />
        </main>
        <footer>LedgerTrace • Intelligent Financial-Control Layer • Privacy First</footer>
      </>
    );
  }

  return (
    <>
      <header>
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setView('dashboard')}>
          ▤ LedgerTrace <small>AP COPILOT</small>
        </div>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="text-button" onClick={() => setView('dashboard')} style={{ fontWeight: view === 'dashboard' ? 'bold' : 'normal' }}>Dashboard</button>
          <button className="text-button" onClick={() => setView('exceptions')} style={{ fontWeight: view === 'exceptions' ? 'bold' : 'normal' }}>Exceptions Queue</button>
          <button className="text-button" onClick={() => setView('upload')} style={{ fontWeight: view === 'upload' ? 'bold' : 'normal' }}>Import Hub</button>
          <button className="text-button" onClick={() => setView('security')} style={{ fontWeight: view === 'security' ? 'bold' : 'normal', color: 'var(--accent-emerald)' }}>Audit Log</button>
          
          <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }}></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{role} Session</span>
            <button className="text-button" style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }} onClick={() => setIsAuthenticated(false)}>Logout</button>
          </div>
        </nav>
      </header>
      <div className="banner">{DISCLAIMER}</div>
      <main>
        {view === 'dashboard' && <CopilotDashboard onReviewExceptions={() => setView('exceptions')} />}
        {view === 'exceptions' && <InvoiceExceptions onBack={() => setView('dashboard')} />}
        {view === 'security' && <SecurityAuditLog />}
        {view === 'upload' && (
          <Upload 
            jobId={jobId} 
            onCreated={setJobId} 
            onRun={() => setView('dashboard')} 
          />
        )}
      </main>
      <footer>LedgerTrace Copilot • Zero Cloud Data Retention • Human-In-The-Loop AI</footer>
    </>
  );
}
