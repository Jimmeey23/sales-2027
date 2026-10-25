import { db, audit } from '../server/db.js';
import { hashPassword, ROLE_PERMISSIONS } from '../server/lib/auth.js';

const [command, rawEmail, ...rest] = process.argv.slice(2);
const email = String(rawEmail || '').trim().toLowerCase();
const usage =
  'Usage: npm run user -- create user@example.com "Full Name" <role> "long-password" [studioId]\n' +
  '       npm run user -- password user@example.com "new-long-password"\n' +
  '       npm run user -- deactivate user@example.com\n' +
  `Roles: ${Object.keys(ROLE_PERMISSIONS).join(', ')}`;
if (!['create', 'password', 'deactivate'].includes(command) || !email) {
  console.error(usage);
  process.exit(1);
}
if (command === 'create') {
  const [name, role, newPassword, studio] = rest;
  if (!name || !role || !newPassword) { console.error(usage); process.exit(1); }
  if (!ROLE_PERMISSIONS[role]) { console.error(`Unknown role "${role}".\n${usage}`); process.exit(1); }
  if (newPassword.length < 12) { console.error('Passwords must contain at least 12 characters.'); process.exit(1); }
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) { console.error('A user with that email already exists.'); process.exit(1); }
  const userId = Number(
    db.prepare('INSERT INTO users(email,name,password_hash,role,assigned_studio_id) VALUES (?,?,?,?,?)')
      .run(email, name, hashPassword(newPassword), role, studio ? Number(studio) : null).lastInsertRowid,
  );
  audit({ userId, action: 'user_created_by_cli', entityType: 'user', entityId: userId, reason: `Created with role ${role}.` });
  console.log(`Created ${email} (${role}).`);
  process.exit(0);
}
const password = rest[0];
const user = db.prepare('SELECT id,email,role,active FROM users WHERE email=?').get(email) as any;
if (!user) { console.error('User not found.'); process.exit(1); }
if (command === 'password') {
  if (!password || password.length < 12) { console.error('Production passwords must contain at least 12 characters.'); process.exit(1); }
  const update = db.transaction(() => {
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(password), user.id);
    db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(user.id);
    audit({ userId: user.id, action: 'password_changed_by_cli', entityType: 'user', entityId: user.id, reason: 'Password rotated; all existing sessions revoked.' });
  });
  update();
  console.log(`Password updated for ${email}; existing sessions were revoked.`);
} else {
  if (user.role === 'administrator') {
    const administrators = (db.prepare("SELECT COUNT(*) count FROM users WHERE role='administrator' AND active=1").get() as any).count;
    if (administrators <= 1) { console.error('Cannot deactivate the last active administrator.'); process.exit(1); }
  }
  const update = db.transaction(() => {
    db.prepare('UPDATE users SET active=0 WHERE id=?').run(user.id);
    db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(user.id);
    audit({ userId: user.id, action: 'user_deactivated_by_cli', entityType: 'user', entityId: user.id, reason: 'Account disabled and sessions revoked.' });
  });
  update();
  console.log(`Account ${email} deactivated; existing sessions were revoked.`);
}
