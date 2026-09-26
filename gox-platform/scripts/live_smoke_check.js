import http from 'node:http';

function check(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        resolve({ path, status: res.statusCode, length: d.length });
      });
    }).on('error', (e) => resolve({ path, error: e.message }));
  });
}

async function smoke() {
  const paths = [
    '/',
    '/style.css',
    '/app.js',
    '/health',
    '/v1/overview',
    '/v1/participants',
    '/v1/securities',
    '/v1/holdings',
    '/v1/policies',
    '/v1/orders',
    '/v1/trades',
    '/v1/settlements',
    '/v1/audit',
    '/v1/audit/verify',
    '/v1/depth/SPCX-N',
    '/v1/pricing/stats/SPCX-N',
    '/v1/cap-table/breakdown?issuerId=ISS-SPACEX'
  ];

  console.log('--- SMOKE TESTING LIVE SERVER ON PORT 3000 ---');
  for (const p of paths) {
    const res = await check(p);
    console.log(`[${res.status || 'ERR'}] ${p} (${res.length || 0} bytes)`);
  }
}

smoke();
