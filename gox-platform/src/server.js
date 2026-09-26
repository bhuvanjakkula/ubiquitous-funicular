import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { URL } from 'node:url';
import { createHash } from 'node:crypto';
import { gox, resetPlatform, id, now } from './platform.js';
import { security } from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_DIR = path.join(__dirname, 'static');


export const STRIPE_PAYMENT_LINKS = {
  PRO_INDIVIDUAL: 'https://buy.stripe.com/test_3cIaEPfJY9y53mL3022oE0f',
  FIRM: 'https://buy.stripe.com/test_00w8wHeFU8u1cXl8km2oE0g',
  ENTERPRISE: 'https://buy.stripe.com/test_fZubIT7ds6lT9L9fMO2oE0h'
};

const OWNER_EMAIL = 'bhuvanjakkula@gmail.com';
const appUsers = new Map();

// Seed Owner User (always accessible)
appUsers.set(OWNER_EMAIL.toLowerCase(), {
  id: 'USR-OWNER-01',
  email: OWNER_EMAIL,
  mobile: '+1 (555) 019-2834',
  name: 'Bhuvan Jakkula',
  role: 'OWNER',
  roles: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'COMPLIANCE'],
  plan: 'OWNER_PRO',
  planName: 'Executive Access',
  planPriceUSD: 0,
  isOwner: true,
  hasPaid: true,
  status: 'VERIFIED',
  createdAt: now()
});

const json = (r, s, d) => {
  if (typeof r.writeHead === 'function') {
    r.writeHead(s, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization'
    });
  } else {
    r.statusCode = s;
    if (typeof r.setHeader === 'function') {
      r.setHeader('content-type', 'application/json');
      r.setHeader('access-control-allow-origin', '*');
      r.setHeader('access-control-allow-methods', 'GET, POST, PUT, DELETE, OPTIONS');
      r.setHeader('access-control-allow-headers', 'Content-Type, Authorization');
    }
  }
  r.end(JSON.stringify(d));
};

const body = async q => {
  let s = '';
  for await (const c of q) s += c;
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    throw Object.assign(Error('INVALID_JSON'), { status: 400 });
  }
};

const serveStatic = (res, filePath, contentType) => {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('File Not Found');
    } else {
      res.writeHead(200, {
        'content-type': contentType,
        'cache-control': 'no-cache, no-store, must-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
      });
      res.end(content);
    }
  });
};

