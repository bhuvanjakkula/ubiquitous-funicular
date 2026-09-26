import test from 'node:test';
import assert from 'node:assert/strict';
import { gox } from '../src/platform.js';

test('Full Institutional 8-Component Lifecycle', () => {
  // 1. Identity & Accreditation
  const buyer = gox.identity.register({ type: 'INDIVIDUAL', country: 'IN', roles: ['INVESTOR'] });
  const seller = gox.identity.register({ type: 'INDIVIDUAL', country: 'US', roles: ['INVESTOR'] });
  gox.identity.verifyLegacy(buyer.id);
  gox.identity.verifyLegacy(seller.id);

  assert.equal(gox.identity.must(buyer.id).status, 'VERIFIED');
  assert.equal(gox.identity.must(seller.id).status, 'VERIFIED');

  // 2. Compliance Evaluation
  const evalResult = gox.compliance.evaluate({ buyerVerified: true, sellerVerified: true });
  assert.equal(evalResult.allowed, true);

  // 3. Programmable Ownership Program
  const program = gox.programmable.create({
    securityId: 'SPCX-INSTITUTIONAL',
    rules: {
      allowedCountries: ['IN', 'US'],
      maxPerInvestor: 50000,
      requireOwnershipVerified: false
    }
  });
  assert.ok(program.policyHash);

  // Evaluate programmable rules for this transfer
  const progDecision = gox.programmable.evaluate({
    securityId: 'SPCX-INSTITUTIONAL',
    buyerCountry: 'IN',
    quantity: 5000,
    complianceDecision: 'ALLOW'
  });
  assert.equal(progDecision.decision, 'ALLOW');

  // 4. Cap Table Setup & Issuance
  gox.capTable.createShareClass({
    issuerId: 'ISS-SPACEX',
    securityId: 'SPCX-INSTITUTIONAL',
    name: 'Series N Preferred',
    authorized: 1000000
  });

  gox.capTable.issue({
    issuerId: 'ISS-SPACEX',
    securityId: 'SPCX-INSTITUTIONAL',
    ownerId: seller.id,
    quantity: 20000,
    reference: 'SEED_ISSUANCE'
  });
  assert.equal(gox.capTable.balance('ISS-SPACEX', 'SPCX-INSTITUTIONAL', seller.id), 20000);

  // 5. Liquidity & Order Placement
  const sellOrder = gox.liquidity.place({
    participantId: seller.id,
    issuerId: 'ISS-SPACEX',
    securityId: 'SPCX-INSTITUTIONAL',
    side: 'SELL',
    quantity: 5000,
    priceMinor: 11400,
    autoMatch: false
  });

  const buyOrder = gox.liquidity.place({
    participantId: buyer.id,
    issuerId: 'ISS-SPACEX',
    securityId: 'SPCX-INSTITUTIONAL',
    side: 'BUY',
    quantity: 5000,
    priceMinor: 11400,
    autoMatch: false
  });
  assert.equal(buyOrder.side, 'BUY');
  assert.equal(sellOrder.side, 'SELL');

  // 6. Matching Engine
  const matchedTrades = gox.liquidity.match('SPCX-INSTITUTIONAL');
  assert.ok(matchedTrades && matchedTrades.length > 0);
  const trade = matchedTrades[0];
  assert.equal(trade.quantity, 5000);
  assert.equal(trade.priceMinor, 11400);

  // 7. Settlement (Coordinated DvP)
  const settlement = gox.settlement.create(trade.id || 'TRADE-001');
  assert.equal(settlement.status, 'PENDING');

  // Leg 1: Cash confirmation
  gox.settlement.confirm(settlement.id, 'cash');
  assert.equal(settlement.cashStatus, 'CONFIRMED');
  assert.equal(settlement.status, 'PENDING');

  // Leg 2: Asset confirmation
  gox.settlement.confirm(settlement.id, 'asset');
  assert.equal(settlement.assetStatus, 'CONFIRMED');
  assert.equal(settlement.status, 'SETTLED');

  // Transfer cap table upon DvP settlement with programmatic ownership decision
  gox.capTable.transfer({
    issuerId: 'ISS-SPACEX',
    securityId: 'SPCX-INSTITUTIONAL',
    fromOwnerId: seller.id,
    toOwnerId: buyer.id,
    quantity: 5000,
    reference: 'DVP_SETTLEMENT',
    programDecision: progDecision
  });

  assert.equal(gox.capTable.balance('ISS-SPACEX', 'SPCX-INSTITUTIONAL', seller.id), 15000);
  assert.equal(gox.capTable.balance('ISS-SPACEX', 'SPCX-INSTITUTIONAL', buyer.id), 5000);

  // 8. Audit Chain Verification
  const auditLogs = gox.audit.all();
  assert.ok(auditLogs.length > 0);
});
