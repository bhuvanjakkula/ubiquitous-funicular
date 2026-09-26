import { randomUUID, createHash } from 'node:crypto';
import { IdentityService, AuthService } from './identity.js';
import { ProgrammableOwnershipService } from './programmable.js';
import { CapTableService } from './cap-table.js';
import { PriceDiscoveryService } from './pricing.js';
import { LiquidityService } from './liquidity.js';
import { SettlementService } from './settlement.js';

export const id = () => randomUUID();
export const now = () => new Date().toISOString();

class Store {
  constructor() {
    this.m = new Map();
  }
  save(x) {
    this.m.set(x.id, x);
    return x;
  }
  get(i) {
    return this.m.get(i);
  }
  all() {
    return [...this.m.values()];
  }
  clear() {
    this.m.clear();
  }
}

class Compliance {
  constructor() {
    this.rulePacks = new Map();
  }

  evaluate(x) {
    const r = [];
    if (!x.buyerVerified) r.push('BUYER_IDENTITY_NOT_VERIFIED');
    if (!x.sellerVerified) r.push('SELLER_IDENTITY_NOT_VERIFIED');
    return {
      allowed: !r.length,
      reasons: r,
      ruleVersion: 'dev-v1'
    };
  }

  evaluateTrade(context) {
    const reasons = [];
    const { buyer, seller, policy, quantity = 1, rulePack = 'GLOBAL_INSTITUTIONAL' } = context;

    if (!buyer || buyer.status !== 'VERIFIED') {
      reasons.push('BUYER_IDENTITY_NOT_VERIFIED');
    }
    if (!seller || seller.status !== 'VERIFIED') {
      reasons.push('SELLER_IDENTITY_NOT_VERIFIED');
    }
    if (buyer?.riskTier === 'HIGH') {
      reasons.push('BUYER_HIGH_AML_RISK_FLAGGED');
    }
    if (seller?.riskTier === 'HIGH') {
      reasons.push('SELLER_HIGH_AML_RISK_FLAGGED');
    }

    if (policy) {
      if (policy.allowedCountries && policy.allowedCountries.length > 0) {
        if (!policy.allowedCountries.includes(buyer?.country)) {
          reasons.push(`BUYER_COUNTRY_${buyer?.country || 'UNKNOWN'}_NOT_IN_ALLOWLIST`);
        }
      }
      if (policy.blockedCountries && policy.blockedCountries.includes(buyer?.country)) {
        reasons.push(`BUYER_COUNTRY_${buyer?.country}_BLOCKED`);
      }
      if (policy.lockupUntil && Date.now() < Date.parse(policy.lockupUntil)) {
        reasons.push(`ASSET_TRANSFER_LOCKED_UNTIL_${policy.lockupUntil}`);
      }
      if (policy.maxPerInvestor && quantity > policy.maxPerInvestor) {
        reasons.push(`ORDER_QTY_${quantity}_EXCEEDS_INVESTOR_CAP_${policy.maxPerInvestor}`);
      }
      if (policy.accreditedOnly && buyer?.accreditationStatus === 'RETAIL') {
        reasons.push('RETAIL_INVESTOR_DISALLOWED_ACCREDITED_ONLY');
      }
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      rulePack,
      ruleVersion: 'institutional-v2.1',
      auditDigest: createHash('sha256').update(JSON.stringify({ buyerId: buyer?.id, reasons })).digest('hex').slice(0, 16),
      evaluatedAt: now()
    };
  }
}

class Ownership {
  constructor() {
    this.s = new Store();
    this.securities = new Store();
  }

  createSecurity(sec) {
    const s = {
      id: sec.id || sec.symbol || id(),
      symbol: sec.symbol || 'ASSET',
      name: sec.name || 'Private Share Class',
      issuerId: sec.issuerId || 'ISSUER-01',
      issuerName: sec.issuerName || 'Global Private Tech Inc.',
      shareClass: sec.shareClass || 'Series Preferred',
      authorizedShares: sec.authorizedShares || 10000000,
      parValueMinor: sec.parValueMinor || 100,
      currency: sec.currency || 'USD',
      isin: sec.isin || 'US' + Math.random().toString(36).substring(2, 11).toUpperCase() + '0',
      createdAt: now(),
      ...sec
    };
    return this.securities.save(s);
  }

  getSecurity(idOrSymbol) {
    const all = this.securities.all();
    return all.find(s => s.id === idOrSymbol || s.symbol === idOrSymbol);
  }

  listSecurities() {
    return this.securities.all();
  }

