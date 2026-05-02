import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requireAuth } from './lib/auth.js';
import authRoutes from './routes/auth.js';
import supplierRoutes from './routes/suppliers.js';
import quotationRoutes from './routes/quotations.js';
import poRoutes from './routes/purchaseOrders.js';
import reportRoutes from './routes/reports.js';

const app = new Hono();
const PORT = parseInt(process.env.PORT || '3000');

// Logging
app.use('*', logger());

// CORS — allow GitHub Pages and local dev
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use('*', cors({
  origin: [FRONTEND, 'http://localhost:5173', 'https://localhost:5173'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Disposition'],
}));

// Health check (no auth)
app.get('/api/health', (c) => c.json({
  status: 'ok',
  time: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development',
}));

// Public auth routes
app.route('/api/auth', authRoutes);

// Protected routes — require JWT
app.use('/api/suppliers/*', requireAuth);
app.use('/api/quotations/*', requireAuth);
app.use('/api/pos/*', requireAuth);
app.use('/api/reports/*', requireAuth);

app.route('/api/suppliers', supplierRoutes);
app.route('/api/quotations', quotationRoutes);
app.route('/api/pos', poRoutes);
app.route('/api/reports', reportRoutes);

// 404
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('API error:', err.message, err.stack);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

// Start server
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`\n✓ PO System API running on http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`  Env:    ${process.env.NODE_ENV || 'development'}\n`);
});
