import { describe, expect, it } from 'vitest';
import {
  actionsFromSections,
  focusPointsFor,
  numOf,
  parseSalesPlan,
  parseSalesPlanSet,
  resolveStudioId,
  studioKeys,
  textOf,
  weekOf,
} from '../server/lib/salesPlanImport.js';

/* Importing a year plan is only trustworthy if nothing is re-derived. These tests hold the
   contract the studio asked for: the document's themes, objectives, strategies, targets,
   streams, funnels, key dates, Week 1–4 execution plan and offer copy land exactly as written
   — and a document that is not a plan is refused rather than half-read. */

const document = {
  schema: 'p57-sales-plan/1',
  generatedAt: '2026-11-01T12:00:00+05:30',
  year: 2027,
  currency: 'INR',
  scope: { type: 'studio', studios: [{ id: 1, name: 'Kemps Corner', city: 'Mumbai' }] },
  totals: { target: 5850000, priorYear: 5000000, growthPercent: 17 },
  studios: [
    {
      studio: { id: 1, name: 'Kemps Corner', city: 'Mumbai' },
      year: {
        target: 5850000,
        priorYear: 5000000,
        streams: { newClient: 900000, renewal: 4200000, reactivation: 600000, other: 150000 },
      },
      basis: 'observed_history',
      measuredWindow: '2025-10 → 2026-09',
      trailing: { trialToMember: 0.26866, leadToTrial: 0.80229, renewalTicket: 10416.36, bogus: 3 },
      prices: { oneMonth: 19275, threeMonth: 55100 },
      months: [
        {
          month: 1,
          theme: 'The Dress Rehearsal',
          hook: 'New Year · seven days unlimited · the annual re-up',
          objective: 'Convert January trial demand before February’s challenge opens.',
          strategy: 'Rehearsal pricing for members, an annual re-up week, and a first-week close.',
          notes: 'Nothing launches early: January sells the habit.',
          target: 3200000,
          priorYear: 2900000,
          streams: { newClient: 480000, renewal: 2400000, reactivation: 250000, other: 70000 },
          feasibility: 'balanced',
          status: 'draft',
          funnel: { leads: 269, trials: 206, newBuyers: 49, renewalCoverage: 0.87 },
          keyDates: [
            {
              day: 1,
              name: 'New Year',
              kind: 'holiday',
              label: '1 Jan',
              approx: false,
              note: 'Open the year at list.',
            },
            { day: 13, date: '2027-01-13', name: 'Lohri', kind: 'festival', approx: true },
          ],
          sections: [
            {
              title: 'Week 1',
              items: [
                {
                  label: '',
                  value: 'Studio manager|Sales lead',
                  detail: 'Set the three January offers live in Momence before 2 Jan.',
                },
              ],
            },
            {
              title: 'Week 2',
              items: [{ label: 'Marketing', value: '', detail: 'Put the rehearsal film on the shop window screen.' }],
            },
          ],
          offers: [
            {
              slot: 'newcomer',
              name: 'Week Zero, Hero',
              headline: 'Seven days on us, then decide.',
              benefit: '7-day unlimited intro, fee credited against a purchase.',
              customerCopy: 'Start where you are. Seven days, no pressure.',
              internalDescription: 'Desk offers this before the challenge list.',
              rationale: 'The habit forms in the first week; the ask lands while it is warm.',
              audience: 'First-time clients (phone verified).',
              conditions: 'One intro per person; credit within 72 hours.',
              cta: 'Book your week',
              price: 2000,
              buyers: 18,
              expectedRevenue: 410000,
              effectiveDiscountPercent: 15,
              validity: { start: '2027-01-01', end: '2027-01-24' },
              runAds: true,
              approval: 'pending',
              status: 'draft',
              successMetrics: ['18 intros', '24% intro → purchase'],
              mechanics: { mechanism: 'percentage', discountPercent: 15 },
              fields: { Journey: ['The Dress Rehearsal'] },
            },
            {
              slot: 'renewal',
              name: 'The Ex Factor',
              price: 32000,
              buyers: 22,
              expectedRevenue: 704000,
              effectiveDiscountPercent: 10,
              validityStart: '2027-01-05',
              validityEnd: '2027-01-31',
            },
          ],
        },
        {
          month: 2,
          theme: 'Stronger in 30 2.0',
          objective: 'Run the January habit into a 30-day challenge.',
          target: 2650000,
          priorYear: 2100000,
          figures: {
            newClientPlan: 420000,
            renewalPlan: 1800000,
            reactivationPlan: 350000,
            otherPlan: 80000,
          },
          keyDates: [{ label: '14 Feb', name: 'Valentine’s Day', kind: 'global' }],
          offers: [{ name: 'The Plus-One Pact', slot: 'newcomer', price: 24000, buyers: 14, expectedRevenue: 336000 }],
        },
      ],
    },
  ],
};

