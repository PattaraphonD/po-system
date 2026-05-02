import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { Env } from './types';
import { requireAuth } from './lib/auth';
import { corsHeaders } from './lib/helpers';
import authRoutes from './routes/auth';
import supplierRoutes from './routes/suppliers';
import quotationRoutes from './routes/quotations';
import poRoutes from './routes/purchaseOrders';
import reportRoutes from './routes/reports';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://*.github.io', 'https://*.pages.dev', '*'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// Handle OPTIONS preflight
app.options('*', (c) => c.text('', 204));

// Health check (no auth)
app.get('/api/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

// Auth routes (no auth middleware on login/register)
app.route('/api/auth', authRoutes);

// Protected routes
app.use('/api/*', requireAuth);

app.route('/api/suppliers', supplierRoutes);
app.route('/api/quotations', quotationRoutes);
app.route('/api/pos', poRoutes);
app.route('/api/reports', reportRoutes);

// 404 fallback
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

export default app;
