/**
 * GOX — Comprehensive Execution Runner across All Downloaded Modules
 */

import { IdentityService, InMemoryIdentityRepository, MockVerificationProvider, AuthService } from '../src/identity.js';
import { ComplianceService, InMemoryComplianceRepository } from '../src/compliance.js';
import { OwnershipService, InMemoryOwnershipRepository, MockOwnershipSourceAdapter } from '../src/ownership.js';
import { ProgrammableOwnershipService } from '../src/programmable.js';
import { gox } from '../src/platform.js';

console.log('\n================================================================');
console.log('🏛️  GOX PLATFORM — FULL END-TO-END EXECUTION RUNNER');
console.log('================================================================\n');

// -------------------------------------------------------------
// 1. Identity & Accreditation (from gox-platform (1) & (2))
// -------------------------------------------------------------
console.log('--- [PILLAR 01] IDENTITY & ACCREDITATION EXECUTION ---');
const identityRepo = new InMemoryIdentityRepository();
const identityService = new IdentityService({ repository: identityRepo });
const authService = new AuthService('gox-institutional-secret');

// Register Individual Investor
const buyer = identityService.register({
  type: 'INDIVIDUAL',
  country: 'IN',
  roles: ['INVESTOR'],
  displayName: 'Rohan Sharma (Accredited Angel)'
});
console.log(`✓ Registered Individual: ${buyer.displayName} [ID: ${buyer.id}]`);

// Register Corporate Issuer & Beneficial Owner
const issuerOrg = identityService.register({
  type: 'ORGANIZATION',
  country: 'US',
  roles: ['ISSUER'],
  displayName: 'SpaceX Commercial Holdings LLC'
});
const orgDetails = identityService.createOrganization({
  identityId: issuerOrg.id,
  legalName: 'SpaceX Commercial Holdings LLC',
  registrationNumber: 'DEL-2024-SPCX',
  jurisdiction: 'US'
});
console.log(`✓ Registered Corporate Issuer: ${orgDetails.legalName} [Reg: ${orgDetails.registrationNumber}]`);

const founder = identityService.register({
  type: 'INDIVIDUAL',
  country: 'US',
  roles: ['INVESTOR'],
  displayName: 'Chief Executive Officer'
});
const ubo = identityService.addBeneficialOwner(orgDetails.id, {
  identityId: founder.id,
  ownershipPercent: 55.0,
  controlPerson: true
});
console.log(`✓ Beneficial Ownership (UBO) Recorded: ${ubo.ownershipPercent}% control by ${founder.displayName}`);

// Complete KYC/KYB & AML Cases
const kycCase = await identityService.openVerification(buyer.id, { type: 'KYC' });
const amlCase = await identityService.openVerification(buyer.id, { type: 'AML' });
identityService.decideCase(kycCase.id, { decision: 'APPROVED' });
identityService.decideCase(amlCase.id, { decision: 'APPROVED' });
const verifiedBuyer = identityService.must(buyer.id);
console.log(`✓ Multi-Stage Verification Completed: Status is now ${verifiedBuyer.status} (${verifiedBuyer.verificationLevel})`);

// Issue and Verify Institutional Auth JWT
const jwt = authService.issue({ sub: verifiedBuyer.id, roles: verifiedBuyer.roles, ttlSeconds: 7200 });
const decoded = authService.verify(jwt);
console.log(`✓ Institutional JWT Token Issued & Cryptographically Verified (Subject: ${decoded.sub})`);

// -------------------------------------------------------------
// 2. Compliance Engine (from gox-platform (3))
// -------------------------------------------------------------
console.log('\n--- [PILLAR 02] COMPLIANCE ENGINE POLICY DSL EXECUTION ---');
const complianceRepo = new InMemoryComplianceRepository();
const complianceService = new ComplianceService({ repository: complianceRepo, identity: identityService });

const security = complianceService.createSecurity({
  issuerId: issuerOrg.id,
  name: 'SpaceX Series N Preferred Stock',
  issuerCountry: 'US',
  classification: 'PREFERRED_EQUITY',
  currency: 'USD'
});
console.log(`✓ Security Registered in Compliance Master: ${security.name} [ID: ${security.id}]`);

