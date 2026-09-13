import {useState} from 'react';
import Auth from './screens/Auth';
import Upload from './screens/Upload';import Findings from './screens/Findings';import Evidence from './screens/Evidence';import {DISCLAIMER} from './api';
export default function App(){
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jobId,setJobId]=useState('');
  const [view,setView]=useState<'upload'|'findings'|'evidence'>('upload');

  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  return <><header><div className="brand">▤ LedgerTrace <small>LOCAL / V1</small></div><nav><button onClick={()=>setView('upload')} aria-current={view==='upload'?'page':undefined}>Upload</button>{jobId&&<><button onClick={()=>setView('findings')} aria-current={view==='findings'?'page':undefined}>Findings</button><button onClick={()=>setView('evidence')} aria-current={view==='evidence'?'page':undefined}>Evidence</button></>}</nav></header><div className="banner">{DISCLAIMER}</div><main>{view==='upload'?<Upload jobId={jobId} onCreated={setJobId} onRun={()=>setView('findings')}/>:view==='findings'?<Findings jobId={jobId}/>:<Evidence jobId={jobId}/>}</main><footer>LOCAL BOOKS. TRACEABLE FINDINGS. HUMAN REVIEW.</footer></>
}
