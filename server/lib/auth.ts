import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from '../db.js';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  administrator: [
    'read',
    'financial',
    'import',
    'target_edit',
    'target_approve',
    'offer_create',
    'offer_edit',
    'offer_approve',
    'product_edit',
    'campaign_edit',
    'campaign_approve',
    'export',
    'settings',
    'users',
    'customer_level',
  ],
  senior_management: [
    'read',
    'financial',
    'import',
    'target_edit',
    'target_approve',
    'offer_create',
    'offer_edit',
    'offer_approve',
    'product_edit',
    'campaign_edit',
    'campaign_approve',
    'export',
    'customer_level',
  ],
  sales_manager: [
    'read',
    'financial',
    'target_edit',
    'offer_create',
    'offer_edit',
    'product_edit',
    'campaign_edit',
    'export',
  ],
  studio_manager: [
    'read',
    'financial',
    'target_edit',
    'offer_create',
    'offer_edit',
    'product_edit',
    'campaign_edit',
    'export',
  ],
  sales_associate: ['read', 'offer_create', 'offer_edit'],
  read_only_analyst: ['read', 'financial', 'export'],
};
export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  assigned_studio_id: number | null;
  permissions: string[];
}
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(key, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}
const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export function createSession(res: Response, userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 86400000);
  db.prepare('INSERT INTO auth_sessions(token_hash, user_id, expires_at) VALUES (?,?,?)').run(
    tokenHash(token),
    userId,
    expires.toISOString(),
  );
  res.cookie('p57_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === 'true',
    maxAge: 7 * 86400000,
    path: '/',
  });
}
export function destroySession(req: Request, res: Response) {
  const token = req.cookies?.p57_session;
  if (token) db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(tokenHash(token));
  res.clearCookie('p57_session', { path: '/' });
}
// Login-free admin access is an explicit opt-in: anyone who can reach the URL becomes an administrator.
export const directWorkspaceEnabled = () => process.env.DIRECT_WORKSPACE === 'true';
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.p57_session;
  if (token) {
    const row = db
      .prepare(
        `SELECT u.id, u.email, u.name, u.role, u.assigned_studio_id FROM auth_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`,
      )
      .get(tokenHash(token), new Date().toISOString()) as any;
    if (row) req.user = { ...row, permissions: ROLE_PERMISSIONS[row.role] || [] };
  }
  if (!req.user && directWorkspaceEnabled()) {
    const row = db
      .prepare(
        "SELECT id,email,name,role,assigned_studio_id FROM users WHERE role='administrator' AND active=1 ORDER BY id LIMIT 1",
      )
      .get() as any;
    if (row) req.user = { ...row, permissions: ROLE_PERMISSIONS[row.role] || [] };
  }
  next();
}
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
  next();
}
export function permission(key: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!req.user.permissions.includes(key))
      return res.status(403).json({ error: `Your role does not have the ${key.replaceAll('_', ' ')} permission.` });
    next();
  };
}
export function canAccessStudio(user: AuthUser, studioId: number) {
  if (!['studio_manager', 'sales_associate'].includes(user.role)) return true;
  return user.assigned_studio_id === studioId;
}
export function requireStudioAccess(req: Request, res: Response, studioId: number) {
  if (!req.user || !canAccessStudio(req.user, studioId)) {
    res.status(403).json({ error: 'This studio is outside your assigned access scope.' });
    return false;
  }
  return true;
}