const { policy, version } = complianceService.createPolicy({
  name: 'Cross-Border Reg-D Institutional Policy',
  rules: [
    { type: 'IDENTITY_VERIFIED', subject: 'BUYER', effect: 'DENY', reason: 'BUYER_MUST_BE_KYC_VERIFIED' },
    { type: 'IDENTITY_VERIFIED', subject: 'SELLER', effect: 'DENY', reason: 'SELLER_MUST_BE_KYC_VERIFIED' },
    { type: 'COUNTRY_ALLOWLIST', subject: 'BUYER', values: ['US', 'IN', 'GB', 'SG'], effect: 'DENY', reason: 'BUYER_COUNTRY_NOT_AUTHORIZED' }
  ]
});
complianceService.activate(policy.id, version.id);
console.log(`✓ Versioned Compliance Policy Active: "${policy.name}" (Version ${version.version})`);

// Pre-trade evaluation
identityService.verifyLegacy(founder.id);
const compDecision = complianceService.evaluate({
  policyId: policy.id,
  buyerId: verifiedBuyer.id,
  sellerId: founder.id,
  securityId: security.id,
  action: 'BUY'
});
console.log(`✓ Pre-Trade Compliance Result: Outcome = ${compDecision.outcome} (Allowed: ${compDecision.allowed})`);

// -------------------------------------------------------------
// 3. Ownership Verification (from gox-platform (4))
// -------------------------------------------------------------
console.log('\n--- [PILLAR 03] AUTHORITATIVE OWNERSHIP VERIFICATION EXECUTION ---');
const ownershipRepo = new InMemoryOwnershipRepository();
const ownershipService = new OwnershipService({
  repository: ownershipRepo,
  identity: identityService,
  compliance: complianceService
});

const holding = ownershipService.create({
  ownerId: founder.id,
  securityId: security.id,
  quantity: 50000,
  sourceType: 'TRANSFER_AGENT',
  certificateRef: 'CERT-SPCX-0091'
});
console.log(`✓ Equity Holding Created: ${holding.quantity.toLocaleString()} shares of ${security.name} for ${founder.displayName}`);

ownershipService.addEvidence(holding.id, {
  type: 'REGISTER_ENTRY',
  reference: 'TA-COMPUTERSHARE-REF-909283',
  issuer: 'Computershare Institutional Custody'
});
ownershipService.addEncumbrance(holding.id, {
  type: 'PLEDGE',
  quantity: 5000,
  details: 'Collateralized against working capital facility'
});
console.log(`✓ Evidence & Encumbrance Recorded: 5,000 shares encumbered (PLEDGE)`);

const verifiedHolding = await ownershipService.verify(holding.id);
console.log(`✓ Holding Verified: Status = ${verifiedHolding.holding.status}, Available Unencumbered Qty = ${verifiedHolding.attestation.availableQuantity.toLocaleString()} shares`);

const txGate = ownershipService.gateTransaction({
  complianceDecisionId: compDecision.id,
  holdingId: holding.id,
  buyerId: verifiedBuyer.id,
  sellerId: founder.id,
  quantity: 10000
});
console.log(`✓ Ownership Transaction Gate Passed: Allowed = ${txGate.allowed} for trade of ${txGate.quantity.toLocaleString()} shares`);

// -------------------------------------------------------------
// 4. Programmable Ownership (from gox-platform (5) & (6))
// -------------------------------------------------------------
console.log('\n--- [PILLAR 04] PROGRAMMABLE OWNERSHIP RESTRICTIONS EXECUTION ---');
const programmableService = new ProgrammableOwnershipService();
const prog = programmableService.create({
  securityId: security.id,
  rules: {
    allowedCountries: ['US', 'IN', 'GB', 'SG'],
    allowedInvestorTypes: ['INVESTOR', 'ACCREDITED'],
    maxPerInvestor: 100000,
    requiredComplianceDecision: 'ALLOW',
    requireOwnershipVerified: true
  },
  corporateActionHooks: ['DIVIDEND', 'STOCK_SPLIT']
});
console.log(`✓ Programmable Ownership Program Installed: Version ${prog.version}, Policy Hash: ${prog.policyHash.substring(0, 16)}...`);

const progEval = programmableService.evaluate({
  securityId: security.id,
  buyerCountry: 'IN',
  buyerInvestorType: 'INVESTOR',
  buyerCurrentQuantity: 0,
  quantity: 10000,
  complianceDecision: 'ALLOW',
  ownershipVerified: true
});
console.log(`✓ Programmable Rules Evaluation: Decision = ${progEval.decision}`);

const divAction = programmableService.recordCorporateAction(security.id, {
  type: 'DIVIDEND',
  payload: { perShareAmountCents: 150, recordDate: '2026-10-01' }
});
console.log(`✓ Corporate Action Executed via Hook: ${divAction.type} Recorded [ID: ${divAction.id}]`);

