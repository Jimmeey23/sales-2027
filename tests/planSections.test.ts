import { describe, expect, it } from 'vitest';
import { monthSections } from '../server/lib/planMonths.js';
import { renderPlanDocument, renderPlanMarkdown, scopePlanToMonth } from '../server/lib/planExport.js';

/* The export used to stop at the offers. These tests hold the line the studio asked for: every
   month leaves the building with its cover write-ups, overview, execution, offers, collateral
   and CRM calendar — and a file scoped to a single month still carries all of them. */

const offers = [
  {
    id: 901,
    name: 'The First Seven Days',
    slot: 'newcomer',
    description:
      '7-day unlimited intro with the fee credited back on your first purchase — aimed at winning new clients.',
    audience: 'First-time clients (phone verified).',
    price: 2000,
    buyers: 18,
    expectedRevenue: 410000,
    effectiveDiscountPercent: 15,
    status: 'approved',
    approval: 'approved',
    validity: { start: '2027-01-01', end: '2027-01-24' },
  },
];

const input = {
  year: 2027,
  month: 1,
  studioName: 'Kemps Corner',
  plan: {
    theme: 'Start Line',
    objective: 'Convert January trial demand and re-up the January annuals.',
    strategy: 'Start Line — New Year.\nCommercial job: Fill the first week, then convert.',
    notes: 'Push the lists, not a deeper discount.',
    status: 'approved',
    actions: [
      { week: 1, owner: 'Studio manager', text: 'Set up the three January offers in Momence.' },
      { week: 1, owner: 'Sales lead', text: 'Brief the team on the no-stacking rule.' },
    ],
    content: {
      collaterals: { hiddenChannels: [], customChannels: [], byOffer: {} },
    },
  },
  target: { theme: 'Start Line', status: 'approved' },
  econ: null,
  offers,
  revenues: {
    target: 3300000,
    priorYear: 2744705,
    streams: { newClient: 368937, renewal: 2082900, reactivation: 367639 },
  },
  funnel: {
    leads: 276,
    trials: 211,
    buyers: 50,
    renewalsDue: 193,
    renewalCoverage: 0.92,
    leadToTrial: 0.77,
    trialToMember: 0.24,
  },
};

