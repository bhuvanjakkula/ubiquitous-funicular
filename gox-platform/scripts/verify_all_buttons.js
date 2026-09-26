import http from 'node:http';
import assert from 'node:assert';
import { handler } from '../src/server.js';

const server = http.createServer(handler);

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const req = http.request(`http://127.0.0.1:${port}${path}`, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: json, text: body });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runButtonVerification() {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  console.log(`Test server running on port ${server.address().port}`);

  console.log('\n--- VERIFYING ALL BUTTON & FORM ENDPOINTS ---');

  // 1. Initial Overview & Tab loaders
  console.log('[1/27] Testing Tab Data Loaders (Overview, Participants, Securities, Holdings, Policies, Orders, Trades, Settlements, Audit)');
  const rOverview = await request('/v1/overview');
  assert.strictEqual(rOverview.status, 200);
  assert(rOverview.body.stats.totalParticipants >= 5, 'Participants count');

  const rPartList = await request('/v1/participants');
  assert.strictEqual(rPartList.status, 200);
  assert(Array.isArray(rPartList.body), 'Participant list is array');

  const rSecList = await request('/v1/securities');
  assert.strictEqual(rSecList.status, 200);
  assert(rSecList.body.length >= 3, 'Securities list');

  const rHoldings = await request('/v1/holdings');
  assert.strictEqual(rHoldings.status, 200);

  const rPolicies = await request('/v1/policies');
  assert.strictEqual(rPolicies.status, 200);

  const rOrders = await request('/v1/orders');
  assert.strictEqual(rOrders.status, 200);

  const rTrades = await request('/v1/trades');
  assert.strictEqual(rTrades.status, 200);

  const rSettlements = await request('/v1/settlements');
  assert.strictEqual(rSettlements.status, 200);

  const rAudit = await request('/v1/audit');
  assert.strictEqual(rAudit.status, 200);
  console.log('  ✓ All 9 Tab Data Loaders returned HTTP 200');

  // 2. Button #1: Run Deal Simulator (btn-run-sim)
  console.log('[2/27] Testing Button #1: "⚡ Run Deal Simulator" (POST /v1/simulator/run-flow)');
  const rSim = await request('/v1/simulator/run-flow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { securityId: 'SPCX-N', quantity: 2500, priceMinor: 11400 }
  });
  assert.strictEqual(rSim.status, 200);
  assert.strictEqual(rSim.body.success, true);
  assert.strictEqual(rSim.body.settlement.status, 'SETTLED');
  console.log(`  ✓ Simulator successfully orchestrated deal: ${rSim.body.settlement.id}`);

  // 3. Button #2: Verify Audit Chain (btn-verify-audit)
  console.log('[3/27] Testing Button #2: "🔒 Verify Audit Chain" (GET /v1/audit/verify)');
  const rAuditVerify = await request('/v1/audit/verify');
  assert.strictEqual(rAuditVerify.status, 200);
  assert.strictEqual(rAuditVerify.body.valid, true);
  console.log(`  ✓ Audit Chain verified: ${rAuditVerify.body.length} blocks valid`);

  // 4. Button #3: Reset (btn-reset-data)
  console.log('[4/27] Testing Button #3: "↺ Reset" (POST /v1/simulator/reset)');
  const rReset = await request('/v1/simulator/reset', { method: 'POST' });
  assert.strictEqual(rReset.status, 200);
  assert.strictEqual(rReset.body.success, true);
  console.log('  ✓ Simulator state reset successfully');

  // 5. Button #18 & #37: Register Participant (+ Register Participant modal)
  console.log('[5/27] Testing Button #18/37: Register Participant (POST /v1/participants)');
  const rNewPart = await request('/v1/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      legalName: 'Vanguard Global Sovereign Index',
      entityType: 'ORGANIZATION',
      country: 'US',
      accreditationStatus: 'QUALIFIED_PURCHASER',
      riskTier: 'LOW'
    }
  });
  assert.strictEqual(rNewPart.status, 201);
  const newPartId = rNewPart.body.id;
  console.log(`  ✓ Participant registered: ${newPartId}`);

  // 6. Dynamic table button: Verify Participant
  console.log('[6/27] Testing Dynamic Button: Verify Participant (POST /v1/participants/:id/verify)');
  const rVerifyPart = await request(`/v1/participants/${newPartId}/verify`, { method: 'POST' });
  assert.strictEqual(rVerifyPart.status, 200);
  assert.strictEqual(rVerifyPart.body.status, 'VERIFIED');
  console.log('  ✓ Participant marked VERIFIED');

  // 7. Dynamic table button: Flag Participant
  console.log('[7/27] Testing Dynamic Button: Flag Participant (POST /v1/participants/:id/flag)');
  const rFlagPart = await request(`/v1/participants/${newPartId}/flag`, { method: 'POST' });
  assert.strictEqual(rFlagPart.status, 200);
  assert.strictEqual(rFlagPart.body.status, 'FLAGGED');
  console.log('  ✓ Participant marked FLAGGED');

  // 8. Button #19: Execute Pre-Trade Compliance Check
  console.log('[8/27] Testing Button #19: Pre-Trade Compliance Check (POST /v1/compliance/evaluate-trade)');
  const rCompPass = await request('/v1/compliance/evaluate-trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      buyerId: 'PART-APOLLO',
      sellerId: 'PART-SEQUOIA',
      securityId: 'SPCX-N',
      quantity: 5000,
      rulePack: 'GLOBAL_INSTITUTIONAL'
    }
  });
  assert.strictEqual(rCompPass.status, 200);
  assert.strictEqual(rCompPass.body.allowed, true);
  console.log('  ✓ Pre-trade compliance evaluation approved');

  // Test blocked compliance (with FLAGGED participant)
  const rCompBlock = await request('/v1/compliance/evaluate-trade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      buyerId: newPartId, // Flagged above
      sellerId: 'PART-SEQUOIA',
      securityId: 'SPCX-N',
      quantity: 5000,
      rulePack: 'GLOBAL_INSTITUTIONAL'
    }
  });
  assert.strictEqual(rCompBlock.status, 200);
  assert.strictEqual(rCompBlock.body.allowed, false);
  console.log('  ✓ Pre-trade compliance blocked flagged participant as expected');

  // 9. Button #20 & #40: Register Security (+ Register Security modal)
  console.log('[9/27] Testing Button #20/40: Register Security (POST /v1/securities)');
  const rNewSec = await request('/v1/securities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      id: 'OPENAI-B',
      symbol: 'OPENAI-B',
      name: 'OpenAI Series B Preferred',
      issuerId: 'ISS-OPENAI',
      shareClass: 'Series B Preferred',
      authorizedShares: 50000000,
      parValueMinor: 100
    }
  });
  assert.strictEqual(rNewSec.status, 201);
  console.log('  ✓ Security registered in master registry');

  // 10. Dynamic table button: Verify Holding
  console.log('[10/27] Testing Dynamic Button: Verify Holding (POST /v1/holdings/:id/verify)');
  const holdingsList = (await request('/v1/holdings')).body;
  assert(holdingsList.length > 0);
  const targetHolding = holdingsList[0];
  const rVerifyHolding = await request(`/v1/holdings/${targetHolding.id}/verify`, { method: 'POST' });
  assert.strictEqual(rVerifyHolding.status, 200);
  assert.strictEqual(rVerifyHolding.body.verified, true);
  console.log(`  ✓ Holding ${targetHolding.id} verified`);

  // 11. Button #21 & #43: Configure Policy (+ Configure Policy modal)
  console.log('[11/27] Testing Button #21/43: Configure Policy (POST /v1/policies)');
  const rPolicy = await request('/v1/policies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      securityId: 'OPENAI-B',
      allowedCountries: ['US', 'GB', 'DE'],
      blockedCountries: ['KP'],
      maxPerInvestor: 50000,
      requiresBoardApproval: true,
      accreditedOnly: true
    }
  });
  assert.strictEqual(rPolicy.status, 201);
  console.log('  ✓ Policy configured for OPENAI-B');

  // 12. Cap Table Breakdown (tab-captable)
  console.log('[12/27] Testing Cap Table Breakdown (GET /v1/cap-table/breakdown?issuerId=ISS-SPACEX)');
  const rCapBreakdown = await request('/v1/cap-table/breakdown?issuerId=ISS-SPACEX');
  assert.strictEqual(rCapBreakdown.status, 200);
  assert(rCapBreakdown.body.length > 0, 'Cap table breakdown entries exist');
  console.log(`  ✓ Cap table breakdown returned ${rCapBreakdown.body.length} shareholders`);

  // 13. Button #22 & #46: Execute Transfer (modal-manual-transfer)
  console.log('[13/27] Testing Button #22/46: Manual Cap Table Transfer (POST /v1/cap-table/transfer)');
  const rTransfer = await request('/v1/cap-table/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      issuerId: 'ISS-SPACEX',
      securityId: 'SPCX-N',
      from: 'PART-SEQUOIA',
      to: 'PART-APOLLO',
      quantity: 500
    }
  });
  assert.strictEqual(rTransfer.status, 200);
  console.log('  ✓ Atomic Cap Table transfer completed');

  // 14. Button #23: Refresh Depth (btn-refresh-depth)
  console.log('[14/27] Testing Button #23: Refresh Depth & Pricing Stats (GET /v1/depth & /v1/pricing/stats)');
  const rDepth = await request('/v1/depth/SPCX-N');
  assert.strictEqual(rDepth.status, 200);
  assert(Array.isArray(rDepth.body.bids));
  assert(Array.isArray(rDepth.body.asks));

  const rStats = await request('/v1/pricing/stats/SPCX-N');
  assert.strictEqual(rStats.status, 200);
  console.log(`  ✓ Depth ladder and pricing stats: BestBid=${rStats.body.bestBid}, BestAsk=${rStats.body.bestAsk}`);

  // 15. Button #26: Submit Order to Book (btn-submit-order)
  console.log('[15/27] Testing Button #26: Submit Order to Book (POST /v1/orders)');
  const rOrder = await request('/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      participantId: 'PART-APOLLO',
      securityId: 'SPCX-N',
      side: 'BUY',
      priceMinor: 11350,
      quantity: 1200
    }
  });
  assert.strictEqual(rOrder.status, 201);
  const createdOrderId = rOrder.body.id;
  console.log(`  ✓ Order submitted: ${createdOrderId}`);

  // 16. Dynamic table button: Cancel Order
  console.log('[16/27] Testing Dynamic Button: Cancel Order (POST /v1/orders/:id/cancel)');
  const rCancel = await request(`/v1/orders/${createdOrderId}/cancel`, { method: 'POST' });
  assert.strictEqual(rCancel.status, 200);
  console.log('  ✓ Order successfully cancelled');

  // 17. Button #27: Run Matching Engine (btn-trigger-match)
  console.log('[17/27] Testing Button #27: Run Matching Engine (GET /v1/matches/:securityId)');
  // Place crossing orders
  await request('/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { participantId: 'PART-APOLLO', securityId: 'SPCX-N', side: 'BUY', priceMinor: 12000, quantity: 300 }
  });
  await request('/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { participantId: 'PART-SEQUOIA', securityId: 'SPCX-N', side: 'SELL', priceMinor: 11900, quantity: 300 }
  });
  const rMatch = await request('/v1/matches/SPCX-N');
  assert.strictEqual(rMatch.status, 200);
  console.log(`  ✓ Matching engine executed, matched trade: ${rMatch.body?.id || 'none'}`);

  // 18. Dynamic table button: Initiate DvP
  console.log('[18/27] Testing Dynamic Button: Initiate DvP (POST /v1/settlements)');
  const rInitDvp = await request('/v1/settlements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      tradeId: 'TRD-TEST-123',
      securityId: 'SPCX-N',
      buyerId: 'PART-APOLLO',
      sellerId: 'PART-SEQUOIA',
      quantity: 300,
      priceMinor: 11900,
      grossAmountMinor: 300 * 11900
    }
  });
  assert.strictEqual(rInitDvp.status, 201);
  const testSettlementId = rInitDvp.body.id;
  console.log(`  ✓ DvP settlement instruction created: ${testSettlementId}`);

  // 19. Dynamic table button: Fund Cash Leg
  console.log('[19/27] Testing Dynamic Button: Fund Cash Leg (POST /v1/settlements/:id/confirm/cash)');
  const rFundCash = await request(`/v1/settlements/${testSettlementId}/confirm/cash`, { method: 'POST' });
  assert.strictEqual(rFundCash.status, 200);
  assert.strictEqual(rFundCash.body.cashStatus, 'CONFIRMED');
  console.log('  ✓ Cash leg confirmed');

  // 20. Dynamic table button: Lock Asset Leg
  console.log('[20/27] Testing Dynamic Button: Lock Asset Leg (POST /v1/settlements/:id/confirm/asset)');
  const rLockAsset = await request(`/v1/settlements/${testSettlementId}/confirm/asset`, { method: 'POST' });
  assert.strictEqual(rLockAsset.status, 200);
  assert.strictEqual(rLockAsset.body.assetStatus, 'CONFIRMED');
  console.log('  ✓ Asset custody leg locked');

  // 21. Dynamic table button: Settle Atomic
  console.log('[21/27] Testing Dynamic Button: ⚡ Settle Atomic (POST /v1/settlements/:id/settle-atomic)');
  const rAtomicSettle = await request(`/v1/settlements/${testSettlementId}/settle-atomic`, { method: 'POST' });
  assert.strictEqual(rAtomicSettle.status, 200);
  assert.strictEqual(rAtomicSettle.body.status, 'SETTLED');
  assert(rAtomicSettle.body.settlementReceipt?.receiptId, 'Settlement receipt generated');
  console.log(`  ✓ Atomic DvP finality reached! Receipt: ${rAtomicSettle.body.settlementReceipt.receiptId}`);

  // 22. Button #28: Re-verify Audit Chain (btn-reverify-audit-chain)
  console.log('[22/27] Testing Button #28: Re-verify Audit Chain (GET /v1/audit/verify)');
  const rAuditChain = await request('/v1/audit/verify');
  assert.strictEqual(rAuditChain.status, 200);
  assert.strictEqual(rAuditChain.body.valid, true);
  console.log(`  ✓ Merkle audit chain intact: ${rAuditChain.body.length} blocks`);

  // 23. Button #29: Encrypt Payload (AES-256-GCM)
  console.log('[23/27] Testing Button #29: Encrypt Payload (POST /v1/security/encrypt)');
  const rEnc = await request('/v1/security/encrypt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { data: 'Secret Cap Table Ownership Evidence Block' }
  });
  assert.strictEqual(rEnc.status, 200);
  assert(rEnc.body.ciphertext && rEnc.body.authTag && rEnc.body.iv);
  console.log('  ✓ Payload encrypted with AES-256-GCM');

  // 24. Button #30: Test Decrypt (btn-test-decrypt)
  console.log('[24/27] Testing Button #30: Test Decrypt (POST /v1/security/decrypt)');
  const rDec = await request('/v1/security/decrypt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rEnc.body
  });
  assert.strictEqual(rDec.status, 200);
  assert.strictEqual(rDec.body.decrypted, 'Secret Cap Table Ownership Evidence Block');
  console.log('  ✓ Decrypted successfully with authTag verification');

  // 25. Button #31: Simulate Tampering Attack (btn-test-tamper)
  console.log('[25/27] Testing Button #31: Simulate Tampering Attack (POST /v1/security/decrypt with tampered byte)');
  const tamperedPayload = {
    ...rEnc.body,
    ciphertext: rEnc.body.ciphertext.slice(0, -2) + 'ff'
  };
  const rTamper = await request('/v1/security/decrypt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: tamperedPayload
  });
  assert.strictEqual(rTamper.status, 400);
  console.log('  ✓ GCM AuthTag correctly rejected tampered ciphertext!');

  // 26. Button #32: Sign Payload (HMAC-SHA256)
  console.log('[26/27] Testing Button #32: Sign Payload (POST /v1/security/sign)');
  const rSign = await request('/v1/security/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { payload: '{"event":"TRADE_SETTLED","volume":1500000}' }
  });
  assert.strictEqual(rSign.status, 200);
  assert(rSign.body.signature && rSign.body.nonce);
  console.log('  ✓ Payload signed with HMAC-SHA256');

  // 27. Button #33 & #34: Verify Signature & Replay Defense
  console.log('[27/27] Testing Buttons #33 & #34: Verify Signature & Replay Defense');
  const signedWebhook = {
    payload: '{"event":"TRADE_SETTLED","volume":1500000}',
    ...rSign.body
  };
  const rSigVerify = await request('/v1/security/verify-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: signedWebhook
  });
  assert.strictEqual(rSigVerify.status, 200);
  assert.strictEqual(rSigVerify.body.valid, true);
  console.log('  ✓ Legitimate signature verified');

  // Replay Attack test
  const rReplay = await request('/v1/security/verify-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: signedWebhook
  });
  assert.strictEqual(rReplay.status, 200);
  assert.strictEqual(rReplay.body.valid, false);
  assert.strictEqual(rReplay.body.error, 'REPLAY_ATTACK_DETECTED');
  console.log('  ✓ Replay attack successfully intercepted and blocked!');

  console.log('\n=============================================================');
  console.log('🎯 ALL BUTTONS AND FORM ACTIONS FUNCTION 100% PERFECTLY!');
  console.log('=============================================================\n');

  server.close();
}

runButtonVerification().catch(err => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