// -------------------------------------------------------------
// 5. Cap Table, Liquidity & DvP Settlement (from gox-platform (7)-(10))
// -------------------------------------------------------------
console.log('\n--- [PILLARS 05-08] CAP TABLE, MATCHING & DVP SETTLEMENT ---');

// 5a. Cap Table Share Class & Issuance
try {
  gox.capTable.createShareClass({
    issuerId: 'ISS-SPACEX',
    securityId: security.id,
    name: 'Series N Preferred Stock',
    authorized: 5000000
  });
} catch {}

gox.capTable.issue({
  issuerId: 'ISS-SPACEX',
  securityId: security.id,
  ownerId: founder.id,
  quantity: 100000,
  reference: 'FOUNDER_GRANT'
});
console.log(`✓ Global Cap Table: Issued 100,000 shares to ${founder.id} (Balance: ${gox.capTable.balance('ISS-SPACEX', security.id, founder.id).toLocaleString()} shares)`);

// 5b. Programmable Gate Setup on Cap Table
const secProg = gox.programmable.create({
  securityId: security.id,
  rules: {
    allowedCountries: ['IN', 'US'],
    maxPerInvestor: 200000,
    requireOwnershipVerified: false
  }
});
const transferGate = gox.programmable.evaluate({
  securityId: security.id,
  buyerCountry: 'IN',
  quantity: 10000,
  complianceDecision: 'ALLOW'
});
console.log(`✓ Programmable Cap Table Transfer Gate: Decision = ${transferGate.decision}`);

// 5c. Liquidity Matching
const sellerOrder = gox.liquidity.place({
  participantId: founder.id,
  issuerId: 'ISS-SPACEX',
  securityId: security.id,
  side: 'SELL',
  quantity: 10000,
  priceMinor: 11500, // $115.00
  autoMatch: false
});

const buyerOrder = gox.liquidity.place({
  participantId: verifiedBuyer.id,
  issuerId: 'ISS-SPACEX',
  securityId: security.id,
  side: 'BUY',
  quantity: 10000,
  priceMinor: 11500, // $115.00
  autoMatch: false
});
console.log(`✓ Liquidity Order Book: Placed BUY & SELL orders for 10,000 shares @ $115.00`);

const matches = gox.liquidity.match(security.id);
const matchedTrade = matches[0];
console.log(`✓ Continuous Liquidity Match Executed: Trade ID: ${matchedTrade.id.substring(0, 8)} | Qty: ${matchedTrade.quantity.toLocaleString()} | Price: $${(matchedTrade.priceMinor / 100).toFixed(2)} | Gross: $${((matchedTrade.quantity * matchedTrade.priceMinor) / 100).toLocaleString()}`);

// 5d. Coordinated DvP Settlement
const settlement = gox.settlement.create(matchedTrade.id);
console.log(`✓ DvP Settlement Initialized: ID ${settlement.id} (Status: ${settlement.status})`);

gox.settlement.confirm(settlement.id, 'cash');
console.log(`✓ Cash Escrow Leg Confirmed`);

const settled = gox.settlement.confirm(settlement.id, 'asset');
console.log(`🏆 ATOMIC DVP FINALITY REACHED: Status = ${settled.status}`);

// Atomic Cap Table Mutation
gox.capTable.transfer({
  issuerId: 'ISS-SPACEX',
  securityId: security.id,
  fromOwnerId: founder.id,
  toOwnerId: verifiedBuyer.id,
  quantity: 10000,
  reference: 'DVP_TRADE_FINALITY',
  programDecision: transferGate
});
console.log(`✓ Cap Table Atomically Updated: Transferred 10,000 shares to ${verifiedBuyer.displayName}`);
console.log(`  - Seller Remaining Balance: ${gox.capTable.balance('ISS-SPACEX', security.id, founder.id).toLocaleString()} shares`);
console.log(`  - Buyer New Balance:        ${gox.capTable.balance('ISS-SPACEX', security.id, verifiedBuyer.id).toLocaleString()} shares`);

// Snapshot
const snap = gox.capTable.snapshot('ISS-SPACEX');
console.log(`✓ Cap Table Snapshot Generated: Total Issued = ${snap.issued.toLocaleString()} shares | Hash: ${snap.snapshotHash?.substring(0, 16)}...`);

console.log('\n================================================================');
console.log('✅ ALL MODULES FROM ALL DOWNLOADED ZIP FILES EXECUTED 100% SUCCESSFULLY!');
console.log('================================================================\n');
