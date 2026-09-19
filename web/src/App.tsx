import { useState } from 'react';
import Landing from './screens/Landing';
import Auth from './screens/Auth';
import Upload from './screens/Upload';
import MatchQueue from './screens/MatchQueue';
import Exceptions from './screens/Exceptions';
import Export from './screens/Export';
import { DISCLAIMER } from './api';

type View = 'landing' | 'upload' | 'matches' | 'exceptions' | 'export';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [jobId, setJobId] = useState('');
  const [view, setView] = useState<View>('landing');

  if (showAuth && !isAuthenticated) {
    return <Auth onLogin={() => {
      setIsAuthenticated(true);
      setShowAuth(false);
      setView('upload');
    }} />;
  }

  if (view === 'landing' && !isAuthenticated) {
    return (
      <>
        <header>
          <div className="brand">▤ LedgerTrace <small>SECURE EDITION</small></div>
          <nav>
            <button onClick={() => setShowAuth(true)}>Sign In</button>
          </nav>
        </header>
        <main>
          <Landing onStart={() => setShowAuth(true)} />
        </main>
        <footer>LedgerTrace Inc. • Local processing. Zero cloud data retention.</footer>
      </>
    );
  }

  return (
    <>
      <header>
        <div className="brand">▤ LedgerTrace <small>SECURE EDITION</small></div>
        <nav>
          <button onClick={() => setView('upload')} aria-current={view === 'upload' ? 'page' : undefined}>1. Import</button>
          {jobId && (
            <>
              <button onClick={() => setView('matches')} aria-current={view === 'matches' ? 'page' : undefined}>2. Matches</button>
              <button onClick={() => setView('exceptions')} aria-current={view === 'exceptions' ? 'page' : undefined}>3. Exceptions</button>
              <button onClick={() => setView('export')} aria-current={view === 'export' ? 'page' : undefined}>4. Export</button>
            </>
          )}
        </nav>
      </header>
      <div className="banner">{DISCLAIMER}</div>
      <main>
        {view === 'upload' && (
          <Upload 
            jobId={jobId} 
            onCreated={setJobId} 
            onRun={() => setView('matches')} 
          />
        )}
        {view === 'matches' && <MatchQueue jobId={jobId} onNext={() => setView('exceptions')} />}
        {view === 'exceptions' && <Exceptions jobId={jobId} onNext={() => setView('export')} />}
        {view === 'export' && <Export jobId={jobId} />}
      </main>
      <footer>LOCAL BOOKS. TRACEABLE FINDINGS. HUMAN REVIEW.</footer>
    </>
  );
}
