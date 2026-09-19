import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Radio, Search, CheckCircle, Network, Zap } from 'lucide-react';

const IconMap: any = { Activity, ShieldAlert, Radio, Search, CheckCircle, Network, Zap };

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
  const [testActive, setTestActive] = useState(false);
  const [nodesDisrupted, setNodesDisrupted] = useState(false);
  
  // Live Telemetry states
  const [nodeCount, setNodeCount] = useState(250034);
  const [latency, setLatency] = useState(12);
  const [packetLoss, setPacketLoss] = useState(0);
  const [recoveryTime, setRecoveryTime] = useState("<50ms Sub-second Healing");
  const [activeKey, setActiveKey] = useState("0x8F92A1...");
  const defaultNodes = [
    { id: 'cmd', label: 'Command', x: '12%', y: '50%', status: 'trusted', icon: 'ShieldAlert' },
    { id: 'a', label: 'Node A', x: '30%', y: '50%', status: 'trusted', icon: 'Network' },
    { id: 'b', label: 'Node B (Relay)', x: '55%', y: '25%', status: 'trusted', icon: 'Activity' },
    { id: 'd', label: 'Node D (Backup)', x: '55%', y: '75%', status: 'standby', icon: 'Radio' },
    { id: 'c', label: 'Node C', x: '78%', y: '50%', status: 'trusted', icon: 'Network' },
    { id: 'recon', label: 'Recon Unit', x: '92%', y: '50%', status: 'trusted', icon: 'Search' },
    { id: 'rogue', label: 'Unknown Emitter', x: '30%', y: '15%', status: 'unauthorized', icon: 'Zap' }
  ];

  const defaultLinks = [
    { id: 'cmd-a', source: 'cmd', target: 'a', status: 'active', latency: '8ms', bw: '10G' },
    { id: 'a-b', source: 'a', target: 'b', status: 'active', latency: '12ms', bw: '10G' },
    { id: 'b-c', source: 'b', target: 'c', status: 'active', latency: '9ms', bw: '10G' },
    { id: 'a-d', source: 'a', target: 'd', status: 'standby', latency: '--', bw: '--' },
    { id: 'd-c', source: 'd', target: 'c', status: 'standby', latency: '--', bw: '--' },
    { id: 'c-recon', source: 'c', target: 'recon', status: 'active', latency: '14ms', bw: '10G' },
    { id: 'rogue-a', source: 'rogue', target: 'a', status: 'blocked', latency: 'AUTH_FAIL', bw: '0G' }
  ];

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [topologyNodes, setTopologyNodes] = useState<any[]>(defaultNodes);
  const [topologyLinks, setTopologyLinks] = useState<any[]>(defaultLinks);
  const [wsConnected, setWsConnected] = useState(false);

  // Idle key rotation
  useEffect(() => {
    const interval = setInterval(() => {
      const chars = "0123456789ABCDEF";
      let key = "0x";
      for (let i = 0; i < 6; i++) key += chars[Math.floor(Math.random() * 16)];
      key += "...";
      setActiveKey(key);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket Connection
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: any;

    const connectWs = () => {
      if (!isAuthenticated) return;
      
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? '127.0.0.1:8001' 
        : 'nullmesh-defense.onrender.com';
      
      socket = new WebSocket(`${wsProtocol}//${wsHost}/api/v1/mesh/stream`);
      
      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "MESH_STATE") {
          setTopologyNodes(data.nodes);
          setTopologyLinks(data.links);
          setNodeCount(data.telemetry.nodeCount);
          setLatency(data.telemetry.latency);
          setPacketLoss(data.telemetry.packetLoss);
          setRecoveryTime(data.telemetry.recoveryTime);
          setNodesDisrupted(data.telemetry.nodesDisrupted);
          setTestActive(data.telemetry.testActive);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        // Attempt to reconnect after 3 seconds
        reconnectTimeout = setTimeout(connectWs, 3000);
      };

      setWs(socket);
    };

    connectWs();

    return () => {
      clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, [isAuthenticated]);

  const triggerResilienceTest = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ command: 'KILL_NODE' }));
    }
  };

  const [scenario, setScenario] = useState("soldiers");
  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ command: 'SET_SCENARIO', scenario }));
    }
  }, [scenario, ws]);
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
                <span className="accent-word">Indestructible</span> Network<br/>
                for Modern Warfare.
              </h1>
              <p className="hero-subtitle stylistic-subtitle">
                <strong style={{color: 'var(--accent-cyan)'}}>NullMesh</strong> is a resilient communications and networking layer designed to maintain trusted information exchange among distributed defense nodes when conventional communications infrastructure is unavailable, degraded, or disconnected.
              </p>
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
                <header className="header" style={{flexDirection: 'column', alignItems: 'stretch', gap: '1rem'}}>
                  <div className="brand" style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                      <ShieldAlert size={28} className="logo-pulse" color="var(--accent-cyan)"/>
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <h1>NULLMESH <span className="version">v2</span></h1>
                        <div className="system-status">
                          <div className="pulse"></div>
                          CDT ENGINE ONLINE
                        </div>
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: '2rem', fontSize: '0.8rem', fontFamily: 'monospace', alignItems: 'center'}}>
                      {!wsConnected && (
                        <div style={{color: 'var(--accent-amber)', animation: 'pulse 1.5s infinite'}}>
                          [WAITING FOR C2 UPLINK...]
                        </div>
                      )}
                      <div><span style={{color: 'var(--text-muted)'}}>LATENCY:</span> <span style={{color: testActive && !nodesDisrupted ? 'var(--accent-red)' : 'var(--accent-green)'}}>&lt;{latency}ms</span></div>
                      <div><span style={{color: 'var(--text-muted)'}}>THROUGHPUT:</span> <span style={{color: testActive && !nodesDisrupted ? 'var(--accent-amber)' : 'var(--accent-green)'}}>{testActive && !nodesDisrupted ? '4.2Gbps' : '10Gbps'}</span></div>
                      <div><span style={{color: 'var(--text-muted)'}}>NODES:</span> <span style={{color: testActive && !nodesDisrupted ? 'var(--accent-red)' : 'var(--accent-cyan)'}}>{nodeCount.toLocaleString()}</span></div>
                    </div>
                  </div>
                  
                  <div className="telemetry-dashboard" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: '4px'}}>
                    <div className="tel-item"><span className="tel-label" style={{color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block'}}>RECOVERY TIME</span><span className="tel-val" style={{fontSize: '0.85rem', color: testActive && !nodesDisrupted ? 'var(--accent-amber)' : 'white'}}>{recoveryTime}</span></div>
                    <div className="tel-item"><span className="tel-label" style={{color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block'}}>PACKET LOSS (DEGRADED)</span><span className="tel-val" style={{fontSize: '0.85rem', color: packetLoss > 0 ? 'var(--accent-red)' : 'white'}}>{packetLoss}% Data Loss (FEC+Multi)</span></div>
                    <div className="tel-item"><span className="tel-label" style={{color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block'}}>CRYPTO ARCHITECTURE</span><span className="tel-val" style={{fontSize: '0.85rem'}}>Post-Quantum Entangled</span></div>
                    <div className="tel-item"><span className="tel-label" style={{color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block'}}>DEVICE AUTH</span><span className="tel-val" style={{fontSize: '0.85rem', color: scenario === 'microsegmentation' ? 'var(--accent-cyan)' : 'white'}}>{scenario === 'microsegmentation' ? 'Active Biomimetic Scan...' : 'Zero-Trust Biomimetic'}</span></div>
                    <div className="tel-item"><span className="tel-label" style={{color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block'}}>KEY MANAGEMENT</span><span className="tel-val" style={{fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--accent-green)'}}>{activeKey} (Ephemeral)</span></div>
                    <div className="tel-item"><span className="tel-label" style={{color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block'}}>NODE COMPROMISE RESIST</span><span className="tel-val" style={{fontSize: '0.85rem'}}>Mathematical Isolation</span></div>
                    <div className="tel-item"><span className="tel-label" style={{color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block'}}>INTEROPERABILITY</span><span className="tel-val" style={{fontSize: '0.85rem'}}><span style={{color: scenario === 'microsegmentation' ? 'var(--accent-cyan)' : 'inherit'}}>5G</span>, JADC2, Link 16, SATCOM</span></div>
                    <div className="tel-item"><span className="tel-label" style={{color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block'}}>OFFLINE CAPABILITY</span><span className="tel-val" style={{fontSize: '0.85rem'}}>100% Autonomous Air-gap</span></div>
                  </div>
                </header>

                <div className="terminal-panel">
                  <div className="panel-controls">
                    <div className="input-group">
                      <label>TACTICAL SCENARIO</label>
                      <select value={scenario} onChange={(e) => { setScenario(e.target.value); setResults(null); setRepair(null); setInference(null); }}>
                        <option value="soldiers">SOLDIERS (Local/Team Comms)</option>
                        <option value="border_posts">BORDER POSTS (Remote Networking)</option>
                        <option value="disaster">DISASTER RESPONSE (Infrastructure Failed)</option>
                        <option value="vehicles">VEHICLES (V2U Data Exchange)</option>
                        <option value="uavs">UAV SWARM (Network Relay)</option>
                        <option value="sensors">SENSORS (Distributed Transport)</option>
                        <option value="command">COMMAND CENTERS (Distributed Intel)</option>
                        <option value="naval">NAVAL OPERATIONS (Resilient Comms)</option>
                        <option value="cyber">CYBER OPERATIONS (Segmented Nodes)</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>DEPLOYMENT PHASE</label>
                      <select defaultValue="phase5" disabled style={{opacity: 0.8, border: '1px solid var(--accent-red)', color: 'var(--accent-red)', background: 'rgba(255, 0, 0, 0.05)'}}>
                        <option value="phase1">PHASE 1 (Local Devices)</option>
                        <option value="phase2">PHASE 2 (Peer Discovery)</option>
                        <option value="phase3">PHASE 3 (Encrypted Nodes)</option>
                        <option value="phase4">PHASE 4 (Hardware Links)</option>
                        <option value="phase5">PHASE 5 (Field Test: Node Failure)</option>
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
                    <button className="btn-stripe btn-stripe-outline" onClick={triggerResilienceTest} disabled={testActive && !nodesDisrupted} style={{marginLeft: 'auto', borderColor: 'var(--accent-amber)', color: 'var(--accent-amber)'}}>
                      {nodesDisrupted ? 'REROUTED' : (testActive ? 'DISRUPTING...' : 'STRESS TEST ARCHITECTURE')}
                    </button>
                  </div>
                </div>

                <div className="panel mt-4" style={{border: '1px solid var(--border-color)', position: 'relative'}}>
                  <h2 style={{fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '1.5rem'}}>LIVE NETWORK TOPOLOGY MAP</h2>
                  <div className="architecture-diagram" style={{margin: '0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', height: '300px', background: '#050505', borderRadius: '8px', overflow: 'hidden'}}>
                    {/* SVG Links */}
                    <svg style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none'}}>
                      {topologyLinks.map(link => {
                        const source = topologyNodes.find(n => n.id === link.source);
                        const target = topologyNodes.find(n => n.id === link.target);
                        if (!source || !target) return null;
                        
                        let strokeColor = "var(--accent-green)";
                        let strokeDash = "none";
                        let strokeWidth = "2";
                        let anim = "none";
                        
                        if (link.status === 'offline') { strokeColor = "var(--accent-red)"; strokeWidth = "1"; strokeDash = "5,5"; }
                        else if (link.status === 'standby') { strokeColor = "#222"; }
                        else if (link.status === 'blocked') { strokeColor = "var(--accent-amber)"; strokeDash = "2,4"; }
                        else if (link.status === 'routing') { strokeColor = "var(--accent-cyan)"; strokeDash = "5,5"; anim = "march 0.5s linear infinite"; }
                        else if (link.status === 'active' && link.id.includes('d')) { strokeColor = "var(--accent-cyan)"; strokeDash = "5,5"; anim = "march 1s linear infinite"; }
                        
                        return (
                          <line key={link.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDash} style={{animation: anim}} />
                        );
                      })}
                    </svg>

                    {/* Link Metric Badges */}
                    {topologyLinks.map(link => {
                      const source = topologyNodes.find(n => n.id === link.source);
                      const target = topologyNodes.find(n => n.id === link.target);
                      if (!source || !target) return null;
                      
                      let badgeColor = "var(--accent-green)";
                      if (link.status === 'offline') badgeColor = "var(--accent-red)";
                      else if (link.status === 'standby') badgeColor = "#444";
                      else if (link.status === 'blocked') badgeColor = "var(--accent-amber)";
                      else if (link.status === 'routing' || (link.status === 'active' && link.id.includes('d'))) badgeColor = "var(--accent-cyan)";
                      
                      return (
                        <div key={`badge-${link.id}`} style={{
                          position: 'absolute',
                          left: `calc((${source.x} + ${target.x}) / 2)`,
                          top: `calc((${source.y} + ${target.y}) / 2)`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 2,
                          background: 'rgba(0,0,0,0.8)',
                          border: `1px solid ${badgeColor}`,
                          color: badgeColor,
                          fontSize: '0.55rem',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}>
                          {link.latency}<br/>{link.bw}
                        </div>
                      );
                    })}

                    {/* Nodes */}
                    {topologyNodes.map(node => {
                      const Icon = IconMap[node.icon];
                      let borderColor = 'var(--accent-green)';
                      let color = 'white';
                      let opacity = 1;
                      
                      if (node.status === 'offline') {
                        borderColor = 'var(--accent-red)';
                        color = 'var(--accent-red)';
                        opacity = 0.5;
                      } else if (node.status === 'unauthorized') {
                        borderColor = 'var(--accent-amber)';
                        color = 'var(--accent-amber)';
                      } else if (node.status === 'standby') {
                        borderColor = '#333';
                        color = '#666';
                        opacity = 0.5;
                      }
                      
                      return (
                        <div key={node.id} className={`arch-node ${node.status}`} style={{position: 'absolute', left: node.x, top: node.y, transform: 'translate(-50%, -50%)', zIndex: 3, padding: '0.6rem', width: '80px', background: '#000', border: `1px solid ${borderColor}`, opacity, transition: 'all 0.3s'}}>
                          <Icon size={16} color={borderColor} />
                          <div style={{fontSize: '0.6rem', color: color, marginTop: '4px', textAlign: 'center'}}>{node.label}</div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {nodesDisrupted && (
                    <div style={{position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0, 255, 65, 0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', padding: '4px 8px', fontSize: '0.65rem', fontFamily: 'monospace', borderRadius: '4px'}}>
                      WARNING: PRIMARY LINKS SEVERED. DATA REROUTED VIA QUANTUM MESH BACKUP.
                    </div>
                  )}
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
