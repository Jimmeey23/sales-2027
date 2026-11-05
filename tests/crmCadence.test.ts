import { describe, expect, it } from 'vitest';
import { buildCommsSends, COMMS_SLOTS, CRM_MAX_TOUCHES, CRM_MIN_GAP_DAYS } from '../src/lib/commsPlan';

const offers = [
  { id: 1, name: 'A', plan_slot: 'newcomer', validity_start: '2027-03-01', validity_end: '2027-03-31' },
  { id: 2, name: 'B', plan_slot: 'newcomer', validity_start: '2027-03-15', validity_end: '2027-03-31' },
  { id: 3, name: 'C', plan_slot: 'renewal' },
  { id: 4, name: 'D', plan_slot: 'lapsed' },
  { id: 5, name: 'E', plan_slot: 'lapsed' },
];
const ctx = { year: 2027, month: 3, hidden: [], custom: [], leads: { whatsapp: 10, email: 12, tent: 15 }, reminder: new Date(2027, 2, 30), slots: COMMS_SLOTS };

describe('CRM cadence', () => {
  it('caps client touches per audience and spaces them out', () => {
    const { sends } = buildCommsSends(offers, ctx);
    const byAud = new Map<string, Date[]>();
    for (const s of sends) if (s.audience) byAud.set(s.audience, [...(byAud.get(s.audience) || []), s.date]);
    for (const dates of byAud.values()) {
      expect(dates.length).toBeLessThanOrEqual(CRM_MAX_TOUCHES);
      for (let i = 1; i < dates.length; i++)
        expect((dates[i].getTime() - dates[i - 1].getTime()) / 86400000).toBeGreaterThanOrEqual(CRM_MIN_GAP_DAYS);
    }
  });
  it('combines offers into one send per audience and carries late openers', () => {
    const { sends } = buildCommsSends(offers, ctx);
    const lapsedLaunch = sends.find(s => s.audience === 'Welcome back' && s.label === 'Launch');
    expect(lapsedLaunch?.names).toEqual(['D', 'E']);
    expect(sends.some(s => s.audience === 'New to Physique 57' && s.names.includes('B'))).toBe(true);
    expect(sends.filter(s => s.channel === 'tent')).toHaveLength(1);
  });
});
