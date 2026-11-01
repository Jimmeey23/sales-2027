import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isChallengeOffer } from '../server/lib/planSync2027.js';
import { isLegacyTheme } from '../src/data/monthNarrative.js';
import { PLAYBOOK_2027 } from '../src/data/playbook2027.js';

/* Stronger in 30 is a February moment. January sells its own three offers, and nothing in
   its plan may lean on the challenge — not the theme, not the moment, not a line of offer
   copy, and not the journey an offer is filed under. */

type Entry = {
  studio: string;
  month: number;
  theme: string;
  hook: string;
  job: string;
  moment: string;
  offers: Array<{ slot: string; name: string; tagline: string; fields: Record<string, string[]> }>;
};

const plan: Entry[] = JSON.parse(fs.readFileSync('server/data/approved-plan-2027.json', 'utf8'));
const CHALLENGE = /challenge|stronger in 30|week zero|back for stronger|finish line|30-day/i;
const strings = (entry: Entry) => {
  const out: Array<[string, string]> = [
    ['theme', entry.theme],
    ['hook', entry.hook],
    ['job', entry.job],
    ['moment', entry.moment],
  ];
  for (const offer of entry.offers) {
    out.push([`${offer.name} tagline`, offer.tagline]);
    for (const [field, lines] of Object.entries(offer.fields))
      for (const line of lines) out.push([`${offer.name} · ${field}`, line]);
  }
  return out;
};

describe('January', () => {
  const january = plan.filter(entry => entry.month === 1);

  it('plans every studio', () => {
    expect(january.map(entry => entry.studio).sort()).toEqual(
      ['Bandra', 'Kemps Corner', 'Kenkere House', 'Pop-up'].sort(),
    );
  });

  it('never mentions the February challenge, in any field of any offer', () => {
    const leaks: string[] = [];
    for (const entry of january)
      for (const [where, text] of strings(entry))
        if (CHALLENGE.test(text)) leaks.push(`${entry.studio} · ${where}: ${text}`);
    expect(leaks).toEqual([]);
  });

  it('files its offers under January journeys, not the challenge week', () => {
    for (const entry of january)
      for (const offer of entry.offers) expect(offer.fields.Journey || []).not.toContain('Week Zero');
  });

  it('keeps its own three offers', () => {
    for (const entry of january) {
      expect(entry.offers.map(offer => offer.slot).sort()).toEqual(['lapsed', 'newcomer', 'renewal']);
      expect(entry.theme).toBe('Start Line');
    }
  });
});

describe('February', () => {
  it('still runs the challenge, with the offers that carry it', () => {
    const february = plan.filter(entry => entry.month === 2);
    expect(february.every(entry => entry.theme === 'Stronger in 30 2.0')).toBe(true);
    for (const studio of ['Kemps Corner', 'Bandra', 'Kenkere House']) {
      const names = february.find(entry => entry.studio === studio)!.offers.map(offer => offer.name);
      expect(names).toEqual(expect.arrayContaining(['Week Zero', 'Back for Stronger', 'Finish Line Renewal']));
    }
  });

  it('keeps the Valentine’s and duo offers alongside it', () => {
    const kemps = plan.find(entry => entry.studio === 'Kemps Corner' && entry.month === 2)!;
    const names = kemps.offers.map(offer => offer.name);
    expect(names).toEqual(expect.arrayContaining(['The Second Date for Two', 'Partners in Crime']));
  });
});

describe('the 2027 sales playbook', () => {
  it('gives January its own chapter and its own offers', () => {
    const leaks: string[] = [];
    for (const location of Object.values(PLAYBOOK_2027.studios)) {
      const january = location.months.find(row => row.month === 'Jan')!;
      expect(january.theme).toBe('Start Line');
      for (const text of [january.focus, january.why, ...january.actions, ...january.offers])
        if (CHALLENGE.test(text)) leaks.push(`${location.name}: ${text.slice(0, 80)}`);
      for (const offer of location.offers)
        if (/\bJan\b/.test(offer.months) && CHALLENGE.test(`${offer.name} ${offer.mechanic} ${offer.logic}`))
          leaks.push(`${location.name} · ${offer.name}`);
    }
    expect(leaks).toEqual([]);
  });
});

describe('offer months', () => {
  it('recognises a challenge offer by its name or the journey it belongs to', () => {
    expect(isChallengeOffer('Week Zero', null)).toBe(true);
    expect(isChallengeOffer('back for stronger', null)).toBe(true);
    expect(isChallengeOffer('Finish Line Renewal', null)).toBe(true);
    expect(isChallengeOffer('The First Seven Days', { fields: { Journey: ['Week Zero'] } })).toBe(true);
    expect(isChallengeOffer('The First Seven Days', JSON.stringify({ fields: { Journey: ['Start Line'] } }))).toBe(
      false,
    );
  });
});

describe('a stored theme', () => {
  it('is judged against its own month, so February’s theme cannot sit in January', () => {
    expect(isLegacyTheme('Stronger in 30 2.0', 1)).toBe(true);
    expect(isLegacyTheme('Start Line', 1)).toBe(false);
    expect(isLegacyTheme('Stronger in 30 2.0', 2)).toBe(false);
  });

  it('still accepts any final-plan theme when the month is unknown', () => {
    expect(isLegacyTheme('Stronger in 30 2.0')).toBe(false);
    expect(isLegacyTheme('Start Line')).toBe(false);
  });
});
