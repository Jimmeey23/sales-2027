import { describe, expect, it } from 'vitest';
import { db } from '../server/db';
import { auditYear } from '../server/lib/planAudit';

describe('plan audit', () => {
  it('returns sorted findings with a summary for a real studio', () => {
    const studio = db.prepare('SELECT id FROM studios ORDER BY id LIMIT 1').get() as any;
    if (!studio) return;
    const r = auditYear(studio.id, 2027);
    expect(r.summary.critical + r.summary.warn + r.summary.info).toBe(r.findings.length);
    const rank = { critical: 0, warn: 1, info: 2 } as const;
    for (let i = 1; i < r.findings.length; i++)
      expect(rank[r.findings[i].severity]).toBeGreaterThanOrEqual(rank[r.findings[i - 1].severity]);
  });
});
