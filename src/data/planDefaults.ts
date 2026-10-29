import { PLAYBOOKS_2027, type StudioPlaybook } from './2027Playbooks';
import { MONTH_CHAPTERS } from './monthNarrative';
import {
  APPROVED_PLAN_2027,
  approvedEntry,
  approvedMonth,
  approvedOffer,
  field,
  type ApprovedSlot,
  type ApprovedStudio,
} from './approvedPlan2027';

// Themes, moments and offers come from the final approved 2027 plan (approvedPlan2027.ts),
// via the month chapters, so the lists never drift.
export const MONTH_THEMES = MONTH_CHAPTERS.map(chapter => chapter.theme);
export const MONTH_ACTIVATIONS = MONTH_CHAPTERS.map(chapter => chapter.moment);
// Default offer objective per month (the final plan's commercial job), used to pre-fill the offer generator.
export const MONTH_OBJECTIVES = [
  'acquisition',
  'referral',
  'reactivation',
  'anniversary',
  'retention',
  'retention',
  'retention',
  'annual_membership',
  'reactivation',
  'revenue_gap',
  'annual_membership',
  'retention',
];

export interface ActionItem {
  text: string;
  owner: string;
  week: number;
  done: boolean;
}

/** Map any studio label onto its final-plan studio; studios outside the plan use the flagship. */
function approvedStudio(studio: string): ApprovedStudio {
  const lower = studio.toLowerCase();
  if (lower.includes('bandra')) return 'Bandra';
  if (lower.includes('kenkere')) return 'Kenkere House';
  if (lower.includes('pop-up') || lower.includes('popup')) return 'Pop-up';
  return 'Kemps Corner';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The year's final-plan offers for one slot, each with the months it runs. */
function slotOffers(studio: ApprovedStudio, slot: ApprovedSlot) {
  const byName = new Map<string, number[]>();
  for (const e of APPROVED_PLAN_2027.filter(x => x.studio === studio))
    for (const o of e.offers.filter(x => x.slot === slot)) byName.set(o.name, [...(byName.get(o.name) || []), e.month]);
  return [...byName].map(([name, months]) => `${name} (${months.map(m => MONTHS[m - 1]).join(', ')})`).join(' · ');
}

export function locationPlaybook(studio: string) {
  const key = approvedStudio(studio);
  return {
    newOffer: slotOffers(key, 'newcomer'),
    retention: slotOffers(key, 'lapsed'),
    renewal: slotOffers(key, 'renewal'),
    theme: [...new Set(APPROVED_PLAN_2027.filter(e => e.studio === key).map(e => e.theme))].join(' · '),
  };
}

export function studioPlaybook(studio: string): StudioPlaybook | null {
  return PLAYBOOKS_2027[studio] || null;
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : Math.ceil(n).toLocaleString('en-IN');

// Suggested plan for a studio-month when nothing has been saved yet, from the final approved plan.
export function defaultPlan(
  studio: string,
  month: number,
  target: any,
  activations: any[] = [],
  campaignTheme?: string,
) {
  const entry = approvedEntry(approvedStudio(studio), month) || approvedMonth(month);
  const activation = activations.find(
    a => String(a.Month).startsWith(MONTH_ABBR[month - 1]) || String(a.Month).includes(`–${MONTH_ABBR[month - 1]}`),
  );
  const funnel = target?.funnel || {};
  const f = entry.figures;
  const newcomer = approvedOffer(entry, 'newcomer'),
    lapsed = approvedOffer(entry, 'lapsed'),
    renewal = approvedOffer(entry, 'renewal');
  const when = (o: typeof newcomer) => (field(o, 'When') ? ` (${field(o, 'When')})` : '');
  const actions: ActionItem[] = [
    {
      week: 1,
      owner: 'Studio manager',
      done: false,
      text: `Brief the team on ${entry.theme} (${entry.hook}) and the three offers: ${entry.offers.map(o => o.name).join(', ')}.`,
    },
    {
      week: 1,
      owner: 'Sales',
      done: false,
      text: `Renewals: run “${renewal?.name || '—'}”${when(renewal)} — ${fmt(f.renewals[0])} due, ${fmt(f.renewals[1])} purchases planned.`,
    },
    {
      week: 1,
      owner: 'Marketing',
      done: false,
      text: `Launch the month: ${entry.moment}`,
    },
    {
      week: 2,
      owner: 'Sales',
      done: false,
      text: `Newcomers: run “${newcomer?.name || '—'}”${when(newcomer)} — ${fmt(funnel.requiredLeads ?? f.leadsTrials[0])} leads and ${fmt(funnel.requiredTrialBookings ?? f.leadsTrials[1])} trials.`,
    },
    {
      week: 2,
      owner: 'Studio manager',
      done: false,
      text: activation
        ? `Run activation: ${activation.Activation} (${activation.Format}) — target ${activation['Participant target'] ?? '—'} participants; KPI: ${activation['Primary KPI']}.`
        : `Run activation: ${entry.hook}.`,
    },
    {
      week: 3,
      owner: 'Sales',
      done: false,
      text: `Lapsed: run “${lapsed?.name || '—'}”${when(lapsed)} — ${fmt(f.lapsed[0])} touches, ${fmt(f.lapsed[1])} reactivated.`,
    },
    {
      week: 3,
      owner: 'Studio manager',
      done: false,
      text: `Watch: ${entry.offers
        .map(o => field(o, 'What to watch'))
        .filter(Boolean)
        .join(' ')}`,
    },
    {
      week: 4,
      owner: 'Sales',
      done: false,
      text: `Close the month: ${fmt(funnel.requiredNewBuyers ?? f.newBuyers)} new buyers; ${entry.job}`,
    },
  ];
  return {
    theme: campaignTheme || entry.theme,
    objective: entry.job,
    strategy: entry.offers.map(o => `${o.name}: ${o.tagline}\n${field(o, 'You pay')}`).join('\n\n'),
    notes: '',
    status: 'draft',
    actions,
  };
}
