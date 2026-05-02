import { Hono } from 'hono';
import { query, queryOne } from '../db/client.js';
import { createJWT, hashPassword, verifyPassword } from '../lib/auth.js';

const auth = new Hono();

// POST /api/auth/login
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);

  const user = await queryOne(
    'SELECT * FROM users WHERE email = $1 AND is_active = 1',
    [email.toLowerCase()]
  );
  if (!user) return c.json({ error: 'Invalid credentials' }, 401);

  // Demo accounts accept any password (hash = 'demo')
  const isValid = user.password_hash === 'demo'
    ? true
    : verifyPassword(password, user.password_hash);

  if (!isValid) return c.json({ error: 'Invalid credentials' }, 401);

  const token = createJWT({
    sub: user.id, email: user.email, name: user.name, role: user.role,
  });

  return c.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// POST /api/auth/register
auth.post('/register', async (c) => {
  const { email, password, name, role = 'buyer' } = await c.req.json();
  if (!email || !password || !name) return c.json({ error: 'All fields required' }, 400);

  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) return c.json({ error: 'Email already registered' }, 409);

  const hash = hashPassword(password);
  const rows = await query(
    'INSERT INTO users (email, name, role, password_hash) VALUES ($1,$2,$3,$4) RETURNING id,email,name,role',
    [email.toLowerCase(), name, role, hash]
  );
  const user = rows[0];
  const token = createJWT({ sub: user.id, email: user.email, name: user.name, role: user.role });
  return c.json({ token, user }, 201);
});

// GET /api/auth/me
auth.get('/me', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ user });
});

export default auth;
