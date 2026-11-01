import { describe, expect, it } from 'vitest';
import {
  DEMO_PASSWORD,
  MIN_PASSWORD_LENGTH,
  SEEDED_ACCOUNTS,
  credentialReport,
  credentialTable,
  generatePassword,
  seedCredentialPlan,
} from '../server/lib/credentialPolicy.js';

const production = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;
const development = { NODE_ENV: 'development' } as NodeJS.ProcessEnv;

describe('the seeded cast', () => {
  it('covers every role with one account each, and one administrator', () => {
    const emails = SEEDED_ACCOUNTS.map(account => account.email);
    expect(new Set(emails).size).toBe(emails.length);
    expect(SEEDED_ACCOUNTS.filter(account => account.role === 'administrator')).toHaveLength(1);
    expect(emails).toContain('admin@p57.demo');
  });

  it('scopes only the studio-bound roles to a studio', () => {
    for (const account of SEEDED_ACCOUNTS) {
      const scoped = ['studio_manager', 'sales_associate'].includes(account.role);
      expect(Boolean(account.studio)).toBe(scoped);
    }
  });
});

describe('generated passwords', () => {
  it('are long, URL-safe and never repeat', () => {
    const generated = new Set(Array.from({ length: 200 }, () => generatePassword()));
    expect(generated.size).toBe(200);
    for (const password of generated) {
      expect(password.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
      expect(password).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });
});

describe('seed credentials', () => {
  it('keep the documented demo sign-ins in development', () => {
    const plan = seedCredentialPlan(development);
    expect(plan).toHaveLength(SEEDED_ACCOUNTS.length);
    expect(plan.every(entry => entry.password === DEMO_PASSWORD)).toBe(true);
    expect(plan.some(entry => entry.generated)).toBe(false);
  });

  it('never give a production database the published password', () => {
    const plan = seedCredentialPlan(production);
    expect(plan).toHaveLength(SEEDED_ACCOUNTS.length);
    expect(plan.every(entry => entry.password !== DEMO_PASSWORD)).toBe(true);
    expect(new Set(plan.map(entry => entry.password)).size).toBe(plan.length);
    expect(plan.every(entry => entry.generated)).toBe(true);
    expect(plan.every(entry => entry.password.length >= MIN_PASSWORD_LENGTH)).toBe(true);
  });

  it('honours a password chosen through SEED_PASSWORD', () => {
    const chosen = 'kemps-corner-2027-launch';
    const plan = seedCredentialPlan({ ...production, SEED_PASSWORD: chosen });
    expect(plan.every(entry => entry.password === chosen)).toBe(true);
    expect(plan.every(entry => entry.generated)).toBe(false);
  });

  it('refuses a SEED_PASSWORD short enough to guess', () => {
    expect(() => seedCredentialPlan({ ...production, SEED_PASSWORD: 'short' })).toThrowError(
      new RegExp(String(MIN_PASSWORD_LENGTH)),
    );
  });
});

describe('the credential report', () => {
  const issued = [
    { email: 'admin@p57.demo', role: 'administrator', password: 'first-generated-password' },
    { email: 'analyst@p57.demo', role: 'read_only_analyst', password: 'second-generated-password' },
  ];

  it('lines every password up under its address', () => {
    const rows = credentialTable(issued).split('\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain('admin@p57.demo');
    expect(rows[0].trim().endsWith('first-generated-password')).toBe(true);
    expect(rows[1].trim().endsWith('second-generated-password')).toBe(true);
  });

  it('says why it exists, and how to replace the passwords it holds', () => {
    const body = credentialReport(issued, { writtenAt: '2027-01-01T00:00:00.000Z', reason: 'Test rotation.' });
    expect(body).toContain('2027-01-01T00:00:00.000Z');
    expect(body).toContain('Test rotation.');
    expect(body).toContain('npm run user -- password');
    expect(body).toContain('first-generated-password');
  });
});
