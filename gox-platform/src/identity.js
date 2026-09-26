import { randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
const now=()=>new Date().toISOString();
const TYPES=new Set(['INDIVIDUAL','ORGANIZATION']);
const ROLES=new Set(['INVESTOR','ISSUER','BROKER','COMPLIANCE','ADMIN']);
const CASES=new Set(['KYC','KYB','AML','ACCREDITATION']);
export class IdentityError extends Error { constructor(code,status=400){super(code);this.status=status} }
export class InMemoryIdentityRepository {
  constructor(){this.identities=new Map();this.organizations=new Map();this.owners=new Map();this.cases=new Map()}
  saveIdentity(x){this.identities.set(x.id,x);return x} getIdentity(id){return this.identities.get(id)} listIdentities(){return [...this.identities.values()]}
  saveOrganization(x){this.organizations.set(x.id,x);return x} getOrganization(id){return this.organizations.get(id)}
  saveOwner(x){this.owners.set(x.id,x);return x} listOwners(orgId){return [...this.owners.values()].filter(x=>x.organizationId===orgId)}
  saveCase(x){this.cases.set(x.id,x);return x} getCase(id){return this.cases.get(id)} listCases(identityId){return [...this.cases.values()].filter(x=>x.identityId===identityId)}
}
export class MockVerificationProvider {
  constructor(name='mock-verifier'){this.name=name}
  async openCase({caseId,type}){return {provider:this.name,providerCaseId:`mock_${caseId}`,status:'PENDING',type}}
}
export class IdentityService {
  constructor({repository=new InMemoryIdentityRepository(),provider=new MockVerificationProvider(),audit}={}){this.repo=repository;this.provider=provider;this.audit=audit}
  register(input,actor='system'){
    input={...input,type:input.type||'INDIVIDUAL'};
    if(!TYPES.has(input.type))throw new IdentityError('INVALID_IDENTITY_TYPE');
    if(!input.country||!/^[A-Z]{2}$/.test(input.country))throw new IdentityError('INVALID_COUNTRY');
    const roles=[...new Set(input.roles||['INVESTOR'])]; if(roles.some(r=>!ROLES.has(r)))throw new IdentityError('INVALID_ROLE');
    const x={id:input.id||randomUUID(),type:input.type,country:input.country,displayName:input.displayName||input.legalName||null,legalName:input.legalName||input.displayName||null,accreditationStatus:input.accreditationStatus||'QUALIFIED_PURCHASER',riskTier:input.riskTier||'LOW',roles,status:input.status||'PENDING',verificationLevel:input.status==='VERIFIED'?'STANDARD':'NONE',createdAt:now(),updatedAt:now()};
    this.repo.saveIdentity(x);this.audit?.append({actor,action:'IDENTITY_REGISTERED',resource:'identity',resourceId:x.id});return x;
  }
  must(id){const x=this.repo.getIdentity(id);if(!x)throw new IdentityError('IDENTITY_NOT_FOUND',404);return x}
  list(){return this.repo.listIdentities()}
  createOrganization(input,actor='system'){
    const identity=this.must(input.identityId); if(identity.type!=='ORGANIZATION')throw new IdentityError('IDENTITY_NOT_ORGANIZATION');
    if(!input.legalName||!input.registrationNumber)throw new IdentityError('ORGANIZATION_FIELDS_REQUIRED');
    const x={id:randomUUID(),identityId:identity.id,legalName:input.legalName,registrationNumber:input.registrationNumber,jurisdiction:input.jurisdiction||identity.country,createdAt:now()};this.repo.saveOrganization(x);this.audit?.append({actor,action:'ORGANIZATION_CREATED',resource:'organization',resourceId:x.id});return x;
  }
  addBeneficialOwner(orgId,input,actor='system'){
    const org=this.repo.getOrganization(orgId);if(!org)throw new IdentityError('ORGANIZATION_NOT_FOUND',404);const owner=this.must(input.identityId);if(owner.type!=='INDIVIDUAL')throw new IdentityError('OWNER_MUST_BE_INDIVIDUAL');
    const pct=Number(input.ownershipPercent);if(!(pct>0&&pct<=100))throw new IdentityError('INVALID_OWNERSHIP_PERCENT');const total=this.repo.listOwners(orgId).reduce((n,x)=>n+x.ownershipPercent,0);if(total+pct>100)throw new IdentityError('OWNERSHIP_EXCEEDS_100');
    const x={id:randomUUID(),organizationId:orgId,identityId:owner.id,ownershipPercent:pct,controlPerson:Boolean(input.controlPerson),createdAt:now()};this.repo.saveOwner(x);this.audit?.append({actor,action:'BENEFICIAL_OWNER_ADDED',resource:'organization',resourceId:orgId});return x;
  }
  async openVerification(identityId,input,actor='system'){
    this.must(identityId);if(!CASES.has(input.type))throw new IdentityError('INVALID_VERIFICATION_TYPE');const c={id:randomUUID(),identityId,type:input.type,status:'PENDING',provider:null,providerCaseId:null,createdAt:now(),updatedAt:now()};
    const p=await this.provider.openCase({caseId:c.id,type:c.type,identityId});Object.assign(c,p,{updatedAt:now()});this.repo.saveCase(c);this.audit?.append({actor,action:'VERIFICATION_OPENED',resource:'verification_case',resourceId:c.id});return c;
  }
  decideCase(caseId,input,actor='system'){
    const c=this.repo.getCase(caseId);if(!c)throw new IdentityError('VERIFICATION_NOT_FOUND',404);if(!['APPROVED','REJECTED','REVIEW'].includes(input.decision))throw new IdentityError('INVALID_DECISION');
    c.status=input.decision;c.reason=input.reason||null;c.updatedAt=now();this.repo.saveCase(c);const i=this.must(c.identityId);const cases=this.repo.listCases(i.id);const required=i.type==='ORGANIZATION'?['KYB','AML']:['KYC','AML'];
    if(cases.some(x=>x.status==='REJECTED')){i.status='REJECTED';i.verificationLevel='NONE'}else if(required.every(t=>cases.some(x=>x.type===t&&x.status==='APPROVED'))){i.status='VERIFIED';i.verificationLevel='STANDARD'}else{i.status='PENDING'}i.updatedAt=now();this.repo.saveIdentity(i);this.audit?.append({actor,action:`VERIFICATION_${input.decision}`,resource:'verification_case',resourceId:c.id});return {case:c,identity:i};
  }
  verify(id,actor='system'){return this.verifyLegacy(id,actor)}
  verifyLegacy(id,actor='system'){const i=this.must(id);i.status='VERIFIED';i.verificationLevel='DEV_OVERRIDE';i.updatedAt=now();this.repo.saveIdentity(i);this.audit?.append({actor,action:'IDENTITY_DEV_VERIFIED',resource:'identity',resourceId:id});return i}
}
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
export class AuthService {
  constructor(secret=process.env.GOX_AUTH_SECRET||'development-only-change-me'){this.secret=secret}
  issue({sub,roles=[],ttlSeconds=3600}){const h=b64({alg:'HS256',typ:'JWT'}),p=b64({sub,roles,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+ttlSeconds});const sig=createHmac('sha256',this.secret).update(`${h}.${p}`).digest('base64url');return `${h}.${p}.${sig}`}
  verify(token){try{const [h,p,s]=token.split('.');const expected=createHmac('sha256',this.secret).update(`${h}.${p}`).digest('base64url');if(!timingSafeEqual(Buffer.from(s),Buffer.from(expected)))throw 0;const payload=JSON.parse(Buffer.from(p,'base64url'));if(payload.exp<Date.now()/1000)throw 0;return payload}catch{throw new IdentityError('UNAUTHORIZED',401)}}
  require(req,roles=[]){const v=req.headers.authorization||'';if(!v.startsWith('Bearer '))throw new IdentityError('UNAUTHORIZED',401);const p=this.verify(v.slice(7));if(roles.length&&!roles.some(r=>p.roles?.includes(r)))throw new IdentityError('FORBIDDEN',403);return p}
}
