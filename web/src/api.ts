export const apiBase=()=>import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';
export class ApiError extends Error { constructor(public status:number,message:string){super(message)} }
async function request(path:string,init?:RequestInit){const r=await fetch(apiBase()+path,init);const data=await r.json();if(!r.ok)throw new ApiError(r.status,data.detail?.error || JSON.stringify(data.detail));return data;}
export const createJob=(bank:File,gl:File,config:object|File)=>{const form=new FormData();form.append('bank',bank);form.append('gl',gl);form.append('config',config instanceof File?config:JSON.stringify(config));return request('/api/jobs',{method:'POST',body:form})};
const path=(id:string)=>'/api/jobs/'+encodeURIComponent(id);
export const getJob=(id:string)=>request(path(id));
export const runJob=(id:string)=>request(path(id)+'/run',{method:'POST'});
export const getFindings=(id:string)=>request(path(id)+'/findings') as Promise<{items:Finding[]}>;
export const getRollforward=(id:string)=>request(path(id)+'/rollforward');
export const getMatches=(id:string)=>request(path(id)+'/matches');
export const evidenceJsonUrl=(id:string)=>apiBase()+path(id)+'/evidence.json';
export const evidencePdfUrl=(id:string)=>apiBase()+path(id)+'/evidence.pdf';
export type Finding={id:string;severity:'FAIL'|'UNKNOWN'|'INFO';detector_id:string;title:string;amount_cents:number|null;payload:Record<string,unknown>;cite_bank_ids:string[];cite_line_ids:string[];cite_entry_ids:string[]};
export const formatUsd=(cents:number|null|undefined)=>cents==null?'Unknown':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export const DISCLAIMER='UNPOSTED WORKPAPER — LedgerTrace does not post to the GL and does not certify GAAP, IFRS, or SOX.';
