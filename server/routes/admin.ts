import { db, audit } from '../db.js';
import { permission, ROLE_PERMISSIONS } from '../lib/auth.js';
import { bodyError, id } from '../http.js';
import type { Express } from 'express';

export default function registerAdminRoutes(app: Express) {
  app.get('/api/users', permission('users'), (_req, res) =>
    res.json(
      db.prepare('SELECT id,email,name,role,assigned_studio_id,active,created_at FROM users ORDER BY name').all(),
    ),
  );
  app.patch('/api/users/:id', permission('users'), (req, res) => {
    const userId = id(req.params.id),
      before = db
        .prepare('SELECT id,email,name,role,assigned_studio_id,active FROM users WHERE id=?')
        .get(userId) as any;
    if (!before) return res.status(404).json({ error: 'User not found.' });
    if (!ROLE_PERMISSIONS[req.body.role || before.role]) throw bodyError('Unknown role.');
    db.prepare('UPDATE users SET role=?,assigned_studio_id=?,active=? WHERE id=?').run(
      req.body.role || before.role,
      req.body.assignedStudioId ?? before.assigned_studio_id,
      req.body.active ?? before.active,
      userId,
    );
    const after = db.prepare('SELECT id,email,name,role,assigned_studio_id,active FROM users WHERE id=?').get(userId);
    audit({
      userId: req.user!.id,
      action: 'update_user_access',
      entityType: 'user',
      entityId: userId,
      before,
      after,
      reason: req.body.reason,
    });
    res.json(after);
  });
  app.get('/api/audit', permission('settings'), (req, res) =>
    res.json(
      db
        .prepare(
          `SELECT a.*,u.name user_name,s.name studio FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN studios s ON s.id=a.studio_id ORDER BY a.id DESC LIMIT 300`,
        )
        .all(),
    ),
  );
  app.get('/api/settings', permission('settings'), (_req, res) =>
    res.json({
      roles: ROLE_PERMISSIONS,
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      aiModel: process.env.OPENAI_API_KEY ? process.env.OPENAI_MODEL || 'gpt-4.1-mini' : null,
      database: 'SQLite with WAL, foreign keys and audited relational records',
      integrations: [
        {
          name: 'OpenAI Responses API',
          configured: Boolean(process.env.OPENAI_API_KEY),
          note: 'Server-side only; structured concepts are validated and financials recalculated.',
        },
        {
          name: 'Momence / WhatsApp / CRM publishing',
          configured: false,
          note: 'Not implemented. Internal planning and exports never claim external publication.',
        },
      ],
    }),
  );
}
