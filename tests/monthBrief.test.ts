import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { briefText, monthBrief } from '../src/lib/monthBrief';

describe('monthly launch brief presentation', () => {
  it('reads exported collateral copy and structured channels instead of printing Piece', () => {
    const brief = monthBrief({
      collateral: {
        title: 'Launch assets',
        pieces: [
          {
            offer: 'The First Seven Days',
            description: '7-day unlimited intro',
            copy: {
              headline: 'Start with seven',
              detail: '₹2,000 credited on a qualifying purchase.',
              waLaunchText: 'Your week starts here.',
            },
            channels: [
              { key: 'whatsapp', title: 'WhatsApp', due: '2027-01-02' },
              { title: 'Email', due: '4 Jan' },
            ],
          },
        ],
      },
    });
    expect(brief.pieces).toEqual([
      {
        offer: 'The First Seven Days',
        headline: 'Start with seven',
        detail: '₹2,000 credited on a qualifying purchase.',
        copy: 'Your week starts here.',
        channels: [
          { label: 'WhatsApp', due: '2 Jan' },
          { label: 'Email', due: '4 Jan' },
        ],
      },
    ]);
  });

  it('reads the older portfolio format without losing copy or channel names', () => {
    const brief = monthBrief(
      {
        collateral: {
          pieces: [
            {
              offerId: 'O27-01',
              headline: 'A new start',
              detail: 'Three classes for two.',
              copy: 'Book your first class.',
              channels: ['Instagram', 'Email'],
            },
          ],
        },
      },
      [{ id: 50, name: 'Tasting Flight', provenance: { bankId: 'O27-01' } }],
    );
    expect(brief.pieces[0].offer).toBe('Tasting Flight');
    expect(brief.pieces[0].headline).toBe('A new start');
    expect(brief.pieces[0].copy).toBe('Book your first class.');
    expect(brief.pieces[0].channels.map(channel => channel.label)).toEqual(['Instagram', 'Email']);
  });

  it('keeps CRM dates, channels, labels, offer names and delivery notes from the exported schedule', () => {
    const brief = monthBrief({
      crm: {
        rule: 'One audience, one send.',
        sends: [
          {
            date: '2027-01-05',
            channel: 'WhatsApp',
            label: 'Launch broadcast',
            audience: 'New to Physique 57',
            offers: ['The First Seven Days', 'Tasting Flight'],
            note: 'Send after the morning class.',
          },
        ],
      },
    });
    expect(brief.crmRule).toBe('One audience, one send.');
    expect(brief.sends[0]).toEqual({
      day: '5 Jan',
      channel: 'WhatsApp',
      label: 'Launch broadcast',
      audience: 'New to Physique 57',
      offers: ['The First Seven Days', 'Tasting Flight'],
      note: 'Send after the morning class.',
      message: '',
    });
  });

  it('keeps the older audience/message format and resolves offer references', () => {
    const brief = monthBrief(
      { crm: { sends: [{ offerId: 'P57-EXAMPLE', audience: 'Welcome back', message: 'Your mat is waiting.' }] } },
      [{ id: 1, offer_uid: 'P57-EXAMPLE', name: 'Back to the Barre' }],
    );
    expect(brief.sends[0].offers).toEqual(['Back to the Barre']);
    expect(brief.sends[0].audience).toBe('Welcome back');
    expect(brief.sends[0].message).toBe('Your mat is waiting.');
  });

  it('preserves all pieces and sends, not a hidden six-item preview', () => {
    const brief = monthBrief({
      collateral: {
        pieces: Array.from({ length: 7 }, (_, i) => ({ offer: `Offer ${i + 1}`, detail: `Asset ${i + 1}` })),
      },
      crm: {
        sends: Array.from({ length: 10 }, (_, i) => ({ label: `Send ${i + 1}`, note: `Note ${i + 1}` })),
        sendsCount: 10,
      },
    });
    expect(brief.pieces).toHaveLength(7);
    expect(brief.pieces[6].detail).toBe('Asset 7');
    expect(brief.sends).toHaveLength(10);
    expect(brief.sends[9].note).toBe('Note 10');
  });

  it('keeps a zero filed estimate distinct from an absent estimate', () => {
    expect(monthBrief({ offersPlannedRevenue: 0 }).filedRevenue).toBe(0);
    expect(monthBrief({ offersPlannedRevenue: '1900000' }).filedRevenue).toBe(1900000);
    for (const value of [null, undefined, '', 'not a number', Infinity, false, [], {}]) {
      expect(monthBrief({ offersPlannedRevenue: value }).filedRevenue).toBeNull();
    }
  });

  it('retains reported counts separately when they differ from the detailed sends', () => {
    const brief = monthBrief({ crm: { sendsCount: 10, sends: [{ label: 'Only one detailed send' }] } });
    expect(brief.sends).toHaveLength(1);
    expect(brief.reportedSends).toBe(10);
  });

  it('handles partial briefs without object coercion, fabricated dates or mutations', () => {
    const source = {
      focus: 'January focus',
      crm: { sends: [{ date: '2027-99-99', audience: { text: 'Members only' } }] },
    };
    const before = structuredClone(source);
    const brief = monthBrief(source);
    expect(brief.pieces).toEqual([]);
    expect(brief.sends[0].day).toBe('2027-99-99');
    expect(brief.sends[0].audience).toBe('Members only');
    expect(JSON.stringify(brief)).not.toContain('[object Object]');
    expect(source).toEqual(before);
    expect(monthBrief(null).present).toBe(false);
    expect(monthBrief({}).present).toBe(false);
  });

  it('renders every shipped portfolio brief without losing its asset or send counts', () => {
    const portfolio = JSON.parse(fs.readFileSync('server/data/portfolio-2027/v5-portfolio.json', 'utf8'));
    for (const studio of portfolio.studios) {
      for (const month of studio.months) {
        const brief = monthBrief(month);
        expect(brief.pieces).toHaveLength(month.collateral?.pieces?.length || 0);
        expect(brief.sends).toHaveLength(month.crm?.sends?.length || 0);
        expect(brief.pieces.every(piece => piece.headline && piece.detail)).toBe(true);
        expect(JSON.stringify(brief)).not.toContain('[object Object]');
      }
    }
  });
});

describe('safe brief text', () => {
  it('keeps formatting text as text until React renders it', () => {
    expect(briefText('One **audience**, one send.')).toBe('One **audience**, one send.');
    expect(briefText({ text: 'Send once a week' })).toBe('Send once a week');
    expect(briefText({ audience: 'New clients', maxSendsPerWeek: 2 })).toBe(
      'Audience: New clients; Max Sends Per Week: 2',
    );
    expect(briefText(['WhatsApp', { title: 'Email' }, null, 'WhatsApp'])).toBe('WhatsApp · Email');
  });
  it('handles cyclic or unusable imported values without throwing or printing object placeholders', () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(briefText(cycle)).toBe('');
    for (const value of [undefined, null, false, NaN, {}]) expect(briefText(value)).toBe('');
  });
});
