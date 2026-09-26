import { handler } from '../gox-platform/src/server.js';

export default async function (req, res) {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // Restore original /v1/... route if rewritten by Vercel
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.headers['x-invoke-path'];
  if (matchedPath && matchedPath.startsWith('/v1')) {
    req.url = matchedPath;
  }

  try {
    return await handler(req, res);
  } catch (err) {
    res.statusCode = err.status || 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'INTERNAL_SERVER_ERROR' }));
  }
}
