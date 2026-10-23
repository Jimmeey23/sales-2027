import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { canAccessStudio } from './lib/auth.js';

// Shared request helpers for the route modules in server/routes.
// Vercel can only write to /tmp; locally uploads stay under p57-data.
const uploadDir = process.env.UPLOAD_DIR || (process.env.VERCEL ? '/tmp/uploads' : path.resolve('p57-data/uploads'));
fs.mkdirSync(uploadDir, { recursive: true });
export const asyncRoute = (handler: any) => (req: any, res: any, next: any) =>
  Promise.resolve(handler(req, res, next)).catch(next);
export const bodyError = (message: string, status = 400) => Object.assign(new Error(message), { status });
export const id = (value: unknown) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw bodyError('Invalid record identifier.');
  return n;
};
export const studioFilter = (req: any, requested?: number) => {
  if (requested && !canAccessStudio(req.user, requested))
    throw bodyError('This studio is outside your access scope.', 403);
  if (['studio_manager', 'sales_associate'].includes(req.user.role)) return req.user.assigned_studio_id;
  return requested;
};
export const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) =>
      cb(
        null,
        `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 60 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/\.(csv|xlsx|xlsm)$/i.test(file.originalname))
      cb(new Error('Supported formats: CSV, XLSX and XLSM. Convert legacy XLS files to XLSX first.'));
    else cb(null, true);
  },
});
