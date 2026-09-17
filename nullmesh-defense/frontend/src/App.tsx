import React, { useState } from 'react';
import { Activity, ShieldAlert, Cpu, HardDrive, Zap, Radio, Search, Code, CheckCircle, ArrowRight, Network, Share2 } from 'lucide-react';

interface TickReport {
  t: number;
  world_count: number;
  guaranteed: boolean;
  violated: string[];
}

function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [repair, setRepair] = useState<any>(null);
  const [inference, setInference] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [scenario, setScenario] = useState("kill_web");
  const [customPayload, setCustomPayload] = useState(
    JSON.stringify([
      { agent: "Alpha", schedule: { "0": ["standby"], "12": ["standby", "attack:alpha_target"], "13": ["standby"] } },
      { agent: "Bravo", schedule: { "0": ["standby"], "12": ["standby", "attack:bravo_target"], "13": ["standby"] } },
      { agent: "C", schedule: { "0": ["idle"] } }
    ], null, 2)
  );

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = isSignUp ? '/api/v1/auth/register' : '/api/v1/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Authentication failed");
        return;
      }
      localStorage.setItem("token", data.access_token);
      setIsAuthenticated(true);
      setHasSubscription(data.subscription_active);
      
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (e) {
      alert("Error connecting to server");
    }
  };

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const runAnalysis = async () => {
    setLoading(true);
    try {
      let body: any = { scenario };
      if (scenario === "custom") {
        body.contracts = JSON.parse(customPayload);
      }
      const res = await fetch('/api/v1/analyze', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      if (res.status === 403) {
        setHasSubscription(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      
      // Adapt v1 API response to frontend expectations
      if (data.ticks && data.ticks.length > 0) {
        const lastTick = data.ticks[data.ticks.length - 1];
        data.world_count = lastTick.world_count;
        data.guaranteed = data.t_star === null;
        data.violated = data.first_violated || [];
        data.t = data.t_star !== null ? data.t_star : lastTick.t;
        const timelineData = data.ticks.map((tick: any) => ({
          t: tick.t,
          actions: tick.actions || []
        }));
        
        // Group identical consecutive ticks
        const grouped = [];
        let currentGroup: any = null;
        for (const item of timelineData) {
          const actStr = JSON.stringify(item.actions);
          if (currentGroup && currentGroup.actStr === actStr) {
            currentGroup.endT = item.t;
          } else {
            if (currentGroup) grouped.push(currentGroup);
            currentGroup = { startT: item.t, endT: item.t, actions: item.actions, actStr };
          }
        }
        if (currentGroup) grouped.push(currentGroup);
        
        data.timeline = grouped.map((g: any) => ({
          label: g.startT === g.endT ? `T-${g.startT}` : `T-${g.startT} ➔ T-${g.endT}`,
          actions: g.actions
        }));
      }

      setResults(data);
      setRepair(null);
      setInference(null);
    } catch (e) {
      console.error(e);
      alert("Error: Check your payload or backend connection.");
    }
    setLoading(false);
  };

  const runRepair = async () => {
    setLoading(true);
    try {
      let body: any = { scenario };
      if (scenario === "custom") {
        body.contracts = JSON.parse(customPayload);
      }
      const res = await fetch('/api/v1/repair', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(body)
      });
      if (res.status === 403) {
        setHasSubscription(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.found) {
        data.repaired_schedule = data.dropped_actions;
      }
      setRepair(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const runInference = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/infer', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ scenario: "a2ad", target_agent: "Enemy-Commander" })
      });
      if (res.status === 403) {
        setHasSubscription(false);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setInference(data);
      setResults(null);
      setRepair(null);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="landing-page">
      {/* Navbar with Auth buttons */}
      <nav className="navbar">
        <div className="nav-logo">
          <ShieldAlert className="logo-icon" size={24} />
          NULLMESH <span style={{fontWeight: 300, color: 'var(--text-muted)'}}>v2</span>
        </div>
        <div className="nav-links">
          {!isAuthenticated ? (
            <button className="nav-link" onClick={() => document.getElementById('auth')?.scrollIntoView({behavior: 'smooth'})}>Sign In</button>
          ) : (
            <button className="btn-stripe btn-stripe-outline" style={{padding: '0.5rem 1rem', width: 'auto'}} onClick={() => {
              localStorage.removeItem("token");
              setIsAuthenticated(false);
            }}>Terminate Session</button>
          )}
        </div>
      </nav>

      {/* First Layer (Unauthenticated) - Split Layout */}
      {!isAuthenticated && (
        <div className="split-layout">
          {/* Left Side: Hero and Product Descriptions */}
          <div className="split-left">
            <section className="hero-section" style={{textAlign: 'left', padding: '0 0 2.5rem 0'}}>
              <h1 className="hero-title stylistic-title">
                <span className="accent-word">Mathematical</span> Certainty<br/>
                for Modern Warfare.
              </h1>
              <p className="hero-subtitle stylistic-subtitle">
                <strong style={{color: 'var(--accent-cyan)'}}>NULLMESH v2</strong> is the world's first Consequential Divergence Time (CDT) Engine. We mathematically guarantee multi-domain operations, swarm resilience, and threat inference before the enemy even acts.
              </p>
            </section>

            <section className="features-section" style={{padding: '0'}}>
              <div className="features-grid">
                <div className="feature-card">
                  <Radio className="feature-icon" size={24} />
                  <div>
                    <h3 className="feature-title">Temporal Kill Web</h3>
                    <p className="feature-desc">JADC2 synchronization guaranteed across Space, Cyber, and Sea domains. Ensures sequential dependency across all joint operations.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <Search className="feature-icon" size={24} />
                  <div>
                    <h3 className="feature-title">Inverse CDT Inference</h3>
                    <p className="feature-desc">Reverse-engineer classified enemy operations from partial battlefield observations using advanced mathematical deduction.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <Cpu className="feature-icon" size={24} />
                  <div>
                    <h3 className="feature-title">Swarm Topology Repair</h3>
                    <p className="feature-desc">Decentralized resilience. Mathematically guarantee seamless leader re-election if an EMP severs drone swarm communications.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <ShieldAlert className="feature-icon" size={24} />
                  <div>
                    <h3 className="feature-title">Deceptive EW Ghost Fleet</h3>
                    <p className="feature-desc">Automated decoy generation. Schedule EW spoofing perfectly in-sync with evasive maneuvers to deceive hypersonic threats.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <Zap className="feature-icon" size={24} />
                  <div>
                    <h3 className="feature-title">Quantum Entanglement Mesh</h3>
                    <p className="feature-desc">Post-quantum cryptography simulation. Mathematically guarantee secure key distribution while automatically collapsing intercepted states.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <Radio className="feature-icon" size={24} />
                  <div>
                    <h3 className="feature-title">Functional Redundancy</h3>
                    <p className="feature-desc">Multi-path SATCOM and terrestrial backhaul resilience. Prevent single-point failure across critical communications links.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <HardDrive className="feature-icon" size={24} />
                  <div>
                    <h3 className="feature-title">FPGA Hardware Hardening</h3>
                    <p className="feature-desc">Zero-trust edge execution. Application-specific processor SoCs shrink the attack surface without relying on vulnerable cloud uplinks.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <Activity className="feature-icon" size={24} />
                  <div>
                    <h3 className="feature-title">5G Microsegmentation</h3>
                    <p className="feature-desc">Zero Trust Architecture. Continuous authentication and least-privilege access mathematically isolate network slices to mitigate DDoS and insider threats.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <Network className="feature-icon" size={24} />
                  <div>
                    <h3 className="feature-title">Topology Optimization</h3>
                    <p className="feature-desc">Partial-mesh structure validation. Mathematically prove cyber resilience under targeted node attacks, outperforming ring and tree topologies.</p>
                  </div>
                </div>
                <div className="feature-card">
                  <Share2 className="feature-icon" size={24} />
                  <div>
                    <h3 className="feature-title">Software-Defined Networks</h3>
                    <p className="feature-desc">Decoupled control from data planes enables flexible, intelligent rerouting in military networks under severe disruption.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Side: Auth Form */}
          <div className="split-right">
            <section className="auth-section" id="auth" style={{padding: '0', margin: '0'}}>
              <div className="auth-container">
                <div className="auth-header">
                  <h2 className="pricing-title" style={{marginBottom: '1rem', fontSize: '1.5rem'}}>{isSignUp ? 'Create Commander Account' : 'Secure Commander Login'}</h2>
                  <p style={{color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem'}}>Access the NULLMESH v2 defense secure network.</p>
                </div>
                
                <div className="auth-toggle">
                  <button className={`auth-tab ${isSignUp ? 'active' : ''}`} onClick={() => setIsSignUp(true)}>Sign Up</button>
                  <button className={`auth-tab ${!isSignUp ? 'active' : ''}`} onClick={() => setIsSignUp(false)}>Sign In</button>
                </div>

                <form className="auth-form" onSubmit={handleAuth}>
                  <div className="auth-input-group">
                    <label>Military / Enterprise Email ID</label>
                    <input type="email" placeholder="commander@defense.gov" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  {isSignUp && (
                    <div className="auth-input-group">
                      <label>Secure Mobile Number (For MFA)</label>
                      <input type="tel" placeholder="+1 (555) 000-0000" required />
                    </div>
                  )}
                  <div className="auth-input-group">
                    <label>Decryption Password</label>
                    <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                  
                  <button type="submit" className="btn-stripe btn-stripe-primary" style={{marginTop: '1rem'}}>
                    {isSignUp ? 'Initialize Clearance' : 'Authenticate Credentials'}
                  </button>
                </form>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Second Layer - Subscription Paywall */}
      {isAuthenticated && !hasSubscription && (
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh'}}>
          <div className="pricing-card" style={{padding: '3rem', maxWidth: '600px', textAlign: 'center', border: '1px solid var(--accent-red)'}}>
            <ShieldAlert size={64} color="var(--accent-red)" style={{margin: '0 auto 1.5rem auto'}} />
            <h2 style={{color: 'var(--accent-red)', marginBottom: '1rem', fontSize: '2rem'}}>ACCESS DENIED</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1.1rem', lineHeight: 1.6}}>
              Your secure session has been established, but you do not have an active subscription for the tactical terminal. 
              To proceed, please authorize a payment for your tier. Upon payment completion, terminal access will automatically unlock.
            </p>
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
              <a href="https://buy.stripe.com/test_cNidR12XcdOl7D14462oE02" className="btn-stripe btn-stripe-outline" style={{padding: '1rem', fontSize: '1rem'}}>
                Authorize SME ($14,999/mo)
              </a>
              <a href="https://buy.stripe.com/test_8x2dR1cxM7pX4qP1VY2oE01" className="btn-stripe btn-stripe-primary" style={{padding: '1rem', fontSize: '1rem', background: 'var(--accent-red)', color: 'white'}}>
                Authorize Commandant ($89,999/mo)
              </a>
              <a href="https://buy.stripe.com/test_7sYaEP2XcfWt8H5eIK2oE03" className="btn-stripe btn-stripe-outline" style={{padding: '1rem', fontSize: '1rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)'}}>
                Authorize Enterprise ($250k/mo)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Second Layer (Authenticated & Subscribed) - Tactical Interface */}
      {isAuthenticated && hasSubscription && (
        <div className="split-layout" style={{paddingTop: '2rem'}}>
          {/* Left Side: Operations */}
          <div className="split-left" style={{flex: 2}}>
            <div className="demo-window" id="terminal" style={{margin: 0, maxWidth: '100%'}}>
              <div className="demo-header">
                <div className="mac-btn close"></div>
                <div className="mac-btn min"></div>
                <div className="mac-btn max"></div>
                <span style={{color: '#666', fontSize: '0.8rem', marginLeft: '10px', fontFamily: 'sans-serif'}}>tactical-terminal.exe</span>
              </div>
              
              <div className="app-container">
                <header className="header">
                  <div className="brand">
                    <ShieldAlert size={28} className="logo-pulse" color="var(--accent-cyan)"/>
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                      <h1>NULLMESH <span className="version">v2</span></h1>
                      <div className="system-status">
                        <div className="pulse"></div>
                        CDT ENGINE ONLINE
                      </div>
                    </div>
                  </div>
                </header>

                <div className="terminal-panel">
                  <div className="panel-controls">
                    <div className="input-group">
                      <label>TACTICAL SCENARIO</label>
                      <select value={scenario} onChange={(e) => { setScenario(e.target.value); setResults(null); setRepair(null); setInference(null); }}>
                        <option value="killer">OPERATION KILLER (H12)</option>
                        <option value="late">OPERATION ECHO (H20)</option>
                        <option value="reserve">LOGISTICS COLLISION (H8)</option>
                        <option value="uav_swarm">UAV SWARM DECONFLICTION (H15)</option>
                        <option value="evacuation">EVACUATION LOGISTICS (H10)</option>
                        <option value="mdo">MULTI-DOMAIN THREAT MATRIX (H14)</option>
                        <option value="kill_web">DISTRIBUTED KILL WEB (H30)</option>
                        <option value="swarm">AUTONOMOUS SWARM REPAIR (H10)</option>
                        <option value="ew_ghost">DECEPTIVE EW GHOST FLEET (H10)</option>
                        <option value="logistics">CONTESTED LOGISTICS RESILIENCE (H15)</option>
                        <option value="a2ad">A2/AD THREAT IDENTIFICATION (H20)</option>
                        <option value="qkd">POST-QUANTUM KEY DISTRIBUTION (H10)</option>
                        <option value="redundancy">MULTI-PATH FUNCTIONAL REDUNDANCY (H15)</option>
                        <option value="zero_trust">ZERO-TRUST EDGE EXECUTION (H12)</option>
                        <option value="microsegmentation">5G MICROSEGMENTATION (H10)</option>
                        <option value="topology">PARTIAL-MESH TOPOLOGY OPTIMIZATION (H15)</option>
                        <option value="sdn">SOFTWARE-DEFINED NETWORK REROUTING (H12)</option>
                        <option value="custom">CUSTOM PAYLOAD BUILDER</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>ENGINEER PROTOCOL</label>
                      <select defaultValue="default">
                        <option value="default">STRICT NULLMESH v2</option>
                      </select>
                    </div>
                  </div>

                  {scenario === "custom" && (
                    <div className="custom-payload-editor">
                      <label>JSON CDT CONTRACT (T &lt; 20)</label>
                      <textarea
                        value={customPayload}
                        onChange={(e) => setCustomPayload(e.target.value)}
                        rows={10}
                        spellCheck="false"
                      />
                    </div>
                  )}

                  <div className="action-row">
                    <button className="btn-stripe btn-stripe-primary" onClick={runAnalysis} disabled={loading}>
                      {loading ? 'COMPUTING CDT...' : 'INITIALIZE SIMULATION'}
                    </button>
                    {(scenario === 'swarm' || scenario === 'ew_ghost' || scenario === 'logistics') && (
                      <button className="btn-stripe btn-stripe-outline" onClick={runRepair} disabled={loading} style={{marginLeft: '1rem'}}>
                        EXECUTE HEALING PROTOCOL
                      </button>
                    )}
                    {scenario === 'a2ad' && (
                      <button className="btn-stripe btn-stripe-outline" onClick={runInference} disabled={loading} style={{marginLeft: '1rem'}}>
                        INFER ENEMY INTENT
                      </button>
                    )}
                  </div>
                </div>

                {inference && (
                  <div className="panel mt-4" style={{border: '1px solid var(--accent-cyan)'}}>
                    <h2 style={{color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <Search size={20} /> INVERSE CDT INTEL INFERENCE
                    </h2>
                    <div style={{background: '#000', padding: '1.5rem', borderLeft: '3px solid var(--accent-cyan)', fontFamily: 'monospace'}}>
                      <div style={{color: 'var(--text-muted)', marginBottom: '1rem'}}>TARGET DETECTED: {inference.target_agent}</div>
                      {inference.error ? (
                        <div style={{color: 'var(--accent-red)'}}>{inference.error}</div>
                      ) : (
                        <div>
                          <div style={{color: 'white', marginBottom: '0.5rem'}}>MOST PROBABLE OPERATION SCHEDULE:</div>
                          {Object.entries(inference.inferred_schedule).map(([t, details]: [string, any]) => (
                            <div key={t} style={{display: 'flex', marginBottom: '0.5rem'}}>
                              <div style={{width: '60px', color: 'var(--accent-cyan)', fontWeight: 'bold'}}>T-{t}</div>
                              <div style={{flex: 1, color: '#ccc'}}>
                                [{details.actions.join(', ')}] 
                                <span style={{color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.8rem'}}>
                                  ({(details.confidence * 100).toFixed(0)}% confidence)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {repair && (
                  <div className="panel mt-4" style={{border: '1px solid var(--accent-green)'}}>
                    <h2 style={{color: 'var(--accent-green)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <Activity size={20} /> SWARM HEALING EXECUTED
                    </h2>
                    <div style={{background: '#000', padding: '1.5rem', borderLeft: '3px solid var(--accent-green)'}}>
                      {repair.error ? (
                        <div style={{color: 'var(--accent-red)'}}>{repair.error}</div>
                      ) : (
                        <div>
                          <div style={{color: 'var(--accent-green)', fontWeight: 'bold', marginBottom: '1rem'}}>
                            {repair.message}
                          </div>
                          {repair.original_violations && repair.original_violations.length > 0 && (
                            <div style={{marginBottom: '1rem'}}>
                              <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>PRE-HEAL VIOLATIONS (DETECTED)</div>
                              {repair.original_violations.map((v: string, i: number) => (
                                <div key={i} style={{color: 'var(--accent-red)', fontFamily: 'monospace'}}>{v}</div>
                              ))}
                            </div>
                          )}
                          <div>
                            <div style={{color: 'var(--text-muted)', fontSize: '0.8rem'}}>RE-ELECTION SCHEDULE (APPLIED)</div>
                            <pre style={{color: 'white', fontFamily: 'monospace', margin: 0, marginTop: '0.5rem'}}>
                              {JSON.stringify(repair.repaired_schedule, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {results && (
                  <div className="panel mt-4">
                    <h2 style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      SIMULATION TELEMETRY
                      <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{results.world_count} WORLDS</span>
                    </h2>
                    
                    <div className="stats-grid mt-4">
                      <div className={`stat-box ${results.guaranteed ? 'safe' : 'broken'}`}>
                        <div className="stat-label">MATHEMATICAL GUARANTEE</div>
                        <div className="stat-val">{results.guaranteed ? 'SECURE' : 'VIOLATION'}</div>
                      </div>
                      <div className="stat-box" style={{borderTop: '3px solid var(--accent-cyan)'}}>
                        <div className="stat-label">DIVERGENCE THRESHOLD</div>
                        <div className="stat-val">T-{results.t}</div>
                      </div>
                      <div className="stat-box" style={{borderTop: '3px solid #444', textAlign: 'left', overflowY: 'auto', maxHeight: '100px'}}>
                        <div className="stat-label">SYSTEM INVARIANTS</div>
                        {results.violated.length === 0 ? (
                          <div style={{color: 'var(--accent-green)'}}>ALL INVARIANTS HELD</div>
                        ) : (
                          results.violated.map((v: string) => (
                            <div key={v} style={{color: 'var(--accent-red)', fontSize: '0.85rem', fontFamily: 'monospace'}}>[FAIL] {v}</div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <h3 style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>KILL WEB TIMELINE</h3>
                      <div className="timeline">
                        {results.timeline.map((data: any, idx: number) => {
                          return (
                            <div key={idx} style={{display: 'flex', flexDirection: 'column', minWidth: '100px'}}>
                              <div style={{background: 'var(--bg-panel)', padding: '0.5rem', borderBottom: '2px solid var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 'bold', textAlign: 'center'}}>
                                {data.label}
                              </div>
                              <div style={{padding: '0.5rem', background: '#000', fontSize: '0.75rem', color: '#ccc', minHeight: '60px'}}>
                                {data.actions.map((act: string) => (
                                  <div key={act} style={{marginBottom: '4px'}}>• {act}</div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side: Pricing Tiers */}
          <div className="split-right" style={{flex: 1}}>
            <div style={{position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              
              <div className="pricing-card" style={{padding: '1.5rem'}}>
                <h3 className="tier-name" style={{fontSize: '1.2rem'}}>SME / Tactical</h3>
                <div className="tier-price" style={{fontSize: '2rem', marginBottom: '1rem'}}>$14,999<span style={{fontSize:'1rem', color:'var(--text-muted)'}}>/mo</span></div>
                <ul className="tier-features" style={{marginBottom: '1.5rem', fontSize: '0.85rem'}}>
                  <li><CheckCircle size={14} color="var(--accent-green)"/> 10,000 simulations/month</li>
                  <li><CheckCircle size={14} color="var(--accent-green)"/> Temporal Kill Web engine</li>
                  <li><CheckCircle size={14} color="var(--accent-green)"/> FPGA Hardware Hardening</li>
                </ul>
                <a href="https://buy.stripe.com/test_cNidR12XcdOl7D14462oE02" className="btn-stripe btn-stripe-outline" target="_blank" rel="noreferrer" style={{width: '100%', display: 'block', textAlign: 'center', padding: '0.5rem'}}>
                  Purchase SME Access
                </a>
              </div>
              
              <div className="pricing-card premium" style={{padding: '1.5rem', border: '1px solid var(--accent-amber)'}}>
                <div className="premium-badge" style={{top: '10px', right: '10px', fontSize: '0.6rem'}}>COMMANDANT</div>
                <h3 className="tier-name" style={{fontSize: '1.2rem', color: 'var(--accent-amber)'}}>Command Center</h3>
                <div className="tier-price" style={{fontSize: '2rem', marginBottom: '1rem'}}>$89,999<span style={{fontSize:'1rem', color:'var(--text-muted)'}}>/mo</span></div>
                <ul className="tier-features" style={{marginBottom: '1.5rem', fontSize: '0.85rem'}}>
                  <li><CheckCircle size={14} color="var(--accent-amber)"/> Unlimited simulations</li>
                  <li><CheckCircle size={14} color="var(--accent-amber)"/> Inverse CDT Intel Inference</li>
                  <li><CheckCircle size={14} color="var(--accent-amber)"/> Swarm & EW Ghost modules</li>
                  <li><CheckCircle size={14} color="var(--accent-amber)"/> Post-Quantum Cryptography</li>
                </ul>
                <a href="https://buy.stripe.com/test_8x2dR1cxM7pX4qP1VY2oE01" className="btn-stripe btn-stripe-primary" target="_blank" rel="noreferrer" style={{width: '100%', display: 'block', textAlign: 'center', padding: '0.5rem', background: 'var(--accent-amber)', color: '#000'}}>
                  Purchase Commandant
                </a>
              </div>

              <div className="pricing-card" style={{padding: '1.5rem'}}>
                <h3 className="tier-name" style={{fontSize: '1.2rem'}}>Enterprise / Gov</h3>
                <div className="tier-price" style={{fontSize: '2rem', marginBottom: '1rem'}}><span style={{fontSize:'1rem', color:'var(--text-muted)'}}>Starts at</span> $250k<span style={{fontSize:'1rem', color:'var(--text-muted)'}}>/mo</span></div>
                <ul className="tier-features" style={{marginBottom: '1.5rem', fontSize: '0.85rem'}}>
                  <li><CheckCircle size={14} color="var(--accent-cyan)"/> Custom Payload Builder API</li>
                  <li><CheckCircle size={14} color="var(--accent-cyan)"/> On-premise air-gapped deploy</li>
                  <li><CheckCircle size={14} color="var(--accent-cyan)"/> Secret-level clearance support</li>
                </ul>
                <a href="https://buy.stripe.com/test_7sYaEP2XcfWt8H5eIK2oE03" className="btn-stripe btn-stripe-outline" target="_blank" rel="noreferrer" style={{width: '100%', display: 'block', textAlign: 'center', padding: '0.5rem', fontSize: '0.9rem'}}>
                  Purchase Enterprise Access
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