describe('reading a plan document', () => {
  const plan = parseSalesPlan(document);

  it('takes the location and year from the document', () => {
    expect(plan.studioId).toBe(1);
    expect(plan.studioName).toBe('Kemps Corner');
    expect(plan.year).toBe(2027);
    expect(plan.schema).toBe('p57-sales-plan/1');
  });

  it('reads the year totals and the measured rates the plan is built on', () => {
    expect(plan.totals.target).toBe(5850000);
    expect(plan.totals.priorYear).toBe(5000000);
    expect(plan.totals.growthPercent).toBe(17);
    expect(plan.totals.offers).toBe(3);
    expect(plan.trailing.trialToMember).toBeCloseTo(0.26866, 5);
    // Keys that are not assumptions the model knows are dropped, not written blind.
    expect(plan.trailing.bogus).toBeUndefined();
    expect(plan.prices.threeMonth).toBe(55100);
    expect(plan.basis).toBe('observed_history');
  });

  it('keeps every month’s written fields as written', () => {
    const january = plan.months[0];
    expect(january.theme).toBe('The Dress Rehearsal');
    expect(january.kicker).toBe('New Year · seven days unlimited · the annual re-up');
    expect(january.objective).toContain('Convert January trial demand');
    expect(january.strategy).toContain('annual re-up week');
    expect(january.notes).toBe('Nothing launches early: January sells the habit.');
    expect(january.feasibility).toBe('balanced');
    expect(january.status).toBe('draft');
    expect(january.target).toBe(3200000);
    expect(january.priorYear).toBe(2900000);
    expect(january.funnel.newBuyers).toBe(49);
  });

  it('falls back to the plan figures when a month carries no streams block', () => {
    const february = plan.months[1];
    expect(february.streams).toEqual({ newClient: 420000, renewal: 1800000, reactivation: 350000, other: 80000 });
    expect(february.target).toBe(2650000);
  });

  it('reads key dates from a day, from a date, and from a label', () => {
    const dates = plan.months[0].keyDates;
    expect(dates.map(date => date.name)).toEqual(['New Year', 'Lohri']);
    expect(dates[1]).toMatchObject({ day: 13, kind: 'festival', approx: true });
    expect(plan.months[1].keyDates[0]).toMatchObject({ day: 14, name: 'Valentine’s Day' });
  });

  it('carries every offer field, including the ones a summary would drop', () => {
    const [weekZero, exFactor] = plan.months[0].offers;
    expect(weekZero).toMatchObject({
      name: 'Week Zero, Hero',
      slot: 'newcomer',
      headline: 'Seven days on us, then decide.',
      audience: 'First-time clients (phone verified).',
      conditions: 'One intro per person; credit within 72 hours.',
      cta: 'Book your week',
      price: 2000,
      buyers: 18,
      expectedRevenue: 410000,
      discountPercent: 15,
      validityStart: '2027-01-01',
      validityEnd: '2027-01-24',
      runAds: true,
      approval: 'pending',
      status: 'draft',
    });
    expect(weekZero.mechanics).toEqual({ mechanism: 'percentage', discountPercent: 15 });
    expect(weekZero.fields?.Journey).toEqual(['The Dress Rehearsal']);
    expect(weekZero.objective).toBe('acquisition');
    // Dates given flat, rather than as a validity object, are read the same way.
    expect(exFactor).toMatchObject({ validityStart: '2027-01-05', validityEnd: '2027-01-31', slot: 'renewal' });
    expect(exFactor.objective).toBe('retention');
  });

  it('numbers the offers in plan order when the file does not rank them', () => {
    expect(plan.months[0].offers.map(offer => offer.rank)).toEqual([1, 2]);
  });

  it('hashes the document so a re-import can be recognised', () => {
    const again = parseSalesPlan(JSON.parse(JSON.stringify(document)));
    expect(again.hash).toBe(plan.hash);
    const changed = parseSalesPlan({ ...document, totals: { ...document.totals, target: 1 } });
    expect(changed.hash).not.toBe(plan.hash);
  });
});

