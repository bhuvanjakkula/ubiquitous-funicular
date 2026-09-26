import { randomUUID } from 'node:crypto';
const now=()=>new Date().toISOString();
const SECURITY_TYPES=new Set(['COMMON_EQUITY','PREFERRED_EQUITY','FUND_INTEREST','DEBT','CONVERTIBLE','OTHER']);
const ACTIONS=new Set(['BUY','SELL','TRANSFER']);
const DECISIONS=new Set(['ALLOW','DENY','REVIEW']);
export class ComplianceError extends Error{constructor(code,status=400){super(code);this.status=status}}
export class InMemoryComplianceRepository{
 constructor(){this.policies=new Map();this.versions=new Map();this.decisions=new Map();this.securities=new Map()}
 savePolicy(x){this.policies.set(x.id,x);return x} getPolicy(id){return this.policies.get(id)} listPolicies(){return [...this.policies.values()]}
 saveVersion(x){this.versions.set(x.id,x);return x} getVersion(id){return this.versions.get(id)} listVersions(policyId){return [...this.versions.values()].filter(x=>x.policyId===policyId).sort((a,b)=>a.version-b.version)}
 saveDecision(x){this.decisions.set(x.id,x);return x} getDecision(id){return this.decisions.get(id)} listDecisions(){return [...this.decisions.values()]}
 saveSecurity(x){this.securities.set(x.id,x);return x} getSecurity(id){return this.securities.get(id)}
}
export class ComplianceService{
 constructor({repository=new InMemoryComplianceRepository(),identity,audit}={}){this.repo=repository;this.identity=identity;this.audit=audit}
 createSecurity(input,actor='system'){
  if(!input.issuerId||!input.name||!input.issuerCountry)throw new ComplianceError('SECURITY_FIELDS_REQUIRED');
  if(!/^[A-Z]{2}$/.test(input.issuerCountry))throw new ComplianceError('INVALID_ISSUER_COUNTRY');
  const classification=input.classification||'COMMON_EQUITY';if(!SECURITY_TYPES.has(classification))throw new ComplianceError('INVALID_SECURITY_CLASSIFICATION');
  const x={id:randomUUID(),issuerId:input.issuerId,name:input.name,issuerCountry:input.issuerCountry,classification,currency:input.currency||null,metadata:input.metadata||{},createdAt:now()};this.repo.saveSecurity(x);this.audit?.append({actor,action:'SECURITY_REGISTERED',resource:'security',resourceId:x.id});return x;
 }
 createPolicy(input,actor='system'){
  if(!input.name)throw new ComplianceError('POLICY_NAME_REQUIRED');
  const p={id:randomUUID(),name:input.name,description:input.description||null,status:'DRAFT',activeVersionId:null,createdAt:now(),updatedAt:now()};this.repo.savePolicy(p);
  const v=this.addVersion(p.id,{rules:input.rules||[]},actor);this.audit?.append({actor,action:'COMPLIANCE_POLICY_CREATED',resource:'compliance_policy',resourceId:p.id});return {policy:p,version:v};
 }
 addVersion(policyId,input,actor='system'){
  const p=this.repo.getPolicy(policyId);if(!p)throw new ComplianceError('POLICY_NOT_FOUND',404);const versions=this.repo.listVersions(policyId);const rules=(input.rules||[]).map((r,i)=>this.validateRule(r,i));
  const v={id:randomUUID(),policyId,version:(versions.at(-1)?.version||0)+1,rules,status:'DRAFT',createdAt:now()};this.repo.saveVersion(v);this.audit?.append({actor,action:'COMPLIANCE_POLICY_VERSION_CREATED',resource:'compliance_policy_version',resourceId:v.id});return v;
 }
 validateRule(r,i){
  if(!r||!r.type)throw new ComplianceError(`RULE_${i}_TYPE_REQUIRED`);const effect=r.effect||'DENY';if(!DECISIONS.has(effect))throw new ComplianceError(`RULE_${i}_INVALID_EFFECT`);
  const supported=new Set(['IDENTITY_VERIFIED','COUNTRY_ALLOWLIST','COUNTRY_BLOCKLIST','ROLE_REQUIRED','VERIFICATION_CASE_APPROVED','SECURITY_CLASSIFICATION','ACTION']);if(!supported.has(r.type))throw new ComplianceError(`RULE_${i}_UNSUPPORTED_TYPE`);
  return {id:r.id||randomUUID(),type:r.type,effect,subject:r.subject||'BUYER',values:r.values||[],reason:r.reason||r.type};
 }
 activate(policyId,versionId,actor='system'){
  const p=this.repo.getPolicy(policyId),v=this.repo.getVersion(versionId);if(!p)throw new ComplianceError('POLICY_NOT_FOUND',404);if(!v||v.policyId!==policyId)throw new ComplianceError('POLICY_VERSION_NOT_FOUND',404);
  for(const x of this.repo.listVersions(policyId))if(x.status==='ACTIVE'){x.status='RETIRED';this.repo.saveVersion(x)}v.status='ACTIVE';p.status='ACTIVE';p.activeVersionId=v.id;p.updatedAt=now();this.repo.saveVersion(v);this.repo.savePolicy(p);this.audit?.append({actor,action:'COMPLIANCE_POLICY_ACTIVATED',resource:'compliance_policy',resourceId:p.id,metadata:{version:v.version}});return {policy:p,version:v};
 }
 resolvePolicy(policyId){const p=this.repo.getPolicy(policyId);if(!p)throw new ComplianceError('POLICY_NOT_FOUND',404);if(!p.activeVersionId)throw new ComplianceError('POLICY_NOT_ACTIVE');return {policy:p,version:this.repo.getVersion(p.activeVersionId)}}
 evaluate(input,actor='system'){
  if(Object.hasOwn(input,'buyerVerified')||Object.hasOwn(input,'sellerVerified'))return this.evaluateLegacy(input);
  if(!ACTIONS.has(input.action||'BUY'))throw new ComplianceError('INVALID_ACTION');const buyer=this.identity.must(input.buyerId),seller=this.identity.must(input.sellerId);const security=input.securityId?this.repo.getSecurity(input.securityId):null;if(input.securityId&&!security)throw new ComplianceError('SECURITY_NOT_FOUND',404);
  const {policy,version}=this.resolvePolicy(input.policyId);const ctx={buyer,seller,security,action:input.action||'BUY'};const results=version.rules.map(r=>this.runRule(r,ctx));
  const triggered=results.filter(x=>x.triggered);let outcome=triggered.some(x=>x.effect==='DENY')?'DENY':triggered.some(x=>x.effect==='REVIEW')?'REVIEW':'ALLOW';
  const d={id:randomUUID(),policyId:policy.id,policyVersionId:version.id,policyVersion:version.version,buyerId:buyer.id,sellerId:seller.id,securityId:security?.id||null,action:ctx.action,outcome,allowed:outcome==='ALLOW',reasons:triggered.map(x=>x.reason),ruleResults:results,contextSnapshot:{buyer:{country:buyer.country,status:buyer.status,roles:buyer.roles},seller:{country:seller.country,status:seller.status,roles:seller.roles},security:security?{issuerCountry:security.issuerCountry,classification:security.classification}:null},createdAt:now()};
  this.repo.saveDecision(d);this.audit?.append({actor,action:'COMPLIANCE_EVALUATED',resource:'compliance_decision',resourceId:d.id,metadata:{outcome,policyVersion:version.version}});return d;
 }
 runRule(r,c){const subject=r.subject==='SELLER'?c.seller:c.buyer;let pass=true;
  switch(r.type){case'IDENTITY_VERIFIED':pass=subject.status==='VERIFIED';break;case'COUNTRY_ALLOWLIST':pass=r.values.includes(subject.country);break;case'COUNTRY_BLOCKLIST':pass=!r.values.includes(subject.country);break;case'ROLE_REQUIRED':pass=r.values.some(x=>subject.roles?.includes(x));break;case'VERIFICATION_CASE_APPROVED':{const cases=this.identity.repo.listCases(subject.id);pass=r.values.every(t=>cases.some(x=>x.type===t&&x.status==='APPROVED'));break}case'SECURITY_CLASSIFICATION':pass=!!c.security&&r.values.includes(c.security.classification);break;case'ACTION':pass=r.values.includes(c.action);break}
  return {ruleId:r.id,type:r.type,subject:r.subject,passed:pass,triggered:!pass,effect:r.effect,reason:pass?null:r.reason};
 }
 review(decisionId,input,actor='system'){const d=this.repo.getDecision(decisionId);if(!d)throw new ComplianceError('DECISION_NOT_FOUND',404);if(!['ALLOW','DENY'].includes(input.outcome))throw new ComplianceError('INVALID_REVIEW_OUTCOME');d.outcome=input.outcome;d.allowed=input.outcome==='ALLOW';d.review={actor,reason:input.reason||null,at:now()};this.repo.saveDecision(d);this.audit?.append({actor,action:'COMPLIANCE_DECISION_REVIEWED',resource:'compliance_decision',resourceId:d.id,metadata:{outcome:d.outcome}});return d}
 listPolicies(){return this.repo.listPolicies()} listDecisions(){return this.repo.listDecisions()}
 // Compatibility helper for v0.1 callers; not used for policy-grade decisions.
 evaluateLegacy(x){const reasons=[];if(!x.buyerVerified)reasons.push('BUYER_IDENTITY_NOT_VERIFIED');if(!x.sellerVerified)reasons.push('SELLER_IDENTITY_NOT_VERIFIED');return{allowed:!reasons.length,reasons,ruleVersion:'legacy-dev-v1'}}
}