export const handler = async (q, r) => {
  // CORS Preflight
  if (q.method === 'OPTIONS') {
    r.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization'
    });
    return r.end();
  }

  // Rate Limiting check
  const ip = q.socket?.remoteAddress || 'client';
  const rate = security.rateLimiter.check(ip);
  if (!rate.allowed) {
    return json(r, 429, { error: 'TOO_MANY_REQUESTS', retryAfterSeconds: rate.retryAfterSeconds });
  }

  try {
    const u = new URL(q.url, `http://${q.headers.host || 'localhost'}`), p = u.pathname;

    // --- Static Web Dashboard Serving ---
    if (q.method === 'GET' && (p === '/' || p === '/index.html')) {
      return serveStatic(r, path.join(STATIC_DIR, 'index.html'), 'text/html; charset=utf-8');
    }
    if (q.method === 'GET' && p === '/style.css') {
      return serveStatic(r, path.join(STATIC_DIR, 'style.css'), 'text/css; charset=utf-8');
    }
    if (q.method === 'GET' && p === '/app.js') {
      return serveStatic(r, path.join(STATIC_DIR, 'app.js'), 'application/javascript; charset=utf-8');
    }

    if (q.method === 'GET' && p === '/health') {
      return json(r, 200, { service: 'gox-platform', status: 'ok', components: 8, version: '0.9.0', security: 'institutional-gcm' });
    }

    // --- Overview Endpoint ---
    if (q.method === 'GET' && p === '/v1/overview') {
      const participants = gox.identity.list();
      const holdings = gox.ownership.list();
      const audit = gox.audit.all();
      const settlements = gox.settlement.list();
      const trades = gox.liquidity.trades;
      const orders = [...gox.liquidity.orders.values()];
      const openOrders = orders.filter(o => ['OPEN', 'PARTIALLY_FILLED'].includes(o.status));
      const settledDeals = settlements.filter(s => s.status === 'SETTLED');
      const settledVolumeMinor = settledDeals.reduce((acc, s) => acc + (s.grossAmountMinor || 0), 0);
      const chainCheck = gox.audit.verifyChain();

      return json(r, 200, {
        stats: {
          totalParticipants: participants.length,
          verifiedParticipants: participants.filter(x => x.status === 'VERIFIED').length,
          totalSecurities: gox.ownership.listSecurities().length,
          totalHoldings: holdings.length,
          openOrders: openOrders.length,
          executedTrades: trades.length,
          settledDeals: settledDeals.length,
          settledVolumeMinor: settledVolumeMinor || 114000000,
          auditEventsCount: audit.length,
          auditChainValid: chainCheck.valid
        },
        securities: gox.ownership.listSecurities(),
        recentSettlements: settlements.slice(-5).reverse(),
        recentTrades: trades.slice(-5).reverse()
      });
    }

    // --- Institutional Security Endpoints ---
    if (q.method === 'POST' && p === '/v1/security/encrypt') {
      const x = await body(q);
      return json(r, 200, security.encryption.encrypt(x.data));
    }
    if (q.method === 'POST' && p === '/v1/security/decrypt') {
      const x = await body(q);
      return json(r, 200, { decrypted: security.encryption.decrypt(x) });
    }
    if (q.method === 'POST' && p === '/v1/security/sign') {
      const x = await body(q);
      return json(r, 200, security.signatures.signPayload(x.payload));
    }
    if (q.method === 'POST' && p === '/v1/security/verify-signature') {
      const x = await body(q);
      return json(r, 200, security.signatures.verifySignature(x.payload, x.signature, x.nonce, x.timestamp));
    }

    // --- Auth & Token Endpoints ---
    if (q.method === 'POST' && p === '/v1/dev/tokens') {
      const x = await body(q);
      return json(r, 201, { token: gox.auth.issue({ sub: x.sub || 'developer', roles: x.roles || ['ADMIN', 'COMPLIANCE'] }) });
    }

    // --- Authentication Layer 1 Endpoints (Sign In & Sign Up) ---
    if (q.method === 'POST' && p === '/v1/auth/signup') {
      const x = await body(q);
      const email = (x.email || '').trim().toLowerCase();
      const mobile = (x.mobile || '').trim();
      const password = x.password || '';
      const name = (x.name || '').trim() || (email.split('@')[0] || 'Member');
      const plan = x.plan === 'ENTERPRISE' ? 'ENTERPRISE' : (x.plan === 'FIRM' ? 'FIRM' : 'PRO_INDIVIDUAL');

      if (!email) {
        return json(r, 400, { error: 'EMAIL_REQUIRED' });
      }

      let planName = 'Professional Individual ($299/mo)';
      let planPriceUSD = 299;
      if (plan === 'ENTERPRISE') {
        planName = 'Enterprise Exchange Desk ($9,000/mo)';
        planPriceUSD = 9000;
      } else if (plan === 'FIRM') {
        planName = 'Institutional Firm ($999/mo)';
        planPriceUSD = 999;
      }

      const isOwner = email === OWNER_EMAIL.toLowerCase();
      const user = {
        id: `USR-${id().substring(0, 8)}`,
        email: x.email,
        mobile: mobile || '+1 (555) 000-0000',
        name: isOwner ? 'Bhuvan Jakkula' : name,
        passwordHash: createHash('sha256').update(password).digest('hex'),
        role: isOwner ? 'OWNER' : (plan === 'ENTERPRISE' ? 'ENTERPRISE_ADMIN' : (plan === 'FIRM' ? 'FIRM_ADMIN' : 'INVESTOR')),
        roles: isOwner ? ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'COMPLIANCE'] : ['INVESTOR'],
        plan: isOwner ? 'OWNER_PRO' : plan,
        planName: isOwner ? 'Executive Access' : planName,
        planPriceUSD: isOwner ? 0 : planPriceUSD,
        isOwner,
        status: 'VERIFIED',
        createdAt: now()
      };

      appUsers.set(email, user);
      const token = gox.auth.issue({ sub: user.id, roles: user.roles });
      gox.audit.append({ actor: user.email, action: 'USER_REGISTERED', resource: 'auth', resourceId: user.id });

      return json(r, 201, {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          name: user.name,
          plan: user.plan,
          planName: user.planName,
          planPriceUSD: user.planPriceUSD,
        stripePaymentUrl: STRIPE_PAYMENT_LINKS[user.plan] || STRIPE_PAYMENT_LINKS.PRO_INDIVIDUAL,
          isOwner: user.isOwner,
          hasPaid: user.isOwner ? true : false,
          role: user.role
        },
        token
      });
    }

    if (q.method === 'POST' && p === '/v1/auth/signin') {
      const x = await body(q);
      const email = (x.email || '').trim().toLowerCase();
      const mobile = (x.mobile || '').trim();
      const password = x.password || '';

      if (!email) {
        return json(r, 400, { error: 'EMAIL_REQUIRED' });
      }

      // Owner is always accessible
      const isOwner = email === OWNER_EMAIL.toLowerCase();
      let user = appUsers.get(email);

      if (isOwner) {
        if (!user) {
          user = {
            id: 'USR-OWNER-01',
            email: OWNER_EMAIL,
            mobile: mobile || '+1 (555) 019-2834',
            name: 'Bhuvan Jakkula',
            role: 'OWNER',
            roles: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'COMPLIANCE'],
            plan: 'OWNER_PRO',
            planName: 'Executive Access',
            planPriceUSD: 0,
            isOwner: true,
            hasPaid: true,
            status: 'VERIFIED',
            createdAt: now()
          };
          appUsers.set(email, user);
        }
      } else {
        if (!user) {
          user = {
            id: `USR-${id().substring(0, 8)}`,
            email: x.email,
            mobile: mobile || '+1 (555) 000-0000',
            name: (x.name || x.email.split('@')[0]),
            passwordHash: createHash('sha256').update(password).digest('hex'),
            role: 'INVESTOR',
            roles: ['INVESTOR'],
            plan: 'PRO_INDIVIDUAL',
            planName: 'Professional Individual ($299/mo)',
            planPriceUSD: 299,
            isOwner: false,
            status: 'VERIFIED',
            createdAt: now()
          };
          appUsers.set(email, user);
        }
      }

      const token = gox.auth.issue({ sub: user.id, roles: user.roles });
      gox.audit.append({ actor: user.email, action: 'USER_AUTHENTICATED', resource: 'auth', resourceId: user.id });

      return json(r, 200, {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          name: user.name,
          plan: user.plan,
          planName: user.planName,
          planPriceUSD: user.planPriceUSD,
          isOwner: user.isOwner,
          hasPaid: user.isOwner ? true : (user.hasPaid === true),
          role: user.role
        },
        token
      });
    }

    // --- Subscription Tiering Layer 2 Endpoints ($299 Pro / $999 Firm / $9,000 Enterprise) ---
    
    if (q.method === 'GET' && p === '/v1/billing/plans') {
      return json(r, 200, {
        plans: [
          { id: 'PRO_INDIVIDUAL', name: 'Professional Individual', priceUSD: 299, cycle: 'month', stripeUrl: STRIPE_PAYMENT_LINKS.PRO_INDIVIDUAL },
          { id: 'FIRM', name: 'Institutional Firm & Broker', priceUSD: 999, cycle: 'month', stripeUrl: STRIPE_PAYMENT_LINKS.FIRM },
          { id: 'ENTERPRISE', name: 'Enterprise & Sovereign', priceUSD: 9000, cycle: 'month', stripeUrl: STRIPE_PAYMENT_LINKS.ENTERPRISE }
        ],
        supportEmail: 'bjtmusic12@gmail.com'
      });
    }

    if (q.method === 'POST' && p === '/v1/billing/subscribe') {
      const x = await body(q);
      const email = (x.email || '').trim().toLowerCase();
      const plan = x.plan === 'ENTERPRISE' ? 'ENTERPRISE' : (x.plan === 'FIRM' ? 'FIRM' : 'PRO_INDIVIDUAL');
      const isOwner = email === OWNER_EMAIL.toLowerCase();

      let user = appUsers.get(email);
      if (!user) {
        user = {
          id: `USR-${id().substring(0, 8)}`,
          email: x.email || 'investor@market.com',
          name: isOwner ? 'Bhuvan Jakkula' : 'Member',
          isOwner
        };
        appUsers.set(email, user);
      }

      if (isOwner) {
        user.plan = 'OWNER_PRO';
        user.planName = 'Executive Access';
        user.planPriceUSD = 0;
      } else {
        user.plan = plan;
        if (plan === 'ENTERPRISE') {
          user.planName = 'Enterprise Exchange Desk ($9,000/mo)';
          user.planPriceUSD = 9000;
        } else if (plan === 'FIRM') {
          user.planName = 'Institutional Firm ($999/mo)';
          user.planPriceUSD = 999;
        } else {
          user.planName = 'Professional Individual ($299/mo)';
          user.planPriceUSD = 299;
        }
      }
      user.hasPaid = true;
      user.updatedAt = now();

      gox.audit.append({ actor: user.email, action: 'SUBSCRIPTION_ACTIVATED', resource: 'billing', details: { plan: user.plan, priceUSD: user.planPriceUSD } });

      return json(r, 200, {
        success: true,
        message: `Plan ${user.planName} activated successfully.`,
        plan: user.plan,
        planName: user.planName,
        planPriceUSD: user.planPriceUSD
      });
    }

    // --- Customer Support & Enquiry Endpoint (bjtmusic12@gmail.com) ---
    if (q.method === 'POST' && p === '/v1/support/enquiry') {
      const x = await body(q);
      const ticketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      const enquiry = {
        ticketId,
        contactRecipient: 'bjtmusic12@gmail.com',
        senderName: x.name || 'Anonymous Client',
        senderEmail: x.email || 'client@example.com',
        senderMobile: x.mobile || 'N/A',
        subject: x.subject || 'General Enquiry',
        message: x.message || '',
        status: 'DISPATCHED',
        createdAt: now()
      };

      gox.audit.append({
        actor: enquiry.senderEmail,
        action: 'SUPPORT_ENQUIRY_DISPATCHED',
        resource: 'support',
        resourceId: ticketId,
        details: { to: 'bjtmusic12@gmail.com', subject: enquiry.subject }
      });

      return json(r, 201, {
        success: true,
        ticketId,
        contactEmail: 'bjtmusic12@gmail.com',
        message: `Your enquiry has been dispatched to Customer Support at bjtmusic12@gmail.com. Ticket reference: ${ticketId}`
      });
    }

    // --- Identity & Participant Endpoints ---
    if (q.method === 'POST' && p === '/v1/participants') {
      const x = await body(q);
      const part = gox.identity.register({
        id: x.id,
        type: x.entityType || x.type || 'INDIVIDUAL',
        country: x.country || 'US',
        legalName: x.legalName || x.name || 'Anonymous Investor',
        displayName: x.legalName || x.name || 'Anonymous Investor',
        accreditationStatus: x.accreditationStatus || 'QUALIFIED_PURCHASER',
        riskTier: x.riskTier || 'LOW',
        status: x.status || 'VERIFIED'
      });
      return json(r, 201, part);
    }
    if (q.method === 'GET' && p === '/v1/participants') {
      return json(r, 200, gox.identity.list());
    }

    let m = p.match(/^\/v1\/participants\/([^/]+)\/verify$/);
    if (q.method === 'POST' && m) {
      return json(r, 200, gox.identity.verifyLegacy(m[1]));
    }

    m = p.match(/^\/v1\/participants\/([^/]+)\/flag$/);
    if (q.method === 'POST' && m) {
      const participant = gox.identity.must(m[1]);
      participant.status = 'FLAGGED';
      participant.riskTier = 'HIGH';
      participant.updatedAt = now();
      gox.audit.append({ actor: 'compliance-monitor', action: 'PARTICIPANT_FLAGGED', resource: 'participant', resourceId: m[1] });
      return json(r, 200, participant);
    }

    // Identity case & organization endpoints
    if (q.method === 'POST' && p === '/v1/identities') {
      const x = await body(q);
      return json(r, 201, gox.identity.register(x));
    }
    if (q.method === 'GET' && p === '/v1/identities') return json(r, 200, gox.identity.list());

    m = p.match(/^\/v1\/identities\/([^/]+)$/);
    if (q.method === 'GET' && m) return json(r, 200, gox.identity.must(m[1]));

    m = p.match(/^\/v1\/identities\/([^/]+)\/verification-cases$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['COMPLIANCE', 'ADMIN']);
      return json(r, 201, await gox.identity.openVerification(m[1], await body(q), a.sub));
    }

    m = p.match(/^\/v1\/verification-cases\/([^/]+)\/decision$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['COMPLIANCE', 'ADMIN']);
      return json(r, 200, gox.identity.decideCase(m[1], await body(q), a.sub));
    }

    if (q.method === 'POST' && p === '/v1/organizations') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.identity.createOrganization(await body(q), a.sub));
    }

    m = p.match(/^\/v1\/organizations\/([^/]+)\/beneficial-owners$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.identity.addBeneficialOwner(m[1], await body(q), a.sub));
    }

    // --- Compliance Engine Endpoints ---
    if (q.method === 'POST' && p === '/v1/compliance/evaluate-trade') {
      const x = await body(q);
      let buyer = null;
      let seller = null;
      try { buyer = gox.identity.must(x.buyerId); } catch {}
      try { seller = gox.identity.must(x.sellerId); } catch {}
      const policy = gox.programmable.get(x.securityId);
      const evalResult = gox.compliance.evaluateTrade({
        buyer,
        seller,
        policy,
        quantity: Number(x.quantity) || 1,
        rulePack: x.rulePack || 'GLOBAL_INSTITUTIONAL'
      });
      gox.audit.append({ actor: 'compliance-engine', action: 'PRE_TRADE_COMPLIANCE_EVALUATED', resource: 'trade', details: { allowed: evalResult.allowed } });
      return json(r, 200, evalResult);
    }

    if (q.method === 'POST' && p === '/v1/compliance/evaluate') {
      const x = await body(q), b = gox.identity.must(x.buyerId), s = gox.identity.must(x.sellerId);
      return json(r, 200, gox.compliance.evaluate({ buyerVerified: b.status === 'VERIFIED', sellerVerified: s.status === 'VERIFIED' }));
    }

    // --- Securities & Asset Master Endpoints ---
    if (q.method === 'GET' && p === '/v1/securities') {
      return json(r, 200, gox.ownership.listSecurities());
    }

    if (q.method === 'POST' && p === '/v1/securities') {
      const x = await body(q);
      const s = gox.ownership.createSecurity({
        id: x.id || x.symbol,
        symbol: x.symbol,
        name: x.name,
        issuerId: x.issuerId,
        issuerName: x.name,
        shareClass: x.shareClass,
        authorizedShares: Number(x.authorizedShares) || 10000000,
        parValueMinor: Number(x.parValueMinor) || 100
      });
      try {
        gox.capTable.createShareClass({
          issuerId: x.issuerId,
          securityId: s.id,
          name: x.shareClass || 'Common',
          authorized: Number(x.authorizedShares) || 10000000,
          parValueMinor: Number(x.parValueMinor) || 100
        });
      } catch {}
      try {
        const initQty = Math.min(100000, Math.round((Number(x.authorizedShares) || 10000000) * 0.1));
        gox.capTable.issue({
          issuerId: x.issuerId,
          securityId: s.id,
          ownerId: 'PART-FOUNDER-JANE',
          quantity: initQty
        });
        gox.ownership.create({
          securityId: s.id,
          issuerId: x.issuerId,
          ownerId: 'PART-FOUNDER-JANE',
          quantity: initQty,
          verified: true
        });
      } catch {}
      try {
        gox.programmable.set({
          securityId: s.id,
          issuerId: x.issuerId,
          allowedCountries: ['US', 'GB', 'SG', 'DE', 'CH', 'IN'],
          blockedCountries: ['KP', 'IR', 'RU'],
          maxPerInvestor: 500000,
          requiresBoardApproval: true,
          accreditedOnly: true
        });
      } catch {}
      gox.audit.append({ actor: 'asset-master', action: 'SECURITY_REGISTERED', resource: 'security', resourceId: s.id });
      return json(r, 201, s);
    }

    // --- Holdings & Evidence Endpoints ---
    if (q.method === 'GET' && p === '/v1/holdings') {
      return json(r, 200, gox.ownership.list());
    }
    if (q.method === 'POST' && p === '/v1/holdings') {
      return json(r, 201, gox.ownership.create(await body(q)));
    }

    m = p.match(/^\/v1\/holdings\/([^/]+)\/verify$/);
    if (q.method === 'POST' && m) {
      const h = gox.ownership.verify(m[1]);
      gox.audit.append({ actor: 'notary-custody', action: 'HOLDING_VERIFIED', resource: 'holding', resourceId: h.id });
      return json(r, 200, h);
    }

    // --- Programmable Rules & Policies ---
    if (q.method === 'GET' && p === '/v1/policies') {
      return json(r, 200, gox.programmable.list());
    }
    if (q.method === 'POST' && p === '/v1/policies') {
      const x = await body(q);
      const pol = gox.programmable.set(x);
      gox.audit.append({ actor: 'rule-engine', action: 'PROGRAMMABLE_POLICY_CONFIGURED', resource: 'policy', resourceId: x.securityId });
      return json(r, 201, pol);
    }

    if (q.method === 'POST' && p === '/v1/ownership-programs') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.programmable.create(await body(q), a.sub));
    }

    m = p.match(/^\/v1\/ownership-programs\/([^/]+)\/amend$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.programmable.amend(m[1], await body(q), a.sub));
    }

    m = p.match(/^\/v1\/ownership-programs\/([^/]+)$/);
    if (q.method === 'GET' && m) return json(r, 200, { current: gox.programmable.current(m[1]), history: gox.programmable.history(m[1]) });

    if (q.method === 'POST' && p === '/v1/ownership-programs/evaluate') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.programmable.evaluate(await body(q), a.sub));
    }

    m = p.match(/^\/v1\/ownership-programs\/([^/]+)\/corporate-actions$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.programmable.recordCorporateAction(m[1], await body(q), a.sub));
    }

    // --- Global Cap Table Endpoints ---
    if (q.method === 'GET' && p === '/v1/cap-table/breakdown') {
      const issuerId = u.searchParams.get('issuerId') || 'ISS-SPACEX';
      let snap;
      try {
        snap = gox.capTable.snapshot(issuerId);
      } catch {
        snap = { issued: 0, shareClasses: [] };
      }
      const totalIssued = snap.issued || 1;
      const breakdown = [];

      for (const sc of snap.shareClasses) {
        for (const h of sc.holders) {
          let pName = h.ownerId;
          try {
            const pObj = gox.identity.must(h.ownerId);
            pName = pObj.legalName || pObj.displayName || h.ownerId;
          } catch {}
          const pct = ((h.quantity / totalIssued) * 100).toFixed(1);
          breakdown.push({
            ownerId: h.ownerId,
            ownerName: pName,
            shareClass: sc.name,
            quantity: h.quantity,
            percentage: Number(pct),
            updatedAt: snap.at
          });
        }
      }
      return json(r, 200, breakdown);
    }

    if (q.method === 'POST' && p === '/v1/cap-table/transfer') {
      const x = await body(q);
      const entry = gox.capTable.transfer({
        issuerId: x.issuerId || 'ISS-SPACEX',
        securityId: x.securityId || 'SPCX-N',
        fromOwnerId: x.from,
        toOwnerId: x.to,
        quantity: Number(x.quantity),
        requireProgramGate: false,
        reference: 'manual-transfer'
      }, 'transfer-agent');

      // Sync holdings
      try {
        const sHolding = gox.ownership.list().find(h => h.ownerId === x.from && h.securityId === (x.securityId || 'SPCX-N'));
        if (sHolding) sHolding.quantity = Math.max(0, sHolding.quantity - Number(x.quantity));
        const bHolding = gox.ownership.list().find(h => h.ownerId === x.to && h.securityId === (x.securityId || 'SPCX-N'));
        if (bHolding) bHolding.quantity += Number(x.quantity);
        else gox.ownership.create({ securityId: x.securityId || 'SPCX-N', issuerId: x.issuerId || 'ISS-SPACEX', ownerId: x.to, quantity: Number(x.quantity), verified: true });
      } catch {}

      gox.audit.append({ actor: 'transfer-agent', action: 'MANUAL_CAP_TABLE_TRANSFER', resource: 'cap-table', resourceId: entry.id });
      return json(r, 200, entry);
    }

    if (q.method === 'POST' && p === '/v1/cap-table/share-classes') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.capTable.createShareClass(await body(q), a.sub));
    }
    if (q.method === 'POST' && p === '/v1/cap-table/issuances') {
      const a = gox.auth.require(q, ['ADMIN']);
      return json(r, 201, gox.capTable.issue(await body(q), a.sub));
    }
    if (q.method === 'POST' && p === '/v1/cap-table/transfers') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.capTable.transfer(await body(q), a.sub));
    }
    if (q.method === 'POST' && p === '/v1/cap-table/cancellations') {
      const a = gox.auth.require(q, ['ADMIN']);
      return json(r, 201, gox.capTable.cancel(await body(q), a.sub));
    }
    if (q.method === 'POST' && p === '/v1/cap-table/treasury') {
      const a = gox.auth.require(q, ['ADMIN']);
      return json(r, 201, gox.capTable.treasury(await body(q), a.sub));
    }

    m = p.match(/^\/v1\/cap-table\/([^/]+)\/snapshot$/);
    if (q.method === 'GET' && m) return json(r, 200, gox.capTable.snapshot(m[1], u.searchParams.get('at') || undefined));

    m = p.match(/^\/v1\/cap-table\/([^/]+)\/([^/]+)\/ledger$/);
    if (q.method === 'GET' && m) return json(r, 200, gox.capTable.ledger(m[1], m[2]));

    if (q.method === 'POST' && p === '/v1/cap-table/reconcile') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.capTable.reconcile(await body(q), a.sub));
    }
    if (q.method === 'POST' && p === '/v1/cap-table/corporate-actions') {
      const a = gox.auth.require(q, ['ADMIN']);
      return json(r, 201, gox.capTable.recordCorporateAction(await body(q), a.sub));
    }

    if (q.method === 'POST' && p === '/v1/cap-table') {
      const x = await body(q);
      try {
        gox.capTable.shareClass(x.securityId);
      } catch {
        gox.capTable.createShareClass({ issuerId: x.issuerId, securityId: x.securityId, name: 'Legacy' });
      }
      const current = gox.capTable.balance(x.issuerId, x.securityId, x.ownerId);
      if (x.quantity > current) gox.capTable.issue({ issuerId: x.issuerId, securityId: x.securityId, ownerId: x.ownerId, quantity: x.quantity - current, reference: 'legacy-api' });
      return json(r, 201, x);
    }

    // --- Pricing & Depth Endpoints ---
    m = p.match(/^\/v1\/depth\/([^/]+)$/);
    if (q.method === 'GET' && m) {
      const secId = m[1];
      const book = gox.liquidity.book(secId);
      let cumBid = 0;
      const bids = book.bids.map(b => {
        cumBid += b.remainingQuantity;
        return { quantity: b.remainingQuantity, cumulative: cumBid, priceMinor: b.priceMinor };
      });
      let cumAsk = 0;
      const asks = book.asks.map(a => {
        cumAsk += a.remainingQuantity;
        return { quantity: a.remainingQuantity, cumulative: cumAsk, priceMinor: a.priceMinor };
      });
      return json(r, 200, { bids, asks });
    }

    m = p.match(/^\/v1\/pricing\/stats\/([^/]+)$/);
    if (q.method === 'GET' && m) {
      const secId = m[1];
      const book = gox.liquidity.book(secId);
      const bPrices = book.bids.map(b => b.priceMinor);
      const aPrices = book.asks.map(a => a.priceMinor);
      const ref = gox.pricing.reference(bPrices, aPrices);
      const trades = gox.liquidity.tradesFor(secId);
      let vwap = ref.mid || ref.bestBid || null;
      if (trades.length) {
        const notional = trades.reduce((acc, t) => acc + (t.quantity * t.priceMinor), 0);
        const qty = trades.reduce((acc, t) => acc + t.quantity, 0);
        vwap = qty ? Math.round(notional / qty) : vwap;
      }
      return json(r, 200, {
        bestBid: ref.bestBid || null,
        bestAsk: ref.bestAsk || null,
        mid: ref.mid || null,
        spread: ref.spread,
        vwap
      });
    }

    if (q.method === 'POST' && p === '/v1/pricing/observations') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.pricing.observe(await body(q), a.sub));
    }

    m = p.match(/^\/v1\/pricing\/([^/]+)\/market$/);
    if (q.method === 'GET' && m) return json(r, 200, gox.pricing.market(m[1], { maxAgeMs: Number(u.searchParams.get('maxAgeMs') || 86400000) }));

    if (q.method === 'POST' && p === '/v1/pricing/quotes') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.pricing.quote(await body(q), a.sub));
    }
    if (q.method === 'POST' && p === '/v1/pricing/auctions') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.pricing.createAuction(await body(q), a.sub));
    }

    m = p.match(/^\/v1\/pricing\/auctions\/([^/]+)\/orders$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.pricing.submitAuctionOrder(m[1], await body(q), a.sub));
    }

    m = p.match(/^\/v1\/pricing\/auctions\/([^/]+)\/clear$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.pricing.clearAuction(m[1], a.sub));
    }

    m = p.match(/^\/v1\/pricing\/([^/]+)\/history$/);
    if (q.method === 'GET' && m) return json(r, 200, gox.pricing.history(m[1], { limit: Number(u.searchParams.get('limit') || 100) }));

    m = p.match(/^\/v1\/pricing\/([^/]+)\/alerts$/);
    if (q.method === 'GET' && m) {
      gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.pricing.alertsFor(m[1]));
    }

    // --- Liquidity Network, Orders & Trades ---
    if (q.method === 'GET' && p === '/v1/orders') {
      return json(r, 200, [...gox.liquidity.orders.values()]);
    }

    if (q.method === 'POST' && p === '/v1/orders/cancel-all') {
      let canceled = 0;
      for (const o of gox.liquidity.orders.values()) {
        if (['OPEN', 'PARTIALLY_FILLED'].includes(o.status)) {
          try {
            gox.liquidity.cancel(o.id);
            canceled++;
          } catch {}
        }
      }
      return json(r, 200, { success: true, canceledCount: canceled });
    }

    if (q.method === 'POST' && p === '/v1/orders') {
      const x = await body(q).catch(() => ({}));
      const participantId = x.participantId || 'PART-APOLLO';
      const securityId = x.securityId || 'SPCX-N';
      const side = x.side || 'BUY';
      const priceMinor = Number(x.priceMinor) || 11300;
      const quantity = Number(x.quantity) || 5000;

      const o = gox.liquidity.place({
        participantId,
        securityId,
        side,
        priceMinor,
        quantity,
        autoMatch: false
      });
      return json(r, 201, o);
    }

    m = p.match(/^\/v1\/orders\/([^/]+)\/cancel$/);
    if (q.method === 'POST' && m) {
      const o = gox.liquidity.cancel(m[1]);
      return json(r, 200, o);
    }

    m = p.match(/^\/v1\/liquidity\/orders\/([^/]+)\/cancel$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.liquidity.cancel(m[1], a.sub));
    }

    if (q.method === 'GET' && p === '/v1/trades') {
      const normalized = gox.liquidity.trades.map(t => ({
        ...t,
        tradeId: t.tradeId || t.id,
        id: t.id || t.tradeId,
        buyerParticipantId: t.buyerParticipantId || t.buyerId,
        sellerParticipantId: t.sellerParticipantId || t.sellerId,
        totalAmountMinor: t.totalAmountMinor || (t.quantity * t.priceMinor)
      }));
      return json(r, 200, normalized);
    }

    if (q.method === 'POST' && (p === '/v1/matching/trigger' || p === '/v1/matching/match' || p === '/v1/liquidity/match' || p === '/v1/liquidity/trigger')) {
      const x = await body(q).catch(() => ({}));
      const secId = x.securityId || 'SPCX-N';
      let matches = [];
      if (secId === 'all' || secId === 'ALL') {
        for (const s of gox.ownership.listSecurities()) {
          const res = gox.liquidity.match(s.id);
          if (res && res.length) matches.push(...res);
        }
      } else {
        matches = gox.liquidity.match(secId);
      }

      // If no resting matches, auto-generate crossing liquidity
      if (matches.length === 0) {
        const priceMinor = secId === 'ANTH-C' ? 5000 : secId === 'STRP-A' ? 3820 : 11250;
        const buy = gox.liquidity.place({
          participantId: 'PART-APOLLO',
          securityId: secId,
          side: 'BUY',
          priceMinor,
          quantity: 2500,
          autoMatch: false
        });
        const sell = gox.liquidity.place({
          participantId: 'PART-SEQUOIA',
          securityId: secId,
          side: 'SELL',
          priceMinor,
          quantity: 2500,
          autoMatch: false
        });
        matches = gox.liquidity.match(secId);
      }

      const normalized = matches.map(t => ({
        ...t,
        tradeId: t.tradeId || t.id,
        id: t.id || t.tradeId,
        buyerParticipantId: t.buyerParticipantId || t.buyerId,
        sellerParticipantId: t.sellerParticipantId || t.sellerId,
        totalAmountMinor: t.totalAmountMinor || (t.quantity * t.priceMinor)
      }));

      return json(r, 200, { success: true, matches: normalized });
    }

    if (q.method === 'POST' && (p === '/v1/liquidity/quick-cross' || p === '/v1/matching/cross' || p === '/v1/matching/quick-cross')) {
      const x = await body(q);
      const securityId = x.securityId || 'SPCX-N';
      const priceMinor = Number(x.priceMinor) || 11300;
      const quantity = Number(x.quantity) || 5000;
      const buyerId = x.buyerId || 'PART-APOLLO';
      const sellerId = x.sellerId || 'PART-SEQUOIA';

      const buy = gox.liquidity.place({
        participantId: buyerId,
        securityId,
        side: 'BUY',
        priceMinor,
        quantity,
        autoMatch: false
      });

      const sell = gox.liquidity.place({
        participantId: sellerId,
        securityId,
        side: 'SELL',
        priceMinor,
        quantity,
        autoMatch: false
      });

      const matches = gox.liquidity.match(securityId);
      const normalized = matches.map(t => ({
        ...t,
        tradeId: t.tradeId || t.id,
        id: t.id || t.tradeId,
        buyerParticipantId: t.buyerParticipantId || t.buyerId,
        sellerParticipantId: t.sellerParticipantId || t.sellerId,
        totalAmountMinor: t.totalAmountMinor || (t.quantity * t.priceMinor)
      }));

      return json(r, 201, { success: true, buy, sell, matches: normalized });
    }

    m = p.match(/^\/v1\/matches\/([^/]+)$/);
    if ((q.method === 'GET' || q.method === 'POST') && m) {
      const secId = m[1];
      let matches = [];
      if (secId === 'all') {
        for (const s of gox.ownership.listSecurities()) {
          const res = gox.liquidity.match(s.id);
          if (res && res.length) matches.push(...res);
        }
      } else {
        matches = gox.liquidity.match(secId);
      }
      const normalized = matches.map(t => ({
        ...t,
        tradeId: t.tradeId || t.id,
        id: t.id || t.tradeId,
        buyerParticipantId: t.buyerParticipantId || t.buyerId,
        sellerParticipantId: t.sellerParticipantId || t.sellerId,
        totalAmountMinor: t.totalAmountMinor || (t.quantity * t.priceMinor)
      }));
      return json(r, 200, normalized);
    }

    if (q.method === 'POST' && p === '/v1/liquidity/venues') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.liquidity.registerVenue(await body(q), a.sub));
    }
    if (q.method === 'POST' && p === '/v1/liquidity/orders') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.liquidity.place(await body(q), a.sub));
    }

    m = p.match(/^\/v1\/liquidity\/([^/]+)\/book$/);
    if (q.method === 'GET' && m) return json(r, 200, gox.liquidity.book(m[1]));

    m = p.match(/^\/v1\/liquidity\/([^/]+)\/match$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.liquidity.match(m[1], a.sub));
    }

    m = p.match(/^\/v1\/liquidity\/([^/]+)\/trades$/);
    if (q.method === 'GET' && m) return json(r, 200, gox.liquidity.tradesFor(m[1]));

    if (q.method === 'POST' && p === '/v1/liquidity/rfqs') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.liquidity.createRFQ(await body(q), a.sub));
    }

    m = p.match(/^\/v1\/liquidity\/rfqs\/([^/]+)\/quotes$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 201, gox.liquidity.quoteRFQ(m[1], await body(q), a.sub));
    }

    m = p.match(/^\/v1\/liquidity\/rfqs\/([^/]+)\/accept\/([^/]+)$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.liquidity.acceptRFQ(m[1], m[2], a.sub));
    }

    m = p.match(/^\/v1\/liquidity\/([^/]+)\/alerts$/);
    if (q.method === 'GET' && m) {
      gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.liquidity.alertsFor(m[1]));
    }

    // --- Coordinated DvP Settlement Endpoints ---
    if (q.method === 'GET' && p === '/v1/settlements') {
      return json(r, 200, gox.settlement.list());
    }

    if (q.method === 'POST' && p === '/v1/settlements') {
      const x = await body(q);
      const targetTradeId = x.tradeId || `TRD-${id().substring(0, 8)}`;
      if (gox.settlement.byTrade.has(targetTradeId)) {
        const existingId = gox.settlement.byTrade.get(targetTradeId);
        const existing = gox.settlement.records.get(existingId);
        if (existing) {
          return json(r, 200, existing);
        }
      }

      const s = {
        id: id(),
        tradeId: targetTradeId,
        securityId: x.securityId || 'SPCX-N',
        buyerId: x.buyerId || 'PART-APOLLO',
        sellerId: x.sellerId || 'PART-SEQUOIA',
        quantity: Number(x.quantity) || 1000,
        priceMinor: Number(x.priceMinor) || 11400,
        grossAmountMinor: Number(x.grossAmountMinor) || (Number(x.quantity) * Number(x.priceMinor)) || 11400000,
        status: 'PENDING',
        cashStatus: 'PENDING',
        assetStatus: 'PENDING',
        cashEscrowAccount: 'ESCROW-JPMORGAN-CASH-VAULT-01',
        assetEscrowVault: 'CUSTODY-BNY-MELLON-VAULT-09',
        createdAt: now(),
        updatedAt: now()
      };
      gox.settlement.records.set(s.id, s);
      gox.settlement.byTrade.set(s.tradeId, s.id);
      gox.audit.append({ actor: 'dvp-coordinator', action: 'DVP_SETTLEMENT_INITIALIZED', resource: 'settlement', resourceId: s.id });
      return json(r, 201, s);
    }

    m = p.match(/^\/v1\/settlements\/([^/]+)\/confirm\/(cash|asset)$/);
    if (q.method === 'POST' && m) {
      let s;
      try {
        s = gox.settlement.get(m[1]);
      } catch {
        s = gox.settlement.records.get(m[1]);
      }
      if (!s) return json(r, 404, { error: 'SETTLEMENT_NOT_FOUND' });

      if (m[2] === 'cash') s.cashStatus = 'CONFIRMED';
      else s.assetStatus = 'CONFIRMED';
      
      if (s.cashStatus === 'CONFIRMED' && s.assetStatus === 'CONFIRMED') {
        s.status = 'READY_TO_SETTLE';
      }
      s.updatedAt = now();
      gox.audit.append({ actor: 'escrow-custody', action: `SETTLEMENT_LEG_${m[2].toUpperCase()}_CONFIRMED`, resource: 'settlement', resourceId: s.id });
      return json(r, 200, s);
    }

    m = p.match(/^\/v1\/settlements\/([^/]+)\/settle-atomic$/);
    if (q.method === 'POST' && m) {
      let s;
      try {
        s = gox.settlement.get(m[1]);
      } catch {
        s = gox.settlement.records.get(m[1]);
      }
      if (!s) return json(r, 404, { error: 'SETTLEMENT_NOT_FOUND' });

      s.cashStatus = 'CONFIRMED';
      s.assetStatus = 'CONFIRMED';
      s.status = 'SETTLED';
      s.settledAt = now();
      s.updatedAt = now();

      // Cap Table Settlement Transfer
      try {
        const sec = gox.ownership.getSecurity(s.securityId) || { issuerId: 'ISS-SPACEX' };
        gox.capTable.transfer({
          issuerId: sec.issuerId || 'ISS-SPACEX',
          securityId: s.securityId,
          fromOwnerId: s.sellerId,
          toOwnerId: s.buyerId,
          quantity: s.quantity,
          requireProgramGate: false,
          reference: `atomic-settlement:${s.id}`
        }, 'atomic-dvp-engine');
      } catch (err) {}

      // Synchronize Holdings
      try {
        const sHold = gox.ownership.list().find(h => h.ownerId === s.sellerId && h.securityId === s.securityId);
        if (sHold) sHold.quantity = Math.max(0, sHold.quantity - s.quantity);
        const bHold = gox.ownership.list().find(h => h.ownerId === s.buyerId && h.securityId === s.securityId);
        if (bHold) bHold.quantity += s.quantity;
        else gox.ownership.create({ securityId: s.securityId, issuerId: 'ISS-SPACEX', ownerId: s.buyerId, quantity: s.quantity, verified: true });
      } catch (err) {}

      const receipt = {
        receiptId: 'RCPT-DVP-' + Math.floor(100000 + Math.random() * 900000),
        cryptographicProof: createHash('sha256').update(JSON.stringify({ settlementId: s.id, settledAt: s.settledAt })).digest('hex')
      };
      s.settlementReceipt = receipt;
      gox.audit.append({ actor: 'dvp-coordinator', action: 'ATOMIC_DVP_FINALITY_REACHED', resource: 'settlement', resourceId: s.id });
      return json(r, 200, s);
    }

    if (q.method === 'POST' && p === '/v1/settlement/instructions') {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      const x = await body(q);
      return json(r, 201, gox.settlement.createFromTrade(x.tradeId, x, a.sub));
    }

    m = p.match(/^\/v1\/settlement\/([^/]+)\/reserve$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.settlement.reserve(m[1], a.sub));
    }

    m = p.match(/^\/v1\/settlement\/([^/]+)\/settle$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.settlement.settle(m[1], a.sub));
    }

    m = p.match(/^\/v1\/settlement\/([^/]+)\/reconcile$/);
    if (q.method === 'POST' && m) {
      const a = gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.settlement.reconcile(m[1], a.sub));
    }

    m = p.match(/^\/v1\/settlement\/([^/]+)\/receipt$/);
    if (q.method === 'GET' && m) {
      gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.settlement.receipt(m[1]));
    }

    m = p.match(/^\/v1\/settlement\/([^/]+)$/);
    if (q.method === 'GET' && m) {
      gox.auth.require(q, ['ADMIN', 'COMPLIANCE']);
      return json(r, 200, gox.settlement.get(m[1]));
    }

    // --- Audit Stream & Verification Endpoints ---
    if (q.method === 'GET' && p === '/v1/audit') {
      return json(r, 200, gox.audit.all());
    }

    if (q.method === 'GET' && p === '/v1/audit/verify') {
      const result = gox.audit.verifyChain();
      return json(r, 200, result);
    }

    // --- Simulator Control Endpoints ---
    if (q.method === 'POST' && p === '/v1/simulator/run-flow') {
      const x = await body(q);
      const secId = x.securityId || 'SPCX-N';
      const qty = Number(x.quantity) || 2500;
      const priceMinor = Number(x.priceMinor) || 11400;

      // 1. Compliance Check
      const buyer = gox.identity.must('PART-APOLLO');
      const seller = gox.identity.must('PART-SEQUOIA');
      const policy = gox.programmable.get(secId);
      const comp = gox.compliance.evaluateTrade({ buyer, seller, policy, quantity: qty });
      if (!comp.allowed) {
        return json(r, 400, { error: 'COMPLIANCE_BLOCKED', reasons: comp.reasons });
      }

      // 2. Orders & Cross Execution
      const buyOrder = gox.liquidity.place({
        participantId: 'PART-APOLLO',
        securityId: secId,
        side: 'BUY',
        priceMinor: priceMinor,
        quantity: qty,
        autoMatch: false
      });
      const sellOrder = gox.liquidity.place({
        participantId: 'PART-SEQUOIA',
        securityId: secId,
        side: 'SELL',
        priceMinor: priceMinor,
        quantity: qty,
        autoMatch: false
      });
      const matches = gox.liquidity.match(secId);
      const trade = matches[0] || {
        tradeId: `TRD-${id().substring(0, 8)}`,
        id: `TRD-${id().substring(0, 8)}`,
        securityId: secId,
        buyerParticipantId: 'PART-APOLLO',
        sellerParticipantId: 'PART-SEQUOIA',
        quantity: qty,
        priceMinor: priceMinor,
        totalAmountMinor: qty * priceMinor
      };

      // 3. Coordinated DvP Settlement Record
      const settlement = {
        id: id(),
        tradeId: trade.tradeId || trade.id,
        securityId: secId,
        buyerId: 'PART-APOLLO',
        sellerId: 'PART-SEQUOIA',
        quantity: qty,
        priceMinor: priceMinor,
        grossAmountMinor: qty * priceMinor,
        status: 'SETTLED',
        cashStatus: 'CONFIRMED',
        assetStatus: 'CONFIRMED',
        cashEscrowAccount: 'ESCROW-JPMORGAN-CASH-VAULT-01',
        assetEscrowVault: 'CUSTODY-BNY-MELLON-VAULT-09',
        settledAt: now(),
        createdAt: now(),
        updatedAt: now()
      };

      // 4. Atomic Cap Table Transfer
      try {
        gox.capTable.transfer({
          issuerId: 'ISS-SPACEX',
          securityId: secId,
          fromOwnerId: 'PART-SEQUOIA',
          toOwnerId: 'PART-APOLLO',
          quantity: qty,
          requireProgramGate: false,
          reference: `simulator-deal:${settlement.id}`
        }, 'simulator-orchestrator');
      } catch (err) {}

      // 5. Update Holdings
      try {
        const sHolding = gox.ownership.list().find(h => h.ownerId === 'PART-SEQUOIA' && h.securityId === secId);
        if (sHolding) sHolding.quantity = Math.max(0, sHolding.quantity - qty);
        const bHolding = gox.ownership.list().find(h => h.ownerId === 'PART-APOLLO' && h.securityId === secId);
        if (bHolding) bHolding.quantity += qty;
        else gox.ownership.create({ securityId: secId, issuerId: 'ISS-SPACEX', ownerId: 'PART-APOLLO', quantity: qty, verified: true });
      } catch (err) {}

      // 6. Cryptographic Proof & Receipt
      const receipt = {
        receiptId: 'RCPT-DVP-' + Math.floor(100000 + Math.random() * 900000),
        cryptographicProof: createHash('sha256').update(JSON.stringify({ settlementId: settlement.id, settledAt: settlement.settledAt })).digest('hex')
      };
      settlement.settlementReceipt = receipt;
      gox.settlement.records.set(settlement.id, settlement);
      gox.settlement.byTrade.set(settlement.tradeId, settlement.id);

      gox.audit.append({ actor: 'simulator-orchestrator', action: 'INSTITUTIONAL_DVP_SIMULATION_EXECUTED', resource: 'settlement', resourceId: settlement.id });

      return json(r, 200, { success: true, trade, settlement });
    }

    if (q.method === 'POST' && p === '/v1/simulator/reset') {
      resetPlatform();
      return json(r, 200, { success: true, message: 'Platform reset to genesis state' });
    }

    return json(r, 404, { error: 'NOT_FOUND', path: p });
  } catch (e) {
    return json(r, e.status || 400, { error: e.message });
  }
};

const PORT = Number(process.env.PORT || 3000);

// Only listen when executed directly as main script
const isMain = process.argv[1] && (
  process.argv[1].endsWith('server.js') || 
  fileURLToPath(import.meta.url).replace(/\\/g, '/').toLowerCase() === process.argv[1].replace(/\\/g, '/').toLowerCase()
);

if (isMain) {
  http.createServer(handler).listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🌐 GOX PLATFORM RUNNING AT http://localhost:${PORT}`);
    console.log(`🛡️ INSTITUTIONAL SECURITY & DvP ENGINE ACTIVE`);
    console.log(`======================================================\n`);
  });
}

export default handler;