  create(x) {
    const certNum = 'CERT-GOX-' + Math.floor(100000 + Math.random() * 900000);
    const holding = {
      id: x.id || id(),
      securityId: x.securityId || 'SEC-01',
      issuerId: x.issuerId || 'ISSUER-01',
      ownerId: x.ownerId || x.participantId || 'OWNER-01',
      quantity: Number(x.quantity) || 0,
      certificateNumber: x.certificateNumber || certNum,
      verified: Boolean(x.verified),
      ownershipProofHash: createHash('sha256').update(JSON.stringify({ ...x, certNum })).digest('hex'),
      createdAt: now(),
      ...x
    };
    return this.s.save(holding);
  }

  verify(i) {
    const h = this.s.get(i);
    if (!h) throw new Error('HOLDING_NOT_FOUND');
    return this.s.save({ ...h, verified: true, verifiedAt: now() });
  }

  list() {
    return this.s.all();
  }

  findByOwner(ownerId) {
    return this.s.all().filter(h => h.ownerId === ownerId);
  }
}

class ProgrammableWrapper {
  constructor(service) {
    this.service = service;
    this.legacyPolicies = new Map();
  }

  set(x) {
    const policy = {
      securityId: x.securityId,
      allowedCountries: x.allowedCountries || null,
      blockedCountries: x.blockedCountries || [],
      lockupUntil: x.lockupUntil || null,
      maxPerInvestor: x.maxPerInvestor ? Number(x.maxPerInvestor) : null,
      requiresBoardApproval: Boolean(x.requiresBoardApproval),
      rofrRequired: Boolean(x.rofrRequired),
      accreditedOnly: x.accreditedOnly !== undefined ? Boolean(x.accreditedOnly) : true,
      updatedAt: now()
    };
    this.legacyPolicies.set(x.securityId, policy);
    try {
      this.service.create({
        securityId: x.securityId,
        issuerId: x.issuerId,
        rules: {
          allowedCountries: policy.allowedCountries,
          blockedCountries: policy.blockedCountries,
          lockupUntil: policy.lockupUntil,
          maxPerInvestor: policy.maxPerInvestor
        }
      });
    } catch {}
    return policy;
  }

  get(securityId) {
    return this.legacyPolicies.get(securityId);
  }

  list() {
    return [...this.legacyPolicies.values()];
  }

  create(input, actor = 'system') {
    return this.service.create(input, actor);
  }

  amend(securityId, input, actor = 'system') {
    return this.service.amend(securityId, input, actor);
  }

  current(securityId, at) {
    return this.service.current(securityId, at);
  }

  history(securityId) {
    return this.service.history(securityId);
  }

  evaluate(input, actor = 'system') {
    return this.service.evaluate(input, actor);
  }

  recordCorporateAction(securityId, input, actor = 'system') {
    return this.service.recordCorporateAction(securityId, input, actor);
  }

  check(s, c, q) {
    const p = this.legacyPolicies.get(s);
    const r = [];
    if (!p) return { allowed: true, reasons: r };
    if (p.allowedCountries && !p.allowedCountries.includes(c)) r.push('COUNTRY_NOT_ALLOWED');
    if (p.blockedCountries?.includes(c)) r.push('COUNTRY_BLOCKED');
    if (p.lockupUntil && Date.now() < Date.parse(p.lockupUntil)) r.push('LOCKUP_ACTIVE');
    if (p.maxPerInvestor && q > p.maxPerInvestor) r.push('INVESTOR_LIMIT_EXCEEDED');
    return { allowed: !r.length, reasons: r };
  }
}

class PricingWrapper {
  constructor(service) {
    this.service = service;
  }

  reference(b = [], a = []) {
    const validBids = b.filter(x => typeof x === 'number' && !isNaN(x));
    const validAsks = a.filter(x => typeof x === 'number' && !isNaN(x));
    const bestBid = validBids.length ? Math.max(...validBids, 0) : 0;
    const bestAsk = validAsks.length ? Math.min(...validAsks) : 0;
    return {
      bestBid,
      bestAsk,
      spread: bestBid && bestAsk ? Math.abs(bestAsk - bestBid) : null,
      mid: bestBid && bestAsk ? (bestBid + bestAsk) / 2 : null
    };
  }

