import { Hono } from 'hono';
import { Env } from '../types';
import { createJWT, hashPassword, verifyPassword } from '../lib/auth';
import { genId } from '../lib/helpers';

const auth = new Hono<{ Bindings: Env }>();

// POST /api/auth/login
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND is_active = 1'
  ).bind(email.toLowerCase()).first<any>();

  if (!user) return c.json({ error: 'Invalid credentials' }, 401);

  // For demo accounts, allow any password; in prod, use verifyPassword
  const isValid = user.password_hash === '$2a$10$placeholder'
    ? true
    : await verifyPassword(password, user.password_hash);

  if (!isValid) return c.json({ error: 'Invalid credentials' }, 401);

  const token = await createJWT(
    { sub: user.id, email: user.email, name: user.name, role: user.role },
    c.env.JWT_SECRET || 'dev-secret-change-in-prod'
  );

  return c.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// POST /api/auth/register
auth.post('/register', async (c) => {
  const { email, password, name, role = 'buyer' } = await c.req.json();
  if (!email || !password || !name) return c.json({ error: 'All fields required' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return c.json({ error: 'Email already registered' }, 409);

  const hash = await hashPassword(password);
  const id = genId('usr');
  await c.env.DB.prepare(
    'INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, email.toLowerCase(), name, role, hash).run();

  const token = await createJWT(
    { sub: id, email: email.toLowerCase(), name, role },
    c.env.JWT_SECRET || 'dev-secret-change-in-prod'
  );
  return c.json({ token, user: { id, email, name, role } }, 201);
});

// GET /api/auth/me (requires auth middleware applied in parent)
auth.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ user });
});

export default auth;
