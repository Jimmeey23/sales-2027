import { PLAYBOOKS_2027, type StudioPlaybook } from './2027Playbooks';
import { MONTH_CHAPTERS } from './monthNarrative';

// The twelve campaign chapters live in monthNarrative.ts, together with each month's
// moment, brief, risk and signature move. The theme list is derived so the two never drift.
export const MONTH_THEMES = MONTH_CHAPTERS.map(chapter => chapter.theme);
export const MONTH_ACTIVATIONS = [
  'Newcomer open house + trial follow-up',
  'Referral week with member guest passes',
  'Progress check-ins and goal resets',
  'Signature community event + conversion desk',
  'Beginner series / foundations workshop',
  'Midyear member challenge',
  'Consistency streak challenge',
  'Bring-a-friend week',
  'Progress milestone reviews',
  'Member appreciation classes',
  'Community referral event',
  'Renewal and giftable-pack drive',
];
// Default offer objective per month, used to pre-fill the offer generator.
export const MONTH_OBJECTIVES = [
  'acquisition',
  'referral',
  'retention',
  'anniversary',
  'retention',
  'reactivation',
  'retention',
  'referral',
  'reactivation',
  'acquisition',
  'annual_membership',
  'revenue_gap',
];

export interface ActionItem {
  text: string;
  owner: string;
  week: number;
  done: boolean;
}

export function locationPlaybook(studio: string) {
  const lower = studio.toLowerCase();
  if (lower.includes('pilates'))
    return {
      newOffer:
        'Paid introductory Pilates series; credit the trial value toward an eligible package where policy allows.',
      retention: 'Class-plan check-ins, progression milestones and a coached return path after missed weeks.',
      renewal:
        'Start outreach 45 days before expiry; offer a renewal conversation and suitable package choice before any incentive.',
      theme: 'Pilates foundations, control and measurable progression',
    };
  if (lower.includes('kenkere'))
    return {
      newOffer:
        'Use the configured ₹675 intro pack and once-lifetime Newcomers 2-for-1 journey for eligible first-timers.',
      retention:
        'Coach-led attendance check-ins and a next-level class pathway; invite members to book their next two visits.',
      renewal:
        'Begin 45-day pre-expiry outreach; lead with continuity and the best-fit pack, following the studio offer policy.',
      theme: 'Barre fundamentals, strength and community',
    };
  if (lower.includes('copper'))
    return {
      newOffer: 'Paid trial with a clear first-visit-to-package follow-up; apply only approved studio terms.',
      retention: 'Personal progress check-ins and a rebooking prompt after the first missed week.',
      renewal:
        'Reach out 45 days before expiry with a package-fit review and renewal link; use approved benefits only.',
      theme: 'Studio discovery, movement and neighbourhood community',
    };
  if (lower.includes('wework') || lower.includes('taj') || lower.includes('south united'))
    return {
      newOffer: 'Local partner / workplace discovery session with a tracked guest or paid-trial pathway.',
      retention: 'Use host-community reminders and a recurring class commitment for active members.',
      renewal: 'Contact members 45 days before expiry; offer a simple renewal appointment and continuity plan.',
      theme: 'Convenience, community and a consistent weekly practice',
    };
  if (lower.includes('pop-up') || lower.includes('outdoor'))
    return {
      newOffer: 'Event-led discovery with a follow-up trial invitation and source tracking.',
      retention: 'Capture opt-in follow-up at each activation and invite attendees into a recurring studio routine.',
      renewal: 'Follow up with known package holders ahead of expiry; route to their home studio and approved offer.',
      theme: 'Pop-up discovery and community-led movement',
    };
  return {
    newOffer: 'Newcomer 2-for-1 or an approved intro pack, then a prompt follow-up to the best-fit membership.',
    retention: 'Attendance-led check-ins, progress milestones and a next-class booking prompt.',
    renewal: 'Begin outreach 45 days before expiry; recommend the best-fit renewal and use only approved terms.',
    theme: 'Barre discovery, strength and member progress',
  };
}

export function studioPlaybook(studio: string): StudioPlaybook | null {
  return PLAYBOOKS_2027[studio] || null;
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? '—' : Math.ceil(n).toLocaleString('en-IN');

// Suggested plan for a studio-month when nothing has been saved yet.
export function defaultPlan(
  studio: string,
  month: number,
  target: any,
  activations: any[] = [],
  campaignTheme?: string,
) {
  const base = locationPlaybook(studio),
    source = studioPlaybook(studio)?.months[month - 1];
  const activation = activations.find(
    a => String(a.Month).startsWith(MONTH_ABBR[month - 1]) || String(a.Month).includes(`–${MONTH_ABBR[month - 1]}`),
  );
  const funnel = target?.funnel || {};
  const offerName = source?.offer || MONTH_ACTIVATIONS[month - 1];
  const actions: ActionItem[] = [
    {
      week: 1,
      owner: 'Studio manager',
      done: false,
      text: `Brief the team on the month target, theme and lead offer “${offerName}”.`,
    },
    {
      week: 1,
      owner: 'Sales',
      done: false,
      text: `T−14 renewal calls${source?.renewalsDue !== undefined ? ` for ${source.renewalsDue} renewals due; close ${source.renewalPurchases} renewal purchases` : ''} (WhatsApp T−7, T−2; last chance T+7).`,
    },
    {
      week: 1,
      owner: 'Marketing',
      done: false,
      text: `Launch offer communication (WhatsApp, email, Instagram) to the target audience.`,
    },
    {
      week: 2,
      owner: 'Sales',
      done: false,
      text: `Generate ${fmt(funnel.requiredLeads)} qualified leads and book ${fmt(funnel.requiredTrialBookings)} trials for the month.`,
    },
    {
      week: 2,
      owner: 'Studio manager',
      done: false,
      text: activation
        ? `Run activation: ${activation.Activation} (${activation.Format}) — target ${activation['Participant target'] ?? '—'} participants; KPI: ${activation['Primary KPI']}.`
        : `Run activation: ${MONTH_ACTIVATIONS[month - 1]}.`,
    },
    {
      week: 2,
      owner: 'Sales',
      done: false,
      text: 'Follow up every trial same day, day 2 and day 3; offer the 72-hour first-purchase perk.',
    },
    {
      week: 3,
      owner: 'Sales',
      done: false,
      text: `Lapsed-member outreach${source ? ` (${source.lapsedTouches.toLocaleString('en-IN')} touches)` : ''}; invite to a comeback class.`,
    },
    {
      week: 3,
      owner: 'Studio manager',
      done: false,
      text: 'Mid-month review: revenue vs target, trial conversion, renewals closed. Adjust push if behind.',
    },
    {
      week: 3,
      owner: 'Studio manager',
      done: false,
      text: 'Day-21 checkpoint: if below 90% of milestone, push trial and lapsed lists — not a deeper discount.',
    },
    {
      week: 4,
      owner: 'Sales',
      done: false,
      text: `Days 22–end (35–38% of sales): close the month — convert open trials to reach ${fmt(funnel.requiredNewBuyers)} new buyers; chase pending renewals.`,
    },
    { week: 4, owner: 'Studio manager', done: false, text: 'Record campaign results and pre-plan next month’s offer.' },
  ];
  return {
    theme: campaignTheme || source?.offer || MONTH_THEMES[month - 1],
    objective: source?.objective || base.theme,
    strategy: `New clients: ${base.newOffer}\n\nRetention: ${base.retention}\n\nRenewals: ${base.renewal}`,
    notes: '',
    status: 'draft',
    actions,
  };
}
