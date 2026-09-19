import express from 'express';
import cors from 'cors';
import next from 'next';
import dotenv from 'dotenv';
import { parse } from 'url';

// Load environment variables
dotenv.config();

const port = parseInt(process.env.PORT || '8080', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev, dir: '.' });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Enable CORS for frontend
  server.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  }));

  // Health check endpoint
  server.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Borderbooks API is running' });
  });

  // Let Next.js handle all API routes natively inside the Express server!
  // This automatically runs the App Router /api handlers with NextRequest/NextResponse and Clerk.
  server.all('*', (req, res) => {
    const parsedUrl = parse(req.url, true);
    return handle(req, res, parsedUrl);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
}).catch((err) => {
  console.error('Error starting Next.js custom server:', err);
  process.exit(1);
});
