import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// ── JWT (HMAC-SHA256, pure Node.js crypto) ─────────────────────
function b64url(str) {
  return Buffer.from(str).toString('base64url');
}
function b64urlDecode(str) {
  return Buffer.from(str, 'base64url').toString('utf8');
}

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function createJWT(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + 86400 * 7 }; // 7 days
  const body = b64url(JSON.stringify(full));
  const sig = sign(`${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export function verifyJWT(token) {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const expected = sign(`${header}.${body}`);
    if (sig !== expected) return null;
    const payload = JSON.parse(b64urlDecode(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Password hashing (SHA-256 + salt) ──────────────────────────
export function hashPassword(password) {
  return crypto
    .createHash('sha256')
    .update(password + 'po-system-salt-2026')
    .digest('hex');
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// ── Middleware ──────────────────────────────────────────────────
export function requireAuth(c, next) {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const payload = verifyJWT(auth.slice(7));
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401);
  c.set('user', payload);
  return next();
}

export function requireApprover(c, next) {
  const user = c.get('user');
  if (!['approver', 'admin'].includes(user?.role)) {
    return c.json({ error: 'Forbidden: approver role required' }, 403);
  }
  return next();
}
