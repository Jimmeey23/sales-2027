import crypto from 'node:crypto';

/* The password every seeded demonstration account starts with.
 *
 * It is published — it appears in the documentation, in the seed output and in the smoke
 * tests — so it is not a credential at all in a deployment anyone else can reach. The
 * server therefore refuses to serve in production while any active account still accepts
 * it, and the seed never writes it to a production database. Everything in this module is
 * pure so the policy can be tested without a database. */

export const DEMO_PASSWORD = 'P57demo!';
export const MIN_PASSWORD_LENGTH = 12;

export type SeededAccount = {
  email: string;
  name: string;
  role: string;
  /** Studio the account is scoped to, by canonical name; administrators and analysts are not scoped. */
  studio: string | null;
};

/** The demonstration cast: one account per role, so every permission path can be exercised. */
export const SEEDED_ACCOUNTS: SeededAccount[] = [
  { email: 'admin@p57.demo', name: 'Jimmeey Gondaa', role: 'administrator', studio: null },
  { email: 'management@p57.demo', name: 'Rohan Kapoor', role: 'senior_management', studio: null },
  { email: 'sales@p57.demo', name: 'Meera Shah', role: 'sales_manager', studio: null },
  { email: 'studio@p57.demo', name: 'Kemps Studio Manager', role: 'studio_manager', studio: 'Kemps Corner' },
  { email: 'associate@p57.demo', name: 'Sales Associate', role: 'sales_associate', studio: 'Kemps Corner' },
  { email: 'analyst@p57.demo', name: 'Read-only Analyst', role: 'read_only_analyst', studio: null },
];

/** A password nobody has seen before: 18 random bytes, which is 24 URL-safe characters. */
export function generatePassword() {
  return crypto.randomBytes(18).toString('base64url');
}

export type SeedCredential = SeededAccount & { password: string; generated: boolean };

/* What password a fresh seed should give each account.
 *
 * Development keeps the documented demo sign-ins, because that is the whole point of a
 * demonstration database. A production seed must never create an account that the boot
 * guard would then refuse to serve: `SEED_PASSWORD` is honoured when the operator wants to
 * choose the passwords themselves, and otherwise every account gets its own random one. */
export function seedCredentialPlan(env: NodeJS.ProcessEnv = process.env): SeedCredential[] {
  const chosen = String(env.SEED_PASSWORD || '').trim();
  if (chosen && chosen.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`SEED_PASSWORD must contain at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (chosen) {
    return SEEDED_ACCOUNTS.map(account => ({ ...account, password: chosen, generated: false }));
  }
  if (env.NODE_ENV === 'production') {
    return SEEDED_ACCOUNTS.map(account => ({ ...account, password: generatePassword(), generated: true }));
  }
  return SEEDED_ACCOUNTS.map(account => ({ ...account, password: DEMO_PASSWORD, generated: false }));
}

export type IssuedCredential = { email: string; role?: string; password: string };

/** A fixed-width table, because a column of passwords is read character by character. */
export function credentialTable(rows: IssuedCredential[]) {
  const width = Math.max(...rows.map(row => row.email.length));
  return rows.map(row => `  ${row.email.padEnd(width)}  ${row.password}`).join('\n');
}

/* The report written beside the database after a boot-time rotation. It has to stand on its
   own: whoever finds it may not have seen the boot log, and it will be deleted as soon as
   the passwords are stored somewhere better. */
export function credentialReport(rows: IssuedCredential[], options: { writtenAt: string; reason: string }) {
  return [
    'P57 Sales Intelligence — sign-in credentials',
    '',
    `Written ${options.writtenAt}.`,
    options.reason,
    '',
    'Copy these into your password manager or platform secret store now, then delete this',
    'file. Nothing here can be recovered afterwards: the passwords are stored only as',
    'scrypt hashes.',
    '',
    credentialTable(rows),
    '',
    'Sign in with the email address and the password beside it. To choose your own password',
    'instead, run:',
    '  npm run user -- password <email> "<a long unique password>"',
    '',
  ].join('\n');
}