  observe(input, actor = 'system') { return this.service.observe(input, actor); }
  market(securityId, opts) { return this.service.market(securityId, opts); }
  quote(input, actor = 'system') { return this.service.quote(input, actor); }
  createAuction(input, actor = 'system') { return this.service.createAuction(input, actor); }
  submitAuctionOrder(id, input, actor = 'system') { return this.service.submitAuctionOrder(id, input, actor); }
  clearAuction(id, actor = 'system') { return this.service.clearAuction(id, actor); }
  history(securityId, opts) { return this.service.history(securityId, opts); }
  alertsFor(securityId) { return this.service.alertsFor(securityId); }
}

class Audit {
  constructor() {
    this.r = [];
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
  }
  append(x) {
    const seq = this.r.length + 1;
    const prev = this.r.at(-1)?.hash || this.lastHash;
    const b = { sequence: seq, id: id(), at: now(), prevHash: prev, ...x };
    const hash = createHash('sha256').update(JSON.stringify(b)).digest('hex');
    const r = { ...b, hash };
    this.lastHash = hash;
    this.r.push(r);
    return r;
  }
  all() {
    return this.r;
  }
  verifyChain() {
    let prev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const record of this.r) {
      const { hash, ...data } = record;
      const computed = createHash('sha256').update(JSON.stringify(data)).digest('hex');
      if (computed !== hash) return { valid: false, brokenAtSequence: record.sequence };
      prev = hash;
    }
    return { valid: true, length: this.r.length };
  }
}

// Global Core Service Instances
const auditInstance = new Audit();
const rawProgrammable = new ProgrammableOwnershipService({ audit: auditInstance });
const programmableWrapper = new ProgrammableWrapper(rawProgrammable);
const capTableService = new CapTableService({ audit: auditInstance, programmable: rawProgrammable });
const rawPricing = new PriceDiscoveryService({ audit: auditInstance, capTable: capTableService });
const pricingWrapper = new PricingWrapper(rawPricing);
const liquidityService = new LiquidityService({ audit: auditInstance, capTable: capTableService, pricing: rawPricing });
const settlementService = new SettlementService({ audit: auditInstance, liquidity: liquidityService, capTable: capTableService });
const identityService = new IdentityService({ audit: auditInstance });
const ownershipInstance = new Ownership();
const complianceInstance = new Compliance();
const authService = new AuthService();

export const gox = {
  audit: auditInstance,
  identity: identityService,
  auth: authService,
  compliance: complianceInstance,
  ownership: ownershipInstance,
  programmable: programmableWrapper,
  capTable: capTableService,
  pricing: pricingWrapper,
  liquidity: liquidityService,
  settlement: settlementService
};

export function resetPlatform() {
  identityService.repo.identities.clear();
  identityService.repo.organizations.clear();
  identityService.repo.owners.clear();
  identityService.repo.cases.clear();
  
  ownershipInstance.s.clear();
  ownershipInstance.securities.clear();
  
  programmableWrapper.legacyPolicies.clear();
  
  capTableService.classes.clear();
  capTableService.entries.length = 0;
  capTableService.actions.length = 0;
  capTableService.reconciliations.length = 0;
  
  liquidityService.orders.clear();
  liquidityService.trades.length = 0;
  liquidityService.rfqs.clear();
  liquidityService.venues.clear();
  liquidityService.alerts.length = 0;
  
  settlementService.records.clear();
  settlementService.byTrade.clear();
  settlementService.receipts.length = 0;
  settlementService.cash.reservations.clear();
  settlementService.cash.completions.clear();
  settlementService.securities.reservations.clear();
  settlementService.securities.completions.clear();
  
  auditInstance.r.length = 0;
  auditInstance.lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
  
  seedDefaultMarketData();
  return { success: true };
}