describe('a month, assembled for the export', () => {
  const sections = monthSections(input as any);

  it('carries the cover write-ups the workspace opens with', () => {
    expect(sections.cover.theme).toBe('Start Line');
    expect(sections.cover.kicker).toBeTruthy();
    expect(sections.cover.moment).toBeTruthy();
    expect(sections.cover.brief).toBeTruthy();
    expect(sections.cover.risk).toBeTruthy();
    expect(sections.cover.signature).toBeTruthy();
    expect(sections.cover.objective).toBe(input.plan.objective);
    expect(sections.cover.target).toBe(3300000);
  });

  it('carries the overview in the same three parts the month tab shows', () => {
    expect(sections.overview.brief).toContain('Start Line');
    expect(sections.overview.leads).toContain('leads');
    expect(sections.overview.renewals).toContain('memberships expire');
    expect(sections.overview.renewals).toContain('renewal');
  });

  it('carries the week-by-week execution, the strategy and the notes', () => {
    expect(sections.execution.actions).toHaveLength(2);
    expect(sections.execution.weeks[0].week).toBe(1);
    expect(sections.execution.strategy.map(line => line.label)).toContain('Commercial job');
    expect(sections.execution.notes).toContain('Push the lists');
  });

  it('carries the collateral to produce, with its copy and due dates', () => {
    expect(sections.collateral.pieces).toHaveLength(1);
    const piece = sections.collateral.pieces[0];
    expect(piece.offer).toBe('The First Seven Days');
    expect(piece.copy.headline).toBeTruthy();
    expect(piece.channels.length).toBeGreaterThan(0);
    for (const channel of piece.channels) {
      expect(channel.due).toBeTruthy();
      expect(channel.items.length).toBeGreaterThan(0);
      expect(channel.copyText).toBeTruthy();
    }
    expect(sections.collateral.channelSpec.length).toBe(piece.channels.length);
  });

  it('carries the CRM calendar, one send per audience per channel', () => {
    expect(sections.crm.sends.length).toBeGreaterThan(0);
    const keys = sections.crm.sends.map((send: any) => `${send.date}|${send.channel}|${send.audience}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(sections.crm.ifSentPerOffer).toBeGreaterThanOrEqual(sections.crm.sends.length);
    for (const send of sections.crm.sends) expect(send.day).toMatch(/\d{1,2} \w{3}/);
  });
});

const doc = {
  schema: 'p57-sales-plan/1',
  generatedAt: '2027-01-01T00:00:00.000Z',
  year: 2027,
  currency: 'INR',
  scope: { type: 'studio', studios: [{ id: 1, name: 'Kemps Corner', city: 'Mumbai' }] },
  totals: { target: 3300000, priorYear: 2744705, growthPercent: 20.2, offers: 1 },
  studios: [
    {
      studio: { id: 1, name: 'Kemps Corner', city: 'Mumbai' },
      basis: 'observed_history',
      measuredWindow: { from: '2025-10', to: '2026-09' },
      year: { target: 3300000, priorYear: 2744705, growthPercent: 20.2 },
      months: [
        {
          month: 1,
          name: 'January',
          theme: 'Start Line',
          status: 'approved',
          target: 3300000,
          priorYear: 2744705,
          growthPercent: 20.2,
          streams: input.revenues.streams,
          funnel: { leads: 276, trials: 211, newBuyers: 50, existingPayingRenewals: 98, winbacksNeeded: 41 },
          offers,
          keyDates: [{ day: 1, name: 'New Year', kind: 'moment' }],
          sections: [],
          cover: monthSections(input as any).cover,
          overview: monthSections(input as any).overview,
          execution: monthSections(input as any).execution,
          collateral: monthSections(input as any).collateral,
          crm: monthSections(input as any).crm,
        },
        {
          month: 2,
          name: 'February',
          theme: 'Stronger in 30 2.0',
          status: 'draft',
          target: 2570000,
          priorYear: 1919110,
          growthPercent: 33.8,
          streams: input.revenues.streams,
          funnel: { leads: 286, trials: 219, newBuyers: 52, existingPayingRenewals: 102, winbacksNeeded: 30 },
          offers,
          keyDates: [],
          sections: [],
          cover: { theme: 'Stronger in 30 2.0' },
          overview: {},
          execution: {},
          collateral: { pieces: [] },
          crm: { sends: [] },
        },
      ],
    },
  ],
};

describe('the print document', () => {
  const html = renderPlanDocument(doc as any);

  it('puts the whole year in reading order: cover, then per month cover → offers → CRM → collateral', () => {
    for (const heading of ['Offers', 'CRM calendar', 'Marketing &amp; collaterals', 'What each channel needs']) {
      expect(html).toContain(heading);
    }
    expect(html).toContain('The moment');
    expect(html).toContain('Where the money comes from');
    expect(html).toContain('Week 1');
    expect(html).toContain('Jan');
  });

  it('lays every month out as an A4 page chain, and prints without the on-screen chrome', () => {
    expect(html).toContain('@page { size: A4; margin: 0; }');
    expect(html).toContain('break-before: page');
    expect(html).toContain('class="sheet"');
  });

  it('names the month in the title when the file is one month', () => {
    const single = renderPlanDocument(scopePlanToMonth(doc as any, 2) as any);
    expect(single).toContain('February');
    expect(single).not.toContain('The year, month');
    expect(single).toContain('Stronger in 30 2.0');
  });
});

describe('scoping the year to a month', () => {
  const february = scopePlanToMonth(doc as any, 2) as any;

  it('keeps only that month, and re-bases the totals on it', () => {
    expect(february.months).toBeUndefined();
    expect(february.month).toBe(2);
    expect(february.studios[0].months).toHaveLength(1);
    expect(february.studios[0].months[0].name).toBe('February');
    expect(february.totals.target).toBe(2570000);
    expect(february.totals.offers).toBe(1);
  });

  it('leaves the year alone when no month is asked for', () => {
    const whole = scopePlanToMonth(doc as any, null) as any;
    expect(whole.studios[0].months).toHaveLength(2);
    expect(whole.month).toBeUndefined();
  });
});

describe('the markdown document', () => {
  const md = renderPlanMarkdown(doc as any);

  it('reads cover → overview → execution → offers → collateral → CRM', () => {
    const order = [
      '**Cover.**',
      '**Overview.**',
      '**Execution.**',
      '**Offers.**',
      '**Collateral.**',
      '**CRM calendar.**',
    ];
    const positions = order.map(heading => md.indexOf(heading));
    for (const position of positions) expect(position).toBeGreaterThan(-1);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('gives a single-month file the sentence that explains the month', () => {
    const single = renderPlanMarkdown(scopePlanToMonth(doc as any, 1) as any);
    expect(single).toContain('January only');
    expect(single).toContain('# Physique 57 · 2027 sales plan · January');
    expect(single).not.toContain('February —');
  });
});
