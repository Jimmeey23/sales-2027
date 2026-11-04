// The run of the month, written from the month itself: its target, the offers actually
// selected, the funnel it needs and the renewal book it inherits. Every step names a number
// or a date, so the checklist reads as a plan to hit the target rather than a to-do list.

import type { ActionItem } from '../data/planDefaults';

export interface RunInput {
  year: number;
  month: number; // 1-12
  target: number;
  offers: any[];
  leads: number;
  trials: number;
  buyers: number;
  renewalsDue: number;
  keyDates?: Array<{ day: number; name: string }>;
  discountCap?: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const L = (v: number) =>
  `₹${(Math.max(0, v) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
const R = (v: number) => `₹${Math.round(Math.max(0, v)).toLocaleString('en-IN')}`;
const N = (v: number) => Math.max(0, Math.round(v)).toLocaleString('en-IN');
const day = (d: number, m: number) => `${d} ${MONTHS[m - 1]}`;

const slotOf = (o: any) => {
  const s = String(o?.plan_slot || '').toLowerCase();
  if (s) return s;
  const obj = String(o?.objective || o?.offer_type || '').toLowerCase();
  if (/lapse|win|reactiv|comeback/.test(obj)) return 'lapsed';
  if (/renew|retain|member/.test(obj)) return 'renewal';
  return 'newcomer';
};
const revenueOf = (o: any) => Number(o?.expected_revenue) || 0;
const unitsOf = (o: any) => Number(o?.target_purchases) || 0;

/** Weekly pacing the plan is read against: 25 / 50 / 75 / 100% of the target. */
export const WEEK_PACE = [0.25, 0.5, 0.75, 1, 1];

export function weekTarget(target: number, week: number) {
  return Math.round(target * (WEEK_PACE[Math.min(5, Math.max(1, week)) - 1] || 1));
}

export function buildRunOfMonth(input: RunInput): ActionItem[] {
  const { year, month, target, offers, leads, trials, buyers, renewalsDue } = input;
  const lastDay = new Date(year, month, 0).getDate();
  const live = offers.filter(Boolean);
  const byRevenue = [...live].sort((a, b) => revenueOf(b) - revenueOf(a));
  const lead = byRevenue[0];
  const offerRevenue = live.reduce((s, o) => s + revenueOf(o), 0);
  const newcomer = live.filter(o => slotOf(o) === 'newcomer');
  const lapsed = live.filter(o => slotOf(o) === 'lapsed');
  const renewal = live.filter(o => slotOf(o) === 'renewal');
  const names = (list: any[]) => list.map(o => `‘${o.name}’`).join(', ');
  const perWeek = (v: number) => Math.max(1, Math.round(v / 4));
  const a: ActionItem[] = [];
  const add = (week: number, owner: string, text: string) => a.push({ week, owner, text, done: false });

  // Week 1 — set up and launch: everything live, everyone briefed, the number on the wall.
  add(
    1,
    'Studio manager',
    `Pin the month’s scoreboard in the team group: ${L(target)} target, ${N(buyers)} new buyers, ${N(renewalsDue)} renewals due, ${L(offerRevenue)} expected from ${live.length} offers.`,
  );
  for (const o of live) {
    const price = Number(o.expected_asp) ? ` at ${R(Number(o.expected_asp))}` : '';
    const when =
      o.validity_start && o.validity_end ? ` (${String(o.validity_start).slice(5)} → ${String(o.validity_end).slice(5)})` : '';
    add(1, 'Studio manager', `Load ‘${o.name}’ in Momence${price}${when}, then run one test checkout before it goes live.`);
  }
  add(
    1,
    'Studio manager',
    `Brief the front desk and trainers: who each offer is for, the one-line pitch, and the ${input.discountCap ?? 20}% discount cap — no stacking with the standing perk.`,
  );
  add(1, 'Marketing', `Tent cards for all ${live.length} offers on the desk and mirrors by ${day(1, month)}; QR to the booking link.`);
  if (newcomer.length)
    add(1, 'Marketing', `Launch broadcast and email to new leads on ${day(1, month)} for ${names(newcomer)}.`);

  // Week 2 — push and convert: speed to lead, trial follow-up, renewals opened early.
  add(
    2,
    'Sales associate',
    `Call every new lead within 24 hours — book ${N(perWeek(trials))} trials this week (${N(trials)} for the month from ${N(leads)} leads).`,
  );
  add(
    2,
    'Sales associate',
    `Follow up every trial within 48 hours with the matching offer — ${N(perWeek(buyers))} first purchases this week.`,
  );
  if (renewalsDue)
    add(
      2,
      'Sales lead',
      `Open renewal conversations 14 days before expiry — ${N(renewalsDue)} memberships run out this month${renewal.length ? `; lead with ${names(renewal)}` : ''}.`,
    );
  add(2, 'Studio manager', `Week-2 check: ${L(weekTarget(target, 2) / 2)} banked by ${day(Math.min(14, lastDay), month)}? Post the number in the group.`);

  // Week 3 — mid-month review: read the numbers and move effort to what converts.
  add(
    3,
    'Studio manager',
    `Mid-month review on ${day(15, month)}: ${L(weekTarget(target, 2))} should be in by now. If not, move the floor to ${lead ? `‘${lead.name}’ (${N(unitsOf(lead))} buyers planned)` : 'the best-converting offer'}.`,
  );
  add(3, 'Marketing', `Send the mid-month nudge to everyone who opened the launch but hasn’t bought; the desk calls the top 20 warm leads by hand.`);
  if (lapsed.length)
    add(3, 'Sales associate', `Win-back calls to lapsed clients for ${names(lapsed)} — aim for ${N(perWeek(lapsed.reduce((s, o) => s + unitsOf(o), 0) * 2))} comebacks this week.`);

  // Week 4 — close and renew: the deadline, the last renewals, the month written up.
  add(
    4,
    'Marketing',
    `48-hour last call on ${day(Math.max(1, lastDay - 2), month)} to every audience, naming each offer still live and its close date.`,
  );
  if (renewalsDue)
    add(4, 'Sales lead', `Close every renewal due this month — anyone undecided gets a personal call before their expiry date.`);
  add(
    4,
    'Studio manager',
    `Month-end: log actuals against ${L(target)} and each offer’s plan, note what converted, and carry it into next month’s brief.`,
  );

  // Key dates get their own push, in the week they fall.
  for (const k of (input.keyDates || []).slice(0, 3)) {
    if (!k?.day || k.day > lastDay) continue;
    const week = Math.min(4, Math.ceil(k.day / 7));
    add(week, 'Marketing', `${k.name} (${day(k.day, month)}): one themed post and a story the day before, pointing to ${lead ? `‘${lead.name}’` : 'the month’s lead offer'}.`);
  }

  return a;
}
