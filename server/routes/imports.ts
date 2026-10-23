import path from 'node:path';
import crypto from 'node:crypto';
import { stringify } from 'csv-stringify/sync';
import { db, audit } from '../db.js';
import { permission } from '../lib/auth.js';
import { inspectImport, validateImport, commitImport, IMPORT_FIELDS } from '../lib/importer.js';
import { asyncRoute, bodyError, id, upload } from '../http.js';
import type { Express } from 'express';

export default function registerImportsRoutes(app: Express) {
  app.get('/api/imports', permission('import'), (_req, res) =>
    res.json(
      db
        .prepare(
          `SELECT i.*,u.name created_by_name FROM imports i LEFT JOIN users u ON u.id=i.created_by ORDER BY i.created_at DESC`,
        )
        .all(),
    ),
  );
  app.post('/api/imports', permission('import'), upload.single('file'), (req, res) => {
    if (!req.file) throw bodyError('Choose a CSV, XLSX or XLSM file.');
    const result = db
      .prepare(`INSERT INTO imports(filename,file_path,status,created_by) VALUES (?,?, 'uploaded',?)`)
      .run(req.file.originalname, req.file.path, req.user!.id);
    res.status(201).json({ id: result.lastInsertRowid, filename: req.file.originalname, size: req.file.size });
  });
  app.get(
    '/api/imports/:id',
    permission('import'),
    asyncRoute(async (req: any, res: any) => {
      const row = db.prepare('SELECT * FROM imports WHERE id=?').get(id(req.params.id)) as any;
      if (!row) return res.status(404).json({ error: 'Import not found.' });
      if (['uploaded', 'failed'].includes(row.status) || req.query.inspect === 'true') {
        const inspection = await inspectImport(row.id, req.query.worksheet as string | undefined);
        return res.json({ ...row, inspection });
      }
      res.json({ ...row, mapping: JSON.parse(row.mapping || '{}'), summary: JSON.parse(row.summary || '{}') });
    }),
  );
  app.post('/api/imports/:id/validate', permission('import'), (req, res) => {
    const importId = id(req.params.id),
      body = req.body;
    res.status(202).json({ status: 'validating' });
    setImmediate(async () => {
      try {
        await validateImport(importId, body.category, body.mapping, body.worksheet);
      } catch (error) {
        console.error('Import validation failed', error);
      }
    });
  });
  app.post('/api/imports/:id/commit', permission('import'), (req, res) => {
    const importId = id(req.params.id),
      userId = req.user!.id,
      createStudios = Boolean(req.body.createStudios);
    const importRow = db.prepare('SELECT status FROM imports WHERE id=?').get(importId) as any;
    if (!importRow || importRow.status !== 'validated')
      return res.status(422).json({ error: 'Validate the file before importing.' });
    db.prepare(`UPDATE imports SET status='committing' WHERE id=?`).run(importId);
    res.status(202).json({ status: 'committing' });
    setImmediate(async () => {
      try {
        const result = await commitImport(importId, userId, createStudios);
        audit({ userId, action: 'commit_import', entityType: 'import', entityId: importId, after: result });
      } catch (error: any) {
        console.error('Import commit failed', error);
        db.prepare(`UPDATE imports SET status='failed',error=? WHERE id=?`).run(error.message, importId);
      }
    });
  });
  app.get('/api/imports/:id/errors.csv', permission('import'), (req, res) => {
    const rows = db
      .prepare('SELECT row_number,field,message,raw_row FROM import_errors WHERE import_id=? ORDER BY row_number')
      .all(id(req.params.id)) as any[];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="import-${req.params.id}-errors.csv"`);
    res.send(stringify(rows, { header: true }));
  });
  app.get('/api/import-fields', permission('import'), (_req, res) => res.json(IMPORT_FIELDS));
  app.post('/api/mapping-templates', permission('import'), (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) throw bodyError('Template name is required.');
    const signature = crypto
      .createHash('sha256')
      .update((req.body.headers || []).join('|'))
      .digest('hex');
    const result = db
      .prepare(
        `INSERT INTO mapping_templates(name,category,signature,mapping,created_by) VALUES (?,?,?,?,?) ON CONFLICT(name,category) DO UPDATE SET mapping=excluded.mapping,signature=excluded.signature`,
      )
      .run(name, req.body.category, signature, JSON.stringify(req.body.mapping || {}), req.user!.id);
    res.status(201).json({ id: result.lastInsertRowid, name });
  });
  app.get('/api/mapping-templates', permission('import'), (_req, res) =>
    res.json(db.prepare('SELECT * FROM mapping_templates ORDER BY name').all()),
  );
}
