import { handler } from '../gox-platform/src/server.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_DIR = path.join(__dirname, '..', 'gox-platform', 'src', 'static');

export default async function (req, res) {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  // Static assets routing fallback
  if (pathname === '/' || pathname === '/index.html') {
    const filePath = path.join(STATIC_DIR, 'index.html');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.end(fs.readFileSync(filePath, 'utf8'));
    }
  } else if (pathname === '/style.css') {
    const filePath = path.join(STATIC_DIR, 'style.css');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      return res.end(fs.readFileSync(filePath, 'utf8'));
    }
  } else if (pathname === '/app.js') {
    const filePath = path.join(STATIC_DIR, 'app.js');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      return res.end(fs.readFileSync(filePath, 'utf8'));
    }
  }

  // Delegated to GOX Platform handler
  return handler(req, res);
}
