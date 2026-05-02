import { Context, Next } from 'hono';
import { JWTPayload, Env } from '../types';

// Simple HMAC-SHA256 JWT implementation for Cloudflare Workers
async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + 86400 * 7 }; // 7 days
  const encodedPayload = btoa(JSON.stringify(fullPayload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const sig = await hmacSign(`${header}.${encodedPayload}`, secret);
  return `${header}.${encodedPayload}.${sig}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [header, payload, sig] = token.split('.');
    if (!header || !payload || !sig) return null;
    const expectedSig = await hmacSign(`${header}.${payload}`, secret);
    if (sig !== expectedSig) return null;
    const decoded: JWTPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'po-system-salt-2026');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// Middleware: require valid JWT
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET || 'dev-secret-change-in-prod');
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401);
  c.set('user', payload);
  await next();
}

// Middleware: require approver or admin role
export async function requireApprover(c: Context<{ Bindings: Env }>, next: Next) {
  const user = c.get('user') as JWTPayload;
  if (!user || !['approver', 'admin'].includes(user.role)) {
    return c.json({ error: 'Forbidden: approver role required' }, 403);
  }
  await next();
}
