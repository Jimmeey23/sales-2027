import { db } from '../db.js';
import {
  verifyPassword,
  createSession,
  destroySession,
  ROLE_PERMISSIONS,
  directWorkspaceEnabled,
} from '../lib/auth.js';
import { id } from '../http.js';
import type { Express } from 'express';

export default function registerAuthRoutes(app: Express) {
  const loginAttempts = new Map<string, { count: number; resetAt: number }>();
  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body.email || '')
        .trim()
        .toLowerCase(),
      password = String(req.body.password || '');
    const attemptKey = `${req.ip}:${email}`,
      nowMs = Date.now();
    const previous = loginAttempts.get(attemptKey);
    if (previous && previous.resetAt <= nowMs) loginAttempts.delete(attemptKey);
    const current = loginAttempts.get(attemptKey);
    if (current && current.count >= 10)
      return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
    const user = db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email) as any;
    if (!user || !verifyPassword(password, user.password_hash)) {
      loginAttempts.set(attemptKey, {
        count: (current?.count || 0) + 1,
        resetAt: current?.resetAt || nowMs + 15 * 60 * 1000,
      });
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    loginAttempts.delete(attemptKey);
    createSession(res, user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        assigned_studio_id: user.assigned_studio_id,
        permissions: ROLE_PERMISSIONS[user.role],
      },
    });
  });
  app.post('/api/auth/logout', (req, res) => {
    destroySession(req, res);
    res.json({ ok: true });
  });
  app.post('/api/auth/workspace', (req, res) => {
    if (req.user && req.cookies?.p57_session) return res.json({ user: req.user });
    if (!directWorkspaceEnabled())
      return res.status(403).json({ error: 'Direct workspace access is disabled by the administrator.' });
    const user = req.user
      ? (db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(req.user.id) as any)
      : (db.prepare("SELECT * FROM users WHERE role='administrator' AND active=1 ORDER BY id LIMIT 1").get() as any);
    if (!user) return res.status(503).json({ error: 'No active administrator is available for the direct workspace.' });
    createSession(res, user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        assigned_studio_id: user.assigned_studio_id,
        permissions: ROLE_PERMISSIONS[user.role],
      },
    });
  });
  app.get('/api/auth/me', (req, res) =>
    res.json({ user: req.user || null, directWorkspace: directWorkspaceEnabled() }),
  );
}
