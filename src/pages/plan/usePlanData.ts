import { api } from '../../api';
import { useApp } from '../../App';
import { useLoad } from '../../hooks';
import { locationStudioIds, planningLocations } from '../../data/locations';
import { MONTH_THEMES, studioPlaybook } from '../../data/planDefaults';
import type { Studio } from '../../types';

export interface MonthRow {
  month: number;
  target: number;
  approved: boolean;
  planApproved: boolean;
  lastYear: number;
  actual: number;
  newClient: number;
  renewal: number;
  reactivation: number;
  other: number;
  leads: number;
  trials: number;
  buyers: number;
  transactions: number;
  renewalsDue: number;
  renewalPurchases: number;
  reactivated: number;
  lapsedTouches: number;
  objective: string;
  leadOffer: string;
  theme: string;
  renewalTarget: number;
  expectedRenewal: number;
  renewalGap: number;
  projectedExpiries: number;
  bookedExpiries: number;
  feasibility: 'comfortable' | 'balanced' | 'stretch';
  stretchPct: number;
  bottleneck: string | null;
  clients2026: number;
  newClients2026: number;
  byStudio: Array<{ id: number; name: string; target: number; leadOffer: string; objective: string }>;
}
export interface MonthEconomics {
  month: number;
  newClient: {
    target: number;
    firstSpend: number;
    trialSpend: number;
    trialRevenue: number;
    trialToMember: number;
    leadToTrial: number;
    buyers: number;
    trials: number;
    leads: number;
    samples: {
      firstSpendBuyers: number;
      trialCohort: number;
      leadCohort: number;
      seasonalMonth: string;
      seasonalFirstSpend: number | null;
      seasonalTrialToMember: number | null;
    };
  };
  renewal: {
    target: number;
    bookedExpiries: number;
    bookedValue: number;
    baselineExpiries: number;
    projectedExpiries: number;
    renewalRate: number;
    ticket: number;
    expectedRenewers: number;
    expected: number;
    renewersNeeded: number;
    gap: number;
    coverage: number | null;
  };
  reactivation: { target: number; ticket: number; needed: number; lapsedPool: number };
  other?: { target: number };
  benchmark?: {
    basis: 'observed_history' | 'empirical_playbook';
    prior2026Revenue: number | null;
    prior2026Partial: boolean;
    prior2026Clients: number | null;
    prior2026NewClients: number | null;
    planPoolLeads: number;
    planPoolTrials: number;
    planPoolExpiries: number;
    planPoolLapsed: number;
    feasibility: 'comfortable' | 'balanced' | 'stretch';
    stretchPct: number;
    bottleneck: string | null;
  };
  alternates: Array<{ key: string; name: string; logic: string; units: number; revenue: number }>;
}
export interface Economics {
  window: { from: string; to: string; trialFrom: string; trialTo: string };
  months: MonthEconomics[];
  assumptions: Record<string, { auto: number | null; override: number | null }>;
}
export interface StudioPlan {
  studio: Studio;
  detail: any;
  economics: Economics;
  months: MonthRow[];
  annual: number;
  lastYear: number;
}
export interface PlanData {
  scope: Studio[];
  plans: StudioPlan[];
  months: MonthRow[];
  annual: number;
  lastYear: number;
  offers: any[];
  campaigns: any[];
  activations: any[];
}

const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
export const targetOf = (t: any) => (t ? num(t.approved_target ?? t.proposed_target) : 0);
export const lakh = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? '—'
    : `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: digits })}L`;