describe('the Week 1–4 sections become the execution plan', () => {
  const plan = parseSalesPlan(document);
  const actions = actionsFromSections(plan.months[0].sections);

  it('gives each line its week, its owners and its text', () => {
    expect(actions).toEqual([
      {
        week: 1,
        owner: 'Studio manager / Sales lead',
        text: 'Set the three January offers live in Momence before 2 Jan.',
        done: false,
      },
      { week: 2, owner: 'Marketing', text: 'Put the rehearsal film on the shop window screen.', done: false },
    ]);
  });

  it('reads a week from a title, a number or its position', () => {
    expect(weekOf('Week 3', 0)).toBe(3);
    expect(weekOf('3. Launch', 0)).toBe(3);
    expect(weekOf('', 2)).toBe(3);
    expect(weekOf('Finish line', 9)).toBe(5);
  });
});

describe('focus points, when the document does not spell them out', () => {
  const plan = parseSalesPlan(document);

  it('states the target, the mix, the funnel and the offers', () => {
    const points = focusPointsFor(plan.months[0]);
    expect(points[0]).toContain('₹32.0L');
    expect(points.join(' ')).toContain('₹24.0L planned');
    expect(points.join(' ')).toContain('269 leads → 206 trials → 49 new buyers');
    expect(points.join(' ')).toContain('Week Zero, Hero');
  });

  it('keeps the document’s own focus points when it has them', () => {
    const points = focusPointsFor({ ...plan.months[0], focusPoints: ['**One thing:** sell the week.'] });
    expect(points).toEqual(['**One thing:** sell the week.']);
  });
});

describe('refusing what is not a plan', () => {
  it('rejects a document with another schema', () => {
    expect(() => parseSalesPlan({ schema: 'something-else', months: [] })).toThrow(/not a plan document/i);
  });

  it('rejects a plan with no months', () => {
    expect(() => parseSalesPlan({ schema: 'p57-sales-plan/1', months: [] })).toThrow(/no months/i);
  });

  it('rejects a string that is not JSON', () => {
    expect(() => parseSalesPlan('not json')).toThrow();
  });
});

describe('reading values generously', () => {
  it('reads money with a rupee sign or a percent sign', () => {
    expect(numOf('₹42,00,000')).toBe(4200000);
    expect(numOf('26.9%')).toBeCloseTo(26.9, 5);
    expect(numOf('')).toBeNull();
    expect(numOf('n/a')).toBeNull();
  });

  it('flattens copy that arrives as a list', () => {
    expect(textOf(['One rule.', 'Another rule.'])).toBe('One rule.\nAnother rule.');
    expect(textOf({ text: 'Written plainly.' })).toBe('Written plainly.');
  });
});

/* A portfolio file names several locations in one document. Each location is its own year —
   its own totals, its own rates, its own months — and must be matched to the workspace's
   studio by name, not by position. */
