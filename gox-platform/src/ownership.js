import { randomUUID, createHash } from 'node:crypto';
const now=()=>new Date().toISOString();
const SOURCES=new Set(['ISSUER_REGISTER','TRANSFER_AGENT','CUSTODIAN','BROKER','CERTIFICATE','CAP_TABLE','OTHER']);
const STATES=new Set(['PENDING','VERIFIED','REJECTED','EXPIRED','REVIEW']);
export class OwnershipError extends Error{constructor(code,status=400){super(code);this.status=status}}
export class InMemoryOwnershipRepository{
 constructor(){this.holdings=new Map();this.evidence=new Map();this.encumbrances=new Map();this.attestations=new Map();this.flags=new Map()}
 saveHolding(x){this.holdings.set(x.id,x);return x} getHolding(id){return this.holdings.get(id)} listHoldings(){return [...this.holdings.values()]}
 saveEvidence(x){this.evidence.set(x.id,x);return x} listEvidence(holdingId){return [...this.evidence.values()].filter(x=>x.holdingId===holdingId)}
 saveEncumbrance(x){this.encumbrances.set(x.id,x);return x} listEncumbrances(holdingId){return [...this.encumbrances.values()].filter(x=>x.holdingId===holdingId)}
 saveAttestation(x){this.attestations.set(x.id,x);return x} listAttestations(holdingId){return [...this.attestations.values()].filter(x=>x.holdingId===holdingId)}
 saveFlag(x){this.flags.set(x.id,x);return x} listFlags(holdingId){return [...this.flags.values()].filter(x=>x.holdingId===holdingId)}
}
export class MockOwnershipSourceAdapter{
 constructor(name='mock-authoritative-source'){this.name=name}
 async verify({holding,evidence}){return {provider:this.name,reference:`mock_${holding.id}`,matchedOwner:true,matchedSecurity:true,confirmedQuantity:holding.quantity,evidenceCount:evidence.length,verifiedAt:now()}}
}
export class OwnershipService{
 constructor({repository=new InMemoryOwnershipRepository(),identity,compliance,audit,sourceAdapter=new MockOwnershipSourceAdapter(),defaultTtlDays=90}={}){this.repo=repository;this.identity=identity;this.compliance=compliance;this.audit=audit;this.sourceAdapter=sourceAdapter;this.defaultTtlDays=defaultTtlDays}
 create(input,actor='system'){
  if(!input.ownerId||!input.securityId)throw new OwnershipError('HOLDING_FIELDS_REQUIRED');this.identity?.must(input.ownerId);if(this.compliance&&!this.compliance.repo.getSecurity(input.securityId))throw new OwnershipError('SECURITY_NOT_FOUND',404);
  const quantity=Number(input.quantity);if(!(quantity>0))throw new OwnershipError('INVALID_QUANTITY');const sourceType=input.sourceType||'CAP_TABLE';if(!SOURCES.has(sourceType))throw new OwnershipError('INVALID_SOURCE_TYPE');
  const h={id:randomUUID(),ownerId:input.ownerId,securityId:input.securityId,quantity,shareClass:input.shareClass||null,certificateRef:input.certificateRef||null,registryRef:input.registryRef||null,sourceType,status:'PENDING',transferable:false,verifiedAt:null,expiresAt:null,verificationReference:null,createdAt:now(),updatedAt:now()};this.repo.saveHolding(h);this.audit?.append({actor,action:'OWNERSHIP_HOLDING_CREATED',resource:'holding',resourceId:h.id});return h;
 }
 must(id){const h=this.repo.getHolding(id);if(!h)throw new OwnershipError('HOLDING_NOT_FOUND',404);return h}
 addEvidence(holdingId,input,actor='system'){
  this.must(holdingId);if(!input.type||!input.reference)throw new OwnershipError('EVIDENCE_FIELDS_REQUIRED');const digest=input.digest||createHash('sha256').update(String(input.reference)).digest('hex');const e={id:randomUUID(),holdingId,type:input.type,reference:input.reference,digest,issuer:input.issuer||null,issuedAt:input.issuedAt||null,metadata:input.metadata||{},createdAt:now()};this.repo.saveEvidence(e);this.audit?.append({actor,action:'OWNERSHIP_EVIDENCE_ADDED',resource:'ownership_evidence',resourceId:e.id});return e;
 }
 addEncumbrance(holdingId,input,actor='system'){
  this.must(holdingId);if(!input.type)throw new OwnershipError('ENCUMBRANCE_TYPE_REQUIRED');const x={id:randomUUID(),holdingId,type:input.type,quantity:input.quantity==null?null:Number(input.quantity),status:input.status||'ACTIVE',reference:input.reference||null,details:input.details||null,createdAt:now()};this.repo.saveEncumbrance(x);this.audit?.append({actor,action:'OWNERSHIP_ENCUMBRANCE_ADDED',resource:'encumbrance',resourceId:x.id});return x;
 }
 addFraudFlag(holdingId,input,actor='system'){
  this.must(holdingId);const f={id:randomUUID(),holdingId,code:input.code||'MANUAL_REVIEW',severity:input.severity||'HIGH',status:'OPEN',details:input.details||null,createdAt:now()};this.repo.saveFlag(f);this.audit?.append({actor,action:'OWNERSHIP_FRAUD_FLAG_ADDED',resource:'fraud_flag',resourceId:f.id});return f;
 }
 async verify(id,input={},actor='system'){
  const h=this.must(id),evidence=this.repo.listEvidence(id),activeEnc=this.repo.listEncumbrances(id).filter(x=>x.status==='ACTIVE'),flags=this.repo.listFlags(id).filter(x=>x.status==='OPEN');if(!evidence.length)throw new OwnershipError('OWNERSHIP_EVIDENCE_REQUIRED');
  const result=await this.sourceAdapter.verify({holding:h,evidence,input});let status='VERIFIED',reasons=[];if(!result.matchedOwner)reasons.push('OWNER_MISMATCH');if(!result.matchedSecurity)reasons.push('SECURITY_MISMATCH');if(Number(result.confirmedQuantity)<h.quantity)reasons.push('QUANTITY_NOT_CONFIRMED');if(flags.some(x=>x.severity==='HIGH'||x.severity==='CRITICAL'))reasons.push('OPEN_FRAUD_FLAG');if(reasons.length)status='REVIEW';
  const encumbered=activeEnc.reduce((n,x)=>n+(x.quantity==null?h.quantity:Number(x.quantity)||0),0);const available=Math.max(0,h.quantity-encumbered);const verifiedAt=now(),ttl=Number(input.ttlDays||this.defaultTtlDays);Object.assign(h,{status,transferable:status==='VERIFIED'&&available>0,verifiedAt,expiresAt:new Date(Date.now()+ttl*86400000).toISOString(),verificationReference:result.reference,updatedAt:verifiedAt});this.repo.saveHolding(h);
  const a={id:randomUUID(),holdingId:id,status,provider:result.provider,reference:result.reference,confirmedQuantity:Number(result.confirmedQuantity),availableQuantity:available,reasons,verifiedAt,expiresAt:h.expiresAt,evidenceDigests:evidence.map(x=>x.digest),createdAt:now()};this.repo.saveAttestation(a);this.audit?.append({actor,action:'OWNERSHIP_VERIFIED',resource:'holding',resourceId:id,metadata:{status,availableQuantity:available}});return {holding:h,attestation:a};
 }
 checkTransferability(id,quantity=0){const h=this.must(id);if(h.expiresAt&&Date.parse(h.expiresAt)<=Date.now()){h.status='EXPIRED';h.transferable=false;this.repo.saveHolding(h)}const enc=this.repo.listEncumbrances(id).filter(x=>x.status==='ACTIVE');const blocked=enc.reduce((n,x)=>n+(x.quantity==null?h.quantity:Number(x.quantity)||0),0),available=Math.max(0,h.quantity-blocked),requested=Number(quantity||0);const reasons=[];if(h.status!=='VERIFIED')reasons.push('OWNERSHIP_NOT_VERIFIED');if(!h.transferable)reasons.push('HOLDING_NOT_TRANSFERABLE');if(requested>available)reasons.push('INSUFFICIENT_UNENCUMBERED_SHARES');return {allowed:!reasons.length,holdingId:id,status:h.status,quantity:h.quantity,availableQuantity:available,requestedQuantity:requested,reasons}}
 gateTransaction(input,actor='system'){const complianceDecision=this.compliance?.repo.getDecision(input.complianceDecisionId);if(!complianceDecision)throw new OwnershipError('COMPLIANCE_DECISION_NOT_FOUND',404);if(!complianceDecision.allowed)throw new OwnershipError('COMPLIANCE_NOT_APPROVED');const h=this.must(input.holdingId);if(h.ownerId!==input.sellerId)throw new OwnershipError('SELLER_NOT_HOLDER');if(complianceDecision.sellerId!==input.sellerId||complianceDecision.buyerId!==input.buyerId||complianceDecision.securityId!==h.securityId)throw new OwnershipError('TRANSACTION_CONTEXT_MISMATCH');const transfer=this.checkTransferability(h.id,input.quantity);const result={id:randomUUID(),complianceDecisionId:complianceDecision.id,holdingId:h.id,buyerId:input.buyerId,sellerId:input.sellerId,securityId:h.securityId,quantity:Number(input.quantity),allowed:transfer.allowed,reasons:transfer.reasons,checkedAt:now()};this.audit?.append({actor,action:'OWNERSHIP_TRANSACTION_GATE',resource:'holding',resourceId:h.id,metadata:{allowed:result.allowed}});return result}
 list(){return this.repo.listHoldings()} details(id){const holding=this.must(id);return {holding,evidence:this.repo.listEvidence(id),encumbrances:this.repo.listEncumbrances(id),attestations:this.repo.listAttestations(id),fraudFlags:this.repo.listFlags(id)}}
}
