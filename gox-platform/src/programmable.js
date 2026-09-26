import { randomUUID, createHash } from 'node:crypto';
const id=()=>randomUUID(), now=()=>new Date().toISOString();
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export class ProgrammableOwnershipService {
  constructor({audit}={}){this.audit=audit;this.programs=new Map();this.actions=[]}
  create(input,actor='system'){
    if(!input.securityId) throw Error('SECURITY_ID_REQUIRED');
    const versions=this.programs.get(input.securityId)||[];
    const rules=this.#normalizeRules(input.rules||{});
    const p={id:id(),securityId:input.securityId,issuerId:input.issuerId||null,version:versions.length+1,status:input.status||'ACTIVE',effectiveFrom:input.effectiveFrom||now(),effectiveUntil:input.effectiveUntil||null,rules,shareholderRights:input.shareholderRights||{},corporateActionHooks:input.corporateActionHooks||[],supersedes:versions.at(-1)?.id||null,createdAt:now(),createdBy:actor};
    p.policyHash=hash({securityId:p.securityId,version:p.version,rules:p.rules,shareholderRights:p.shareholderRights,corporateActionHooks:p.corporateActionHooks});
    versions.push(p);this.programs.set(input.securityId,versions);this.audit?.append({type:'OWNERSHIP_PROGRAM_CREATED',actor,subjectId:p.id,metadata:{securityId:p.securityId,version:p.version,policyHash:p.policyHash}});return p;
  }
  amend(securityId,input,actor='system'){const current=this.current(securityId);if(!current)throw Error('OWNERSHIP_PROGRAM_NOT_FOUND');current.status='SUPERSEDED';return this.create({...current,...input,securityId,status:'ACTIVE',rules:{...current.rules,...(input.rules||{})},shareholderRights:{...current.shareholderRights,...(input.shareholderRights||{})},corporateActionHooks:input.corporateActionHooks||current.corporateActionHooks},actor)}
  current(securityId,at=new Date()){const t=at instanceof Date?at.getTime():Date.parse(at);return (this.programs.get(securityId)||[]).filter(p=>p.status==='ACTIVE'&&Date.parse(p.effectiveFrom)<=t&&(!p.effectiveUntil||Date.parse(p.effectiveUntil)>=t)).at(-1)||null}
  history(securityId){return this.programs.get(securityId)||[]}
  evaluate(input,actor='system'){
    const p=this.current(input.securityId,input.at||new Date());if(!p)return this.#decision(input,null,'REVIEW',[this.#result('PROGRAM_EXISTS',false,'No active ownership program')],actor);
    const r=p.rules, results=[];
    if(r.lockupUntil)results.push(this.#result('LOCKUP',Date.parse(input.at||now())>=Date.parse(r.lockupUntil),`Transfer locked until ${r.lockupUntil}`));
    if(r.allowedCountries?.length)results.push(this.#result('BUYER_COUNTRY_ALLOWED',r.allowedCountries.includes(input.buyerCountry),`Buyer country ${input.buyerCountry} must be allowed`));
    if(r.blockedCountries?.length)results.push(this.#result('BUYER_COUNTRY_NOT_BLOCKED',!r.blockedCountries.includes(input.buyerCountry),`Buyer country ${input.buyerCountry} must not be blocked`));
    if(r.allowedInvestorTypes?.length)results.push(this.#result('INVESTOR_TYPE_ALLOWED',r.allowedInvestorTypes.includes(input.buyerInvestorType),`Investor type ${input.buyerInvestorType} must be allowed`));
    if(Number.isFinite(r.maxPerInvestor))results.push(this.#result('CONCENTRATION_LIMIT',(Number(input.buyerCurrentQuantity||0)+Number(input.quantity||0))<=r.maxPerInvestor,`Post-transfer holding must be <= ${r.maxPerInvestor}`));
    if(Number.isFinite(r.minTransferQuantity))results.push(this.#result('MIN_TRANSFER',Number(input.quantity)>=r.minTransferQuantity,`Transfer must be >= ${r.minTransferQuantity}`));
    if(Number.isFinite(r.maxTransferQuantity))results.push(this.#result('MAX_TRANSFER',Number(input.quantity)<=r.maxTransferQuantity,`Transfer must be <= ${r.maxTransferQuantity}`));
    if(r.requiredComplianceDecision)results.push(this.#result('COMPLIANCE_GATE',input.complianceDecision===r.requiredComplianceDecision,`Compliance decision must be ${r.requiredComplianceDecision}`));
    if(r.requireOwnershipVerified)results.push(this.#result('OWNERSHIP_GATE',input.ownershipVerified===true,'Seller ownership must be verified'));
    const failed=results.filter(x=>!x.passed), decision=failed.length?'DENY':'ALLOW';return this.#decision(input,p,decision,results,actor);
  }
  recordCorporateAction(securityId,input,actor='system'){const p=this.current(securityId);if(!p)throw Error('OWNERSHIP_PROGRAM_NOT_FOUND');if(!p.corporateActionHooks.includes(input.type))throw Error('CORPORATE_ACTION_NOT_ENABLED');const a={id:id(),securityId,programId:p.id,programVersion:p.version,type:input.type,payload:input.payload||{},status:'RECORDED',createdAt:now(),createdBy:actor};this.actions.push(a);this.audit?.append({type:'CORPORATE_ACTION_RECORDED',actor,subjectId:a.id,metadata:{securityId,type:a.type,programVersion:p.version}});return a}
  listCorporateActions(securityId){return this.actions.filter(x=>x.securityId===securityId)}
  #decision(input,p,decision,results,actor){const d={id:id(),securityId:input.securityId,programId:p?.id||null,programVersion:p?.version||null,policyHash:p?.policyHash||null,decision,results,inputHash:hash(input),evaluatedAt:now()};this.audit?.append({type:'OWNERSHIP_PROGRAM_EVALUATED',actor,subjectId:d.id,metadata:{securityId:input.securityId,decision,programVersion:d.programVersion,inputHash:d.inputHash}});return d}
  #result(code,passed,message){return{code,passed,message}}
  #normalizeRules(r){return{lockupUntil:r.lockupUntil||null,allowedCountries:r.allowedCountries||[],blockedCountries:r.blockedCountries||[],allowedInvestorTypes:r.allowedInvestorTypes||[],maxPerInvestor:Number.isFinite(r.maxPerInvestor)?r.maxPerInvestor:null,minTransferQuantity:Number.isFinite(r.minTransferQuantity)?r.minTransferQuantity:null,maxTransferQuantity:Number.isFinite(r.maxTransferQuantity)?r.maxTransferQuantity:null,requiredComplianceDecision:r.requiredComplianceDecision||'ALLOW',requireOwnershipVerified:r.requireOwnershipVerified!==false}}
}
