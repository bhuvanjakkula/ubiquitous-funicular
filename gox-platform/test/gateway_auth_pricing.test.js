import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { handler } from '../src/server.js';

function mockRequest(method, path, body = null, headers = {}) {
  const stream = new Readable({
    read() {
      if (body) {
        this.push(JSON.stringify(body));
      }
      this.push(null);
    }
  });
  stream.method = method;
  stream.url = path;
  stream.headers = { host: 'localhost:3000', ...headers };
  return stream;
}

function mockResponse() {
  let statusCode = 200;
  let headers = {};
  let body = '';
  return {
    writeHead(status, hdrs) {
      statusCode = status;
      headers = hdrs;
    },
    end(chunk) {
      if (chunk) body += chunk;
    },
    get result() {
      return {
        status: statusCode,
        headers,
        data: body ? JSON.parse(body) : null
      };
    }
  };
}

test('Layer 1 Auth: Owner bhuvanjakkula@gmail.com is always accessible', async () => {
  const req = mockRequest('POST', '/v1/auth/signin', {
    email: 'bhuvanjakkula@gmail.com',
    password: 'any-password-works-for-owner'
  });
  const res = mockResponse();
  await handler(req, res);

  assert.equal(res.result.status, 200);
  assert.equal(res.result.data.success, true);
  assert.equal(res.result.data.user.email, 'bhuvanjakkula@gmail.com');
  assert.equal(res.result.data.user.isOwner, true);
  assert.equal(res.result.data.user.role, 'OWNER');
  assert.ok(res.result.data.token);
});

test('Layer 1 Auth: Sign Up with Professional Individual ($299/mo)', async () => {
  const req = mockRequest('POST', '/v1/auth/signup', {
    name: 'Sarah Connor',
    email: 'sarah@skynet-cap.com',
    mobile: '+1 555-432-1098',
    password: 'securePass123!',
    plan: 'PRO_INDIVIDUAL'
  });
  const res = mockResponse();
  await handler(req, res);

  assert.equal(res.result.status, 201);
  assert.equal(res.result.data.user.email, 'sarah@skynet-cap.com');
  assert.equal(res.result.data.user.plan, 'PRO_INDIVIDUAL');
  assert.equal(res.result.data.user.planPriceUSD, 299);
});

test('Layer 1 Auth: Sign Up with Institutional Firm ($999/mo)', async () => {
  const req = mockRequest('POST', '/v1/auth/signup', {
    name: 'Apex Securities LLC',
    email: 'desk@apexsec.com',
    mobile: '+1 212-987-6543',
    password: 'firmPassword456#',
    plan: 'FIRM'
  });
  const res = mockResponse();
  await handler(req, res);

  assert.equal(res.result.status, 201);
  assert.equal(res.result.data.user.email, 'desk@apexsec.com');
  assert.equal(res.result.data.user.plan, 'FIRM');
  assert.equal(res.result.data.user.planPriceUSD, 999);
});

test('Layer 2 Pricing Models: Subscribe to Professional Individual ($299/mo) and Firm ($999/mo)', async () => {
  // Pro Individual
  const req1 = mockRequest('POST', '/v1/billing/subscribe', {
    email: 'sarah@skynet-cap.com',
    plan: 'PRO_INDIVIDUAL'
  });
  const res1 = mockResponse();
  await handler(req1, res1);

  assert.equal(res1.result.status, 200);
  assert.equal(res1.result.data.plan, 'PRO_INDIVIDUAL');
  assert.equal(res1.result.data.planPriceUSD, 299);

  // Upgrade to Firm
  const req2 = mockRequest('POST', '/v1/billing/subscribe', {
    email: 'sarah@skynet-cap.com',
    plan: 'FIRM'
  });
  const res2 = mockResponse();
  await handler(req2, res2);

  assert.equal(res2.result.status, 200);
  assert.equal(res2.result.data.plan, 'FIRM');
  assert.equal(res2.result.data.planPriceUSD, 999);

  // Upgrade to Enterprise ($9,000/mo)
  const req3 = mockRequest('POST', '/v1/billing/subscribe', {
    email: 'sarah@skynet-cap.com',
    plan: 'ENTERPRISE'
  });
  const res3 = mockResponse();
  await handler(req3, res3);

  assert.equal(res3.result.status, 200);
  assert.equal(res3.result.data.plan, 'ENTERPRISE');
  assert.equal(res3.result.data.planPriceUSD, 9000);
});

test('Layer 1 Auth: Sign Up with Enterprise ($9,000/mo)', async () => {
  const req = mockRequest('POST', '/v1/auth/signup', {
    name: 'Sovereign Wealth Desk',
    email: 'treasury@sovereign.gov',
    mobile: '+1 202-555-0199',
    password: 'sovereignPass9000!',
    plan: 'ENTERPRISE'
  });
  const res = mockResponse();
  await handler(req, res);

  assert.equal(res.result.status, 201);
  assert.equal(res.result.data.user.email, 'treasury@sovereign.gov');
  assert.equal(res.result.data.user.plan, 'ENTERPRISE');
  assert.equal(res.result.data.user.planPriceUSD, 9000);
});

test('Layer 3 Customer Support & Enquiry: Dispatches to bjtmusic12@gmail.com', async () => {
  const req = mockRequest('POST', '/v1/support/enquiry', {
    name: 'John Doe',
    email: 'john@institutional.com',
    mobile: '+1 555-888-9999',
    subject: 'Institutional Firm Tier ($999/mo) Onboarding',
    message: 'We want to onboard 15 trader seats and connect our proprietary OMS via FIX.'
  });
  const res = mockResponse();
  await handler(req, res);

  assert.equal(res.result.status, 201);
  assert.equal(res.result.data.success, true);
  assert.equal(res.result.data.contactEmail, 'bjtmusic12@gmail.com');
  assert.ok(res.result.data.ticketId.startsWith('TKT-'));
  assert.match(res.result.data.message, /bjtmusic12@gmail\.com/);
});

test('Layer 2 Pricing: Stripe Payment Links are configured for $299, $999, and $9,000 tiers', async () => {
  const req = mockRequest('GET', '/v1/billing/plans');
  const res = mockResponse();
  await handler(req, res);

  assert.equal(res.result.status, 200);
  assert.equal(res.result.data.plans.length, 3);
  
  const pro = res.result.data.plans.find(p => p.id === 'PRO_INDIVIDUAL');
  assert.equal(pro.priceUSD, 299);
  assert.equal(pro.stripeUrl, 'https://buy.stripe.com/test_3cIaEPfJY9y53mL3022oE0f');

  const firm = res.result.data.plans.find(p => p.id === 'FIRM');
  assert.equal(firm.priceUSD, 999);
  assert.equal(firm.stripeUrl, 'https://buy.stripe.com/test_00w8wHeFU8u1cXl8km2oE0g');

  const ent = res.result.data.plans.find(p => p.id === 'ENTERPRISE');
  assert.equal(ent.priceUSD, 9000);
  assert.equal(ent.stripeUrl, 'https://buy.stripe.com/test_fZubIT7ds6lT9L9fMO2oE0h');
});