function monthRows(studio: Studio, detail: any, economics: Economics): MonthRow[] {
  const playbook = studioPlaybook(studio.name);
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1,
      t = detail.targets.find((x: any) => x.month === month),
      a = t?.assumptions || {},
      f = t?.funnel || {};
    const pb = a.playbook || {},
      wb = a.workbook || {},
      src = playbook?.months[i];
    const plan = detail.plans.find((p: any) => p.month === month);
    const target = targetOf(t),
      scale = t && num(t.proposed_target) ? target / num(t.proposed_target) : 1;
    let renewal = num(t?.renewal_target) * scale,
      reactivation = num(t?.reactivation_target) * scale,
      other = num(t?.other_target) * scale;
    const nonNew = renewal + reactivation + other;
    if (nonNew > target && nonNew > 0) {
      const factor = target / nonNew;
      renewal *= factor;
      reactivation *= factor;
      other *= factor;
    }
    const newClient = Math.max(0, target - renewal - reactivation - other);
    // The lead offer is the month's first pick from the offer bank, never a written default.
    const leadOffer: string = plan?.offers?.[0]?.name || 'No offer picked yet';
    const objective = pb.objective || src?.objective || plan?.objective || MONTH_THEMES[i];
    // Bottom-up economics take priority when unit economics are resolved; fall back to stored funnel/playbook counts if ever zeroed.
    const e = economics.months[i];
    const fallbackBuyers = num(f.requiredNewBuyers ?? pb.buyers ?? src?.buyers ?? wb.newPaying);
    const fallbackTrials = num(f.requiredCompletedTrials ?? pb.trials ?? src?.trials ?? wb.trials);
    const fallbackLeads = num(f.requiredLeads ?? pb.leads ?? src?.leads ?? wb.leads);
    const fallbackRenDue = num(pb.renewalsDue ?? src?.renewalsDue ?? wb.renewalsDue);
    const fallbackRenPurchases = num(pb.renewalPurchases ?? src?.renewalPurchases ?? wb.renewalPurchases ?? wb.existingPaying);
    const fallbackReactivated = num(pb.reactivated ?? src?.reactivated ?? wb.reactivated);
    const fallbackLapsed = num(pb.lapsedTouches ?? src?.lapsedTouches ?? wb.lapsedTouches);
    const hasNewEcon = Boolean(e && e.newClient.firstSpend > 0);
    const hasRenEcon = Boolean(e && e.renewal.ticket > 0);
    const hasReactEcon = Boolean(e && e.reactivation.ticket > 0);
    return {
      month,
      target,
      approved: t?.approved_target !== null && t?.approved_target !== undefined,
      planApproved: plan?.status === 'approved',
      lastYear: num(t?.historical_revenue || e?.benchmark?.prior2026Revenue),
      actual: num(detail.actuals.find((x: any) => x.month === month)?.revenue),
      newClient,
      renewal,
      reactivation,
      other,
      leads: hasNewEcon && e.newClient.leads > 0 ? e.newClient.leads : fallbackLeads,
      trials: hasNewEcon && e.newClient.trials > 0 ? e.newClient.trials : fallbackTrials,
      buyers: hasNewEcon && e.newClient.buyers > 0 ? e.newClient.buyers : fallbackBuyers,
      transactions: num(t?.target_transactions),
      renewalsDue: e && e.renewal.projectedExpiries > 0 ? e.renewal.projectedExpiries : fallbackRenDue,
      renewalPurchases: hasRenEcon && e.renewal.renewersNeeded > 0 ? e.renewal.renewersNeeded : fallbackRenPurchases,
      reactivated: hasReactEcon && e.reactivation.needed > 0 ? e.reactivation.needed : fallbackReactivated,
      lapsedTouches: e && e.reactivation.lapsedPool > 0 ? e.reactivation.lapsedPool : fallbackLapsed,
      objective,
      leadOffer,
      theme: plan?.theme || detail.themes?.[month] || MONTH_THEMES[i],
      renewalTarget: e?.renewal.target ?? renewal,
      expectedRenewal: e?.renewal.expected || 0,
      renewalGap: e?.renewal.gap || 0,
      projectedExpiries: e?.renewal.projectedExpiries || fallbackRenDue,
      bookedExpiries: e?.renewal.bookedExpiries || 0,
      feasibility: e?.benchmark?.feasibility || 'balanced',
      stretchPct: e?.benchmark?.stretchPct ?? 0,
      bottleneck: e?.benchmark?.bottleneck || null,
      clients2026: e?.benchmark?.prior2026Clients || 0,
      newClients2026: e?.benchmark?.prior2026NewClients || 0,
      byStudio: [{ id: studio.id, name: studio.name, target, leadOffer, objective }],
    };
  });
}