const monthFor = (target: number, theme: string, offerName: string) => ({
  month: 1,
  theme,
  focus: `${theme}, said once`,
  studioRole: 'Retention-led',
  objective: 'Hold the renewal base.',
  strategy: 'Sell the annual before the price moves.',
  notes: 'Nothing launches early.',
  target,
  priorYear: Math.round(target / 1.2),
  streams: { newClient: 1000, renewal: target - 1000, reactivation: 0, other: 0 },
  offersPlannedRevenue: 123456,
  offers: [
    {
      id: 'O27-01-KC',
      bankId: 'O27-01',
      slot: 'spot',
      name: offerName,
      headline: '57 hours only',
      customerCopy: 'One month, flat.',
      price: 15000,
      expectedRevenue: 123456,
      buyers: 8,
      mechanicTags: ['flat spot price'],
      kpi: 'Packs with all 3 classes used',
      validity: { start: '2027-01-01', end: '2027-01-03' },
    },
  ],
  collateral: { title: 'Resolutions', pieces: [{ offerId: 'O27-01', headline: 'Top line' }] },
  crm: { rule: 'One audience, one send.', sends: [{ offerId: 'O27-01', audience: 'Lapsed' }] },
  keyDates: [],
  sections: [],
});

const portfolio = {
  schema: 'p57-sales-plan/1',
  version: 'v5-portfolio',
  generatedAt: '2026-11-01T12:00:00+00:00',
  year: 2027,
  totals: { target: 9000000, priorYear: 7000000, offers: 2, offerBankSize: 1 },
  policy: { discountCaps: 'Campaign ≤20%.', standing: { newcomerFirstMembership: '15% off' } },
  dataGaps: ['Trial attendance is unmeasured.'],
  changesFromPrevious: ['156 offers folded into a 50-offer bank.'],
  studioIntelligence: {
    KC: { studio: 'Kemps Corner (Kwality House)', role: 'Retention-led', findings: ['Best renewal yield.'] },
    BA: { studio: 'Bandra (Supreme HQ)', role: 'Reactivation-led', findings: [] },
  },
  offerBank: [
    {
      id: 'O27-01',
      month: 1,
      monthName: 'January',
      name: 'The 57-Hour Hangover Sale',
      slot: 'spot',
      type: 'Spot price (flash)',
      studios: ['KC', 'BA'],
      mechanicTags: ['flat spot price'],
      headline: 'Hungover? Same.',
      customerMessage: 'One month unlimited, flat.',
      offerDetails: '1 Month Unlimited at a flat ₹15,000.',
      logic: 'Front-load January cash.',
      rules: 'One per person.',
      kpi: '57 memberships per city',
      validity: { start: '2027-01-01', end: '2027-01-03' },
      priceByCity: { Mumbai: 15000 },
      planByStudio: { KC: { buyers: 20, price: 15000, revenue: 300000 } },
    },
  ],
  studios: [
    {
      studio: { id: 1, name: 'Kemps Corner (Kwality House)', city: 'Mumbai', code: 'KH' },
      year: { target: 6000000, priorYear: 4500000 },
      trailing: { trialToMember: 0.269 },
      months: [monthFor(6000000, 'Resolutions with Receipts', 'Hangover Sale')],
    },
    {
      studio: { id: 2, name: 'Bandra (Supreme HQ)', city: 'Mumbai', code: 'SU' },
      year: { target: 3000000, priorYear: 2500000 },
      trailing: { trialToMember: 0.31 },
      months: [monthFor(3000000, 'Back to the Barre', 'Bandra Comeback')],
    },
  ],
};

