import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('src/static/index.html', 'utf8');
const js = fs.readFileSync('src/static/app.js', 'utf8');
const css = fs.readFileSync('src/static/style.css', 'utf8');

console.log('--- 1. HTML Verification ---');
assert.ok(html.includes('id="layer-auth" style="display: flex;"'), 'Layer 1 (Auth) must be visible with display: flex by default');
assert.ok(html.includes('id="layer-pricing" style="display: none;"'), 'Layer 2 (Pricing) must be hidden with display: none by default');
assert.ok(!html.includes('bhuvanjakkula@gmail.com'), 'bhuvanjakkula@gmail.com must NOT be written in HTML');
assert.ok(!html.toLowerCase().includes('active access'), 'Active access must NOT be written in HTML');
console.log('✓ HTML correctly presents Layer 1 first and contains zero owner text or email.');

console.log('--- 2. CSS Verification ---');
assert.ok(css.includes('.gateway-layer.hidden'), '.gateway-layer.hidden must be defined');
assert.ok(css.includes('.hidden { display: none !important; }'), '.hidden must be defined with !important');
console.log('✓ CSS correctly guarantees layer positioning and hide rules.');

console.log('--- 3. JavaScript Auth & Bypass Verification ---');
assert.ok(js.includes("const OWNER_EMAIL = 'bhuvanjakkula@gmail.com';"), 'OWNER_EMAIL constant defined');
assert.ok(js.includes('bypassUser'), 'Bypass user defined');
assert.ok(js.includes('hasPaid: true'), 'Bypass user hasPaid is true');
assert.ok(js.includes('planPriceUSD: 0'), 'Bypass user planPriceUSD is 0');
assert.ok(js.includes("emailEl.textContent = 'Verified Desk'"), 'Header email replaced with Verified Desk for owner');
assert.ok(js.includes("planEl.textContent = 'ENTERPRISE'"), 'Header plan replaced with ENTERPRISE for owner');
assert.ok(!js.includes("emailEl.textContent = OWNER_EMAIL"), 'Owner email must never be set into emailEl');
console.log('✓ JavaScript logic correctly handles instant login bypass with $0 payment and generic clean labels.');

console.log('\n======================================================');
console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
console.log('======================================================');