function combine(rows: MonthRow[][]): MonthRow[] {
  return Array.from({ length: 12 }, (_, i) =>
    rows
      .map(r => r[i])
      .reduce((sum, r) => {
        const nextLastYear = sum.lastYear + r.lastYear;
        const nextTarget = sum.target + r.target;
        const worstFeasibility: MonthRow['feasibility'] =
          sum.feasibility === 'stretch' || r.feasibility === 'stretch'
            ? 'stretch'
            : sum.feasibility === 'balanced' || r.feasibility === 'balanced'
              ? 'balanced'
              : 'comfortable';
        return {
          ...sum,
          target: nextTarget,
          approved: sum.approved && r.approved,
          planApproved: sum.planApproved && r.planApproved,
          lastYear: nextLastYear,
          actual: sum.actual + r.actual,
          newClient: sum.newClient + r.newClient,
          renewal: sum.renewal + r.renewal,
          reactivation: sum.reactivation + r.reactivation,
          other: sum.other + r.other,
          leads: sum.leads + r.leads,
          trials: sum.trials + r.trials,
          buyers: sum.buyers + r.buyers,
          transactions: sum.transactions + r.transactions,
          renewalsDue: sum.renewalsDue + r.renewalsDue,
          renewalPurchases: sum.renewalPurchases + r.renewalPurchases,
          reactivated: sum.reactivated + r.reactivated,
          lapsedTouches: sum.lapsedTouches + r.lapsedTouches,
          renewalTarget: sum.renewalTarget + r.renewalTarget,
          expectedRenewal: sum.expectedRenewal + r.expectedRenewal,
          renewalGap: sum.renewalGap + r.renewalGap,
          projectedExpiries: sum.projectedExpiries + r.projectedExpiries,
          bookedExpiries: sum.bookedExpiries + r.bookedExpiries,
          feasibility: worstFeasibility,
          stretchPct: nextLastYear > 0 ? Math.round(((nextTarget - nextLastYear) / nextLastYear) * 100) : sum.stretchPct,
          bottleneck: sum.bottleneck || r.bottleneck,
          clients2026: sum.clients2026 + r.clients2026,
          newClients2026: sum.newClients2026 + r.newClients2026,
          byStudio: [...sum.byStudio, ...r.byStudio],
        };
      }),
  );
}

// The offers API pages at 100 rows; busy studios have more than that in a year.
async function allOffers(id: number, year: number) {
  const first = await api<any>(`/offers?studio=${id}&year=${year}&limit=100`);
  const more = await Promise.all(
    Array.from({ length: Math.ceil(first.total / 100) - 1 }, (_, i) =>
      api<any>(`/offers?studio=${id}&year=${year}&limit=100&page=${i + 2}`),
    ),
  );
  return { rows: [first, ...more].flatMap(p => p.rows) };
}

async function offersFor(ids: number[], year: number) {
  const pages = await Promise.all(ids.map(id => allOffers(id, year)));
  const seen = new Set<number>();
  return pages.flatMap(p => p.rows).filter((o: any) => o.studio_id && !seen.has(o.id) && seen.add(o.id));
}

export function usePlanData() {
  const { boot, studioId, year } = useApp();
  const locations = planningLocations(boot.studios);
  const scope = studioId ? boot.studios.filter(s => s.id === studioId) : locations;
  return useLoad<PlanData>(async () => {
    const [details, economics] = await Promise.all([
      Promise.all(scope.map(s => api<any>(`/studio-plans/${s.id}?year=${year}`))),
      Promise.all(scope.map(s => api<Economics>(`/studio-plans/${s.id}/economics?year=${year}`))),
    ]);
    const plans = scope.map((studio, i) => {
      const months = monthRows(studio, details[i], economics[i]);
      return {
        studio,
        detail: details[i],
        economics: economics[i],
        months,
        annual: months.reduce((n, m) => n + m.target, 0),
        lastYear: months.reduce((n, m) => n + m.lastYear, 0),
      };
    });
    const ids = scope.flatMap(s => locationStudioIds(s, boot.studios));
    const [offers, campaigns] = await Promise.all([
      offersFor(ids, year),
      Promise.all(ids.map(id => api<any>(`/campaigns?year=${year}&studio=${id}`))).then(r => r.flatMap(x => x.rows)),
    ]);
    const months = plans.length === 1 ? plans[0].months : combine(plans.map(p => p.months));
    return {
      scope,
      plans,
      months,
      annual: plans.reduce((n, p) => n + p.annual, 0),
      lastYear: plans.reduce((n, p) => n + p.lastYear, 0),
      offers,
      campaigns,
      activations: plans.flatMap(p => (p.detail.activations || []).map((a: any) => ({ ...a, studio: p.studio.name }))),
    };
  }, [studioId, year, boot.studios.length]);
}