const studios = [
  { id: 1, name: 'Kemps Corner', code: 'KC', aliases: '["Kwality House, Kemps Corner"]' },
  { id: 2, name: 'Bandra', code: 'BA', aliases: '["Supreme HQ"]' },
  { id: 3, name: 'Kenkere House', code: 'KK', aliases: null },
  { id: 4, name: 'Pop-up', code: 'POP', aliases: '["Popup","Pop up"]' },
  { id: 5, name: 'Copper + Cloves', code: 'CC', aliases: '["The Studio by Copper + Cloves"]' },
  { id: 6, name: 'Plash Pilates', code: 'PP', aliases: '["Plash Pilates"]' },
];

describe('a document that describes several locations', () => {
  it('reads one document per location, each with its own totals', () => {
    const set = parseSalesPlanSet(portfolio);
    expect(set.documents).toHaveLength(2);
    expect(set.documents.map(document => document.studioName)).toEqual([
      'Kemps Corner (Kwality House)',
      'Bandra (Supreme HQ)',
    ]);
    expect(set.documents[0].totals.target).toBe(6000000);
    expect(set.documents[1].totals.target).toBe(3000000);
    // The location's own year block wins over the portfolio's totals.
    expect(set.documents[0].totals.priorYear).toBe(4500000);
  });

  it('keeps the year-level material the file carries', () => {
    const set = parseSalesPlanSet(portfolio);
    expect(set.version).toBe('v5-portfolio');
    expect(set.offerBank).toHaveLength(1);
    expect(set.dataGaps).toEqual(['Trial attendance is unmeasured.']);
    expect(set.changesFromPrevious).toHaveLength(1);
    expect(set.policy.discountCaps).toBe('Campaign ≤20%.');
    expect(Object.keys(set.studioIntelligence)).toEqual(['KC', 'BA']);
  });

  it('reads a month brief and an offer the way the file writes them', () => {
    const month = parseSalesPlanSet(portfolio).documents[0].months[0];
    expect(month.focus).toBe('Resolutions with Receipts, said once');
    expect(month.studioRole).toBe('Retention-led');
    expect(month.offersPlannedRevenue).toBe(123456);
    expect(month.collateral?.title).toBe('Resolutions');
    expect(month.crm?.sends).toHaveLength(1);
    const offer = month.offers[0];
    expect(offer.slot).toBe('spot');
    expect(offer.bankId).toBe('O27-01');
    expect(offer.mechanicTags).toEqual(['flat spot price']);
    expect(offer.kpi).toBe('Packs with all 3 classes used');
    expect(offer.validityStart).toBe('2027-01-01');
  });

  it('refuses to read a portfolio as a single location', () => {
    expect(() => parseSalesPlan(portfolio)).toThrow(/describes 2 locations/i);
  });

  it('matches each location to the studio by name, alias or code', () => {
    expect(resolveStudioId(studios, { id: 2 })).toBe(2);
    expect(resolveStudioId(studios, { name: 'Kemps Corner (Kwality House)' })).toBe(1);
    expect(resolveStudioId(studios, { name: 'Bandra (Supreme HQ)' })).toBe(2);
    expect(resolveStudioId(studios, { name: 'Bengaluru Pop-ups (Copper + Cloves, Plash Pilates)' })).toBe(4);
    expect(resolveStudioId(studios, { name: 'Kenkere House' })).toBe(3);
    // The umbrella pop-up wins over the venue named in its brackets …
    expect(resolveStudioId(studios, { name: 'Copper + Cloves' })).toBe(5);
    expect(resolveStudioId(studios, { name: 'Plash Pilates' })).toBe(6);
    // … and a document that names part of a studio is still that studio.
    expect(resolveStudioId(studios, { name: 'Kwality House' })).toBe(1);
    expect(resolveStudioId(studios, { code: 'KC' })).toBe(1);
    expect(resolveStudioId(studios, { name: 'Somewhere else' })).toBeNull();
  });

  it('maps the document’s short location keys onto studios', () => {
    const set = parseSalesPlanSet(portfolio);
    const keys = studioKeys(set, studios);
    expect(keys.get('KC')).toBe(1);
    expect(keys.get('BA')).toBe(2);
  });
});
