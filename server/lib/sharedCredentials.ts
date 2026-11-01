import fs from 'node:fs';
import path from 'node:path';
import { db, audit } from '../db.js';
import { hashPassword, verifyPassword } from './auth.js';
import {
  DEMO_PASSWORD,
  credentialReport,
  credentialTable,
  generatePassword,
  type IssuedCredential,
} from './credentialPolicy.js';

/* Accounts that still accept the published demonstration password. Every credential check
 * in the app goes through the password hash, so the only honest test is to verify the hash
 * itself rather than to trust an email list. */
export function sharedCredentialAccounts() {
  return (
    db.prepare('SELECT id,email,role,password_hash FROM users WHERE active=1 ORDER BY id').all() as Array<{
      id: number;
      email: string;
      role: string;
      password_hash: string;
    }>
  ).filter(account => verifyPassword(DEMO_PASSWORD, account.password_hash));
}

/* Replace the shared demonstration password on every account that still accepts it.
 * Anything already signed in has to sign in again: a rotation that left live sessions
 * behind would rotate the front door and leave the window open. */
export function rotateSharedCredentialAccounts(options: { reason: string }) {
  const accounts = sharedCredentialAccounts();
  if (!accounts.length) return [] as IssuedCredential[];
  const issued: IssuedCredential[] = [];
  db.transaction(() => {
    for (const account of accounts) {
      const password = generatePassword();
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(password), account.id);
      db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(account.id);
      audit({
        userId: account.id,
        action: 'password_rotated',
        entityType: 'user',
        entityId: account.id,
        reason: options.reason,
      });
      issued.push({ email: account.email, role: account.role, password });
    }
  })();
  return issued;
}

export function credentialReportPath(fileName = 'rotated-credentials.txt') {
  const databasePath = process.env.DATABASE_PATH || path.resolve('p57-data/studio.db');
  return path.join(path.dirname(databasePath), fileName);
}

/* Somewhere private: mode 600, beside the database rather than in the build output, and
   never committed (p57-data is ignored). */
export function writeCredentialReport(
  issued: IssuedCredential[],
  reason: string,
  fileName = 'rotated-credentials.txt',
) {
  const file = credentialReportPath(fileName);
  const body = credentialReport(issued, { writtenAt: new Date().toISOString(), reason });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}

/* The production boot policy.
 *
 * A database can arrive in production already seeded — copied from a demonstration
 * install, restored from a backup, or seeded by an operator following the deployment guide
 * — and then every account would accept a password the whole world can read. Refusing to
 * start protects the door but strands the operator, so instead the door is re-keyed: each
 * affected account gets its own random password, its sessions are revoked, and the new
 * credentials are written beside the database, where only the person running the server can
 * read them. The alternative — serving with a published password — is never an option. */
export function enforceSharedCredentialPolicy() {
  const affected = sharedCredentialAccounts();
  if (!affected.length) return { rotated: [] as IssuedCredential[], file: null as string | null };
  const reason = 'Shared demonstration password replaced at production startup.';
  const rotated = rotateSharedCredentialAccounts({ reason });
  const accounts = rotated.map(entry => entry.email).join(', ');
  let file: string | null = null;
  try {
    file = writeCredentialReport(
      rotated,
      `${rotated.length} active account(s) still accepted the shared demonstration password when the production server started, so each was given its own random password.`,
    );
  } catch (error) {
    // A read-only or ephemeral filesystem must not cost the operator their only way in.
    console.warn(
      'Could not write the replacement credentials to disk; they are printed below instead.',
      error instanceof Error ? error.message : error,
    );
  }
  console.warn(
    [
      '',
      '  Shared demonstration password retired.',
      `  ${rotated.length} active account(s) accepted the published demo password: ${accounts}.`,
      '  Each has been given its own random password and every existing session was revoked.',
      file
        ? `  Store the new credentials now, then delete the file: ${file}`
        : `  Replacement credentials:\n${credentialTable(rotated)}`,
      '  Move them into a secret store and rotate again with: npm run user -- password <email> "<your own password>"',
      '',
    ].join('\n'),
  );
  return { rotated, file };
}
