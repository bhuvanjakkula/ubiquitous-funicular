import assert from 'node:assert/strict';

async function main() {
  // 1. Check HTML
  const res = await fetch('http://localhost:3000/');
  const html = await res.text();
  console.log('HTML length:', html.length);
  
  assert.ok(!html.includes('bhuvanjakkula@gmail.com'), 'HTML must not write bhuvanjakkula@gmail.com');
  assert.ok(!html.includes('OWNER ACCESS'), 'HTML must not write OWNER ACCESS');
  assert.ok(!html.includes('PLATFORM OWNER'), 'HTML must not write PLATFORM OWNER');
  assert.ok(html.includes('id="layer-auth"'), 'layer-auth exists');
  assert.ok(!html.includes('class="gateway-layer hidden" id="layer-auth"'), 'layer-auth must not be hidden by default');
  console.log('✓ HTML UI checks passed: No owner writing, Layer 1 active by default.');

  // 2. Test owner sign in seamless accessibility
  const ownerRes = await fetch('http://localhost:3000/v1/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bhuvanjakkula@gmail.com', password: 'test' })
  }).then(r => r.json());
  console.log('✓ Owner accessible test:', ownerRes.success, 'email:', ownerRes.user.email, 'planName:', ownerRes.user.planName);
  assert.equal(ownerRes.success, true);
  assert.equal(ownerRes.user.email, 'bhuvanjakkula@gmail.com');

  // 3. Test Customer Sign Up
  const custRes = await fetch('http://localhost:3000/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Michael Scott',
      email: 'michael@dunder-cap.com',
      mobile: '+1 570 555 1234',
      password: 'password999',
      plan: 'FIRM'
    })
  }).then(r => r.json());
  console.log('✓ Customer Sign Up test:', custRes.success, custRes.user.email, custRes.user.planName, '$' + custRes.user.planPriceUSD);
  assert.equal(custRes.success, true);
  assert.equal(custRes.user.planPriceUSD, 999);

  // 3b. Test Enterprise Sign Up & Subscription ($9,000/mo)
  const entRes = await fetch('http://localhost:3000/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Global Sovereign Fund',
      email: 'sovereign@globalfund.org',
      mobile: '+1 202 555 9000',
      password: 'password9000',
      plan: 'ENTERPRISE'
    })
  }).then(r => r.json());
  console.log('✓ Enterprise Sign Up test:', entRes.success, entRes.user.email, entRes.user.planName, '$' + entRes.user.planPriceUSD);
  assert.equal(entRes.success, true);
  assert.equal(entRes.user.planPriceUSD, 9000);

  // 4. Test Customer Support Enquiry to bjtmusic12@gmail.com
  const supportRes = await fetch('http://localhost:3000/v1/support/enquiry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Michael Scott',
      email: 'michael@dunder-cap.com',
      mobile: '+1 570 555 1234',
      subject: 'Firm Membership Enquiry',
      message: 'Testing support channel.'
    })
  }).then(r => r.json());
  console.log('✓ Support Enquiry test:', supportRes.success, 'ticket:', supportRes.ticketId, 'contact:', supportRes.contactEmail);
  assert.equal(supportRes.contactEmail, 'bjtmusic12@gmail.com');

  console.log('\n======================================================');
  console.log('ALL LIVE ENDPOINT & UI VALIDATIONS PASSED CLEANLY!');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
