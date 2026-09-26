import test from 'node:test';
import assert from 'node:assert/strict';
import { security, EncryptionService, SignatureService, RateLimiter } from '../src/security.js';

test('Security: AES-256-GCM encryption, decryption, and tamper detection', () => {
  const enc = new EncryptionService();
  const sensitiveKycData = {
    taxId: 'US-992-01-4412',
    bankAccountNumber: '987291029381',
    beneficialOwner: 'Institutional Fund Custody Ltd'
  };

  // 1. Encrypt sensitive record
  const encrypted = enc.encrypt(sensitiveKycData);
  assert.ok(encrypted.ciphertext);
  assert.ok(encrypted.iv);
  assert.ok(encrypted.authTag);
  assert.equal(encrypted.algorithm, 'aes-256-gcm');

  // 2. Decrypt record
  const decrypted = enc.decrypt(encrypted);
  assert.deepEqual(decrypted, sensitiveKycData);

  // 3. Tamper detection: modifying ciphertext must fail authenticated decryption
  const tampered = { ...encrypted, ciphertext: encrypted.ciphertext.slice(0, -2) + 'ff' };
  assert.throws(() => enc.decrypt(tampered), /SECURITY_ERROR/);
});

test('Security: HMAC-SHA256 callback signing and replay protection', () => {
  const sig = new SignatureService('institutional-secret');
  const payload = { settlementId: 'SETTLE-001', amountMinor: 500000 };

  // 1. Sign callback payload
  const { signature, nonce, timestamp } = sig.signPayload(payload);
  assert.ok(signature);

  // 2. First verification: valid
  const check1 = sig.verifySignature(payload, signature, nonce, timestamp);
  assert.equal(check1.valid, true);

  // 3. Replay attack attempt with same nonce: BLOCKED
  const checkReplay = sig.verifySignature(payload, signature, nonce, timestamp);
  assert.equal(checkReplay.valid, false);
  assert.equal(checkReplay.error, 'REPLAY_ATTACK_DETECTED');

  // 4. Stale timestamp (replay past 5 minutes window): BLOCKED
  const staleTime = Date.now() - 400000;
  const staleSig = sig.signPayload(payload, 'new-nonce', staleTime);
  const checkStale = sig.verifySignature(payload, staleSig.signature, staleSig.nonce, staleTime);
  assert.equal(checkStale.valid, false);
  assert.equal(checkStale.error, 'TIMESTAMP_SKEW_EXCEEDED');
});

test('Security: Token bucket rate limiter protects against abusive order velocity', () => {
  const limiter = new RateLimiter(5, 1); // Capacity 5, refill 1/sec
  const clientId = 'high-frequency-trader-01';

  // 5 allowed requests
  for (let i = 0; i < 5; i++) {
    assert.equal(limiter.check(clientId).allowed, true);
  }

  // 6th request: rejected by rate limiter
  const sixth = limiter.check(clientId);
  assert.equal(sixth.allowed, false);
  assert.equal(sixth.remaining, 0);
});
