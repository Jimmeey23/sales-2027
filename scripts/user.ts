import { db, audit } from '../server/db.js';
import { hashPassword } from '../server/lib/auth.js';

const [command, rawEmail, password] = process.argv.slice(2);
const email = String(rawEmail || '').trim().toLowerCase();
if (!['password', 'deactivate'].includes(command) || !email) {
  console.error('Usage: npm run user -- password user@example.com "new-long-password"\n       npm run user -- deactivate user@example.com');
  process.exit(1);
}
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