// Seed default platform state
export function seedDefaultMarketData() {
  // 1. Register Participants
  const apollo = gox.identity.register({
    id: 'PART-APOLLO',
    type: 'ORGANIZATION',
    country: 'US',
    roles: ['INVESTOR'],
    displayName: 'Apollo Global Growth Fund IX',
    legalName: 'Apollo Global Growth Fund IX',
    accreditationStatus: 'QUALIFIED_PURCHASER',
    riskTier: 'LOW',
    status: 'VERIFIED'
  });
  gox.identity.verifyLegacy('PART-APOLLO');

  const sequoia = gox.identity.register({
    id: 'PART-SEQUOIA',
    type: 'ORGANIZATION',
    country: 'US',
    roles: ['INVESTOR', 'ISSUER'],
    displayName: 'Sequoia Private Secondary SPV',
    legalName: 'Sequoia Private Secondary SPV',
    accreditationStatus: 'QUALIFIED_PURCHASER',
    riskTier: 'LOW',
    status: 'VERIFIED'
  });
  gox.identity.verifyLegacy('PART-SEQUOIA');

  const blackrock = gox.identity.register({
    id: 'PART-BLACKROCK',
    type: 'ORGANIZATION',
    country: 'GB',
    roles: ['INVESTOR'],
    displayName: 'BlackRock Private Equity Strategies',
    legalName: 'BlackRock Private Equity Strategies',
    accreditationStatus: 'QUALIFIED_PURCHASER',
    riskTier: 'LOW',
    status: 'VERIFIED'
  });
  gox.identity.verifyLegacy('PART-BLACKROCK');

  const temasek = gox.identity.register({
    id: 'PART-TEMASEK',
    type: 'ORGANIZATION',
    country: 'SG',
    roles: ['INVESTOR'],
    displayName: 'Temasek Holdings International',
    legalName: 'Temasek Holdings International',
    accreditationStatus: 'QUALIFIED_PURCHASER',
    riskTier: 'LOW',
    status: 'VERIFIED'
  });
  gox.identity.verifyLegacy('PART-TEMASEK');

  const founderJane = gox.identity.register({
    id: 'PART-FOUNDER-JANE',
    type: 'INDIVIDUAL',
    country: 'US',
    roles: ['INVESTOR'],
    displayName: 'Dr. Jane Vance (Founding Partner)',
    legalName: 'Dr. Jane Vance (Founding Partner)',
    accreditationStatus: 'ACCREDITED',
    riskTier: 'LOW',
    status: 'VERIFIED'
  });
  gox.identity.verifyLegacy('PART-FOUNDER-JANE');

  gox.identity.register({
    id: 'PART-OFFSHORE-VENTURES',
    type: 'ORGANIZATION',
    country: 'KY',
    roles: ['INVESTOR'],
    displayName: 'Offshore Alpha Investments Ltd',
    legalName: 'Offshore Alpha Investments Ltd',
    accreditationStatus: 'RETAIL',
    riskTier: 'HIGH',
    status: 'PENDING'
  });

  // 2. Securities Master
  gox.ownership.createSecurity({
    id: 'SPCX-N',
    symbol: 'SPCX-N',
    name: 'SpaceX Series N Preferred',
    issuerId: 'ISS-SPACEX',
    issuerName: 'Space Exploration Technologies Corp.',
    shareClass: 'Series N Preferred',
    authorizedShares: 50000000,
    parValueMinor: 100,
    currency: 'USD',
    isin: 'US84752X1001'
  });

  gox.ownership.createSecurity({
    id: 'ANTH-C',
    symbol: 'ANTH-C',
    name: 'Anthropic Series C Growth Shares',
    issuerId: 'ISS-ANTHROPIC',
    issuerName: 'Anthropic PBC',
    shareClass: 'Series C Preferred',
    authorizedShares: 25000000,
    parValueMinor: 100,
    currency: 'USD',
    isin: 'US03672A2005'
  });

  gox.ownership.createSecurity({
    id: 'STRP-A',
    symbol: 'STRP-A',
    name: 'Stripe Class A Common Stock',
    issuerId: 'ISS-STRIPE',
    issuerName: 'Stripe Inc.',
    shareClass: 'Class A Common',
    authorizedShares: 100000000,
    parValueMinor: 1,
    currency: 'USD',
    isin: 'US86311S3009'
  });

  // 3. Share Classes in Cap Table
  try {
    gox.capTable.createShareClass({ issuerId: 'ISS-SPACEX', securityId: 'SPCX-N', name: 'Series N Preferred', authorized: 50000000 });
    gox.capTable.createShareClass({ issuerId: 'ISS-ANTHROPIC', securityId: 'ANTH-C', name: 'Series C Preferred', authorized: 25000000 });
    gox.capTable.createShareClass({ issuerId: 'ISS-STRIPE', securityId: 'STRP-A', name: 'Class A Common', authorized: 100000000 });
  } catch {}

  // 4. Initial Issuances
  try {
    gox.capTable.issue({ issuerId: 'ISS-SPACEX', securityId: 'SPCX-N', ownerId: 'PART-SEQUOIA', quantity: 125000 });
    gox.capTable.issue({ issuerId: 'ISS-SPACEX', securityId: 'SPCX-N', ownerId: 'PART-FOUNDER-JANE', quantity: 50000 });
    gox.capTable.issue({ issuerId: 'ISS-SPACEX', securityId: 'SPCX-N', ownerId: 'PART-BLACKROCK', quantity: 80000 });

    gox.capTable.issue({ issuerId: 'ISS-ANTHROPIC', securityId: 'ANTH-C', ownerId: 'PART-APOLLO', quantity: 75000 });
    gox.capTable.issue({ issuerId: 'ISS-ANTHROPIC', securityId: 'ANTH-C', ownerId: 'PART-TEMASEK', quantity: 60000 });

    gox.capTable.issue({ issuerId: 'ISS-STRIPE', securityId: 'STRP-A', ownerId: 'PART-SEQUOIA', quantity: 450000 });
    gox.capTable.issue({ issuerId: 'ISS-STRIPE', securityId: 'STRP-A', ownerId: 'PART-BLACKROCK', quantity: 320000 });
  } catch {}

  // 5. Holdings
  gox.ownership.create({ securityId: 'SPCX-N', issuerId: 'ISS-SPACEX', ownerId: 'PART-SEQUOIA', quantity: 125000, verified: true });
  gox.ownership.create({ securityId: 'SPCX-N', issuerId: 'ISS-SPACEX', ownerId: 'PART-FOUNDER-JANE', quantity: 50000, verified: true });
  gox.ownership.create({ securityId: 'ANTH-C', issuerId: 'ISS-ANTHROPIC', ownerId: 'PART-APOLLO', quantity: 75000, verified: true });

  // 6. Programmable Policies
  gox.programmable.set({
    securityId: 'SPCX-N',
    issuerId: 'ISS-SPACEX',
    allowedCountries: ['US', 'GB', 'SG', 'DE', 'CH', 'IN'],
    blockedCountries: ['KP', 'IR', 'RU'],
    maxPerInvestor: 500000,
    requiresBoardApproval: true,
    accreditedOnly: true
  });

  gox.programmable.set({
    securityId: 'ANTH-C',
    issuerId: 'ISS-ANTHROPIC',
    allowedCountries: ['US', 'GB', 'SG', 'CA', 'FR'],
    blockedCountries: ['KP', 'IR'],
    maxPerInvestor: 200000,
    requiresBoardApproval: false,
    accreditedOnly: true
  });

  // 7. Initial Order Book
  try {
    gox.liquidity.place({ participantId: 'PART-APOLLO', issuerId: 'ISS-SPACEX', securityId: 'SPCX-N', side: 'BUY', quantity: 15000, priceMinor: 11200, autoMatch: false });
    gox.liquidity.place({ participantId: 'PART-TEMASEK', issuerId: 'ISS-SPACEX', securityId: 'SPCX-N', side: 'BUY', quantity: 25000, priceMinor: 11150, autoMatch: false });
    gox.liquidity.place({ participantId: 'PART-SEQUOIA', issuerId: 'ISS-SPACEX', securityId: 'SPCX-N', side: 'SELL', quantity: 20000, priceMinor: 11400, autoMatch: false });
    gox.liquidity.place({ participantId: 'PART-FOUNDER-JANE', issuerId: 'ISS-SPACEX', securityId: 'SPCX-N', side: 'SELL', quantity: 10000, priceMinor: 11500, autoMatch: false });
    
    gox.liquidity.place({ participantId: 'PART-BLACKROCK', issuerId: 'ISS-ANTHROPIC', securityId: 'ANTH-C', side: 'BUY', quantity: 12000, priceMinor: 4850, autoMatch: false });
    gox.liquidity.place({ participantId: 'PART-TEMASEK', issuerId: 'ISS-ANTHROPIC', securityId: 'ANTH-C', side: 'SELL', quantity: 15000, priceMinor: 5100, autoMatch: false });
  } catch {}

  // 8. Pricing Observations
  try {
    gox.pricing.observe({ securityId: 'SPCX-N', side: 'BUY', priceMinor: 11200, quantity: 15000, type: 'QUOTE' });
    gox.pricing.observe({ securityId: 'SPCX-N', side: 'SELL', priceMinor: 11400, quantity: 20000, type: 'QUOTE' });
    gox.pricing.observe({ securityId: 'SPCX-N', priceMinor: 11300, quantity: 5000, type: 'REFERENCE' });
  } catch {}

  // 9. Genesis Audit Logs
  gox.audit.append({ actor: 'GENESIS_BOOT', action: 'PLATFORM_INITIALIZED', resource: 'gox-engine' });
  gox.audit.append({ actor: 'REGISTRY_ADMIN', action: 'CAP_TABLE_INITIALIZED', resource: 'cap-table', resourceId: 'ISS-SPACEX' });
}

// Automatically seed default data
seedDefaultMarketData();
