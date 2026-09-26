import { handler } from '../../gox-platform/src/server.js';

export default async function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    const rawUrl = req.url || '/';
    const parsed = new URL(rawUrl, `http://${req.headers.host || 'localhost'}`);
    const qPath = parsed.searchParams.get('path') || parsed.searchParams.get('route') || (req.query && (req.query.path || req.query.route));
    const forwardedUri = req.headers['x-forwarded-uri'] || 
                         req.headers['x-matched-path'] || 
                         req.headers['x-invoke-path'] ||
                         req.headers['x-real-path'];

    if (qPath) {
      let cleanPath = Array.isArray(qPath) ? qPath.join('/') : qPath;
      if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
      req.url = cleanPath;
    } else if (forwardedUri && (forwardedUri.startsWith('/v1') || forwardedUri.startsWith('/health'))) {
      req.url = forwardedUri;
    } else if (req.url.startsWith('/api/v1')) {
      req.url = req.url.replace('/api/v1', '/v1');
    } else if (req.url === '/api' || req.url === '/api/' || req.url === '/') {
      req.url = '/v1/overview';
    }
  } catch (e) {}

  try {
    return await handler(req, res);
  } catch (err) {
    res.statusCode = err.status || 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'INTERNAL_SERVER_ERROR' }));
  }
}
