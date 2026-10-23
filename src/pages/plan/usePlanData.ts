import { api } from '../../api';
import { useApp } from '../../App';
import { useLoad } from '../../hooks';
import { locationStudioIds, planningLocations } from '../../data/locations';
import { MONTH_ACTIVATIONS, MONTH_THEMES, studioPlaybook } from '../../data/planDefaults';
import type { Studio } from '../../types';

export interface MonthRow {
  month: number;
  target: number;
  approved: boolean;
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
  byStudio: Array<{ id: number; name: string; target: number; leadOffer: string; objective: string }>;
}
export interface StudioPlan {
  studio: Studio;
  detail: any;
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

function monthRows(studio: Studio, detail: any): MonthRow[] {
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
    const leadOffer = pb.leadOffer || src?.offer || plan?.theme || detail.themes?.[month] || MONTH_ACTIVATIONS[i];
    const objective = pb.objective || src?.objective || plan?.objective || MONTH_THEMES[i];
    return {
      month,
      target,
      approved: t?.approved_target !== null && t?.approved_target !== undefined,
      lastYear: num(t?.historical_revenue),
      actual: num(detail.actuals.find((x: any) => x.month === month)?.revenue),
      newClient: num(t?.new_client_target) * scale,
      renewal: num(t?.renewal_target) * scale,
      reactivation: num(t?.reactivation_target) * scale,
      other: (num(t?.other_target) + num(t?.repeat_target)) * scale,
      leads: num(f.requiredLeads ?? wb.leads),
      trials: num(f.requiredCompletedTrials ?? wb.trials),
      buyers: num(f.requiredNewBuyers ?? wb.newPaying),
      transactions: num(t?.target_transactions),
      renewalsDue: num(pb.renewalsDue ?? src?.renewalsDue),
      renewalPurchases: num(pb.renewalPurchases ?? src?.renewalPurchases ?? wb.existingPaying),
      reactivated: num(pb.reactivated ?? src?.reactivated),
      lapsedTouches: num(pb.lapsedTouches ?? src?.lapsedTouches),
      objective,
      leadOffer,
      theme: plan?.theme || detail.themes?.[month] || MONTH_THEMES[i],
      byStudio: [{ id: studio.id, name: studio.name, target, leadOffer, objective }],
    };
  });
}

function combine(rows: MonthRow[][]): MonthRow[] {
  return Array.from({ length: 12 }, (_, i) =>
    rows
      .map(r => r[i])
      .reduce((sum, r) => ({
        ...sum,
        target: sum.target + r.target,
        approved: sum.approved && r.approved,
        lastYear: sum.lastYear + r.lastYear,
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
        byStudio: [...sum.byStudio, ...r.byStudio],
      })),
  );
}

async function offersFor(ids: number[], year: number) {
  const pages = await Promise.all(ids.map(id => api<any>(`/offers?studio=${id}&year=${year}&limit=100`)));
  const seen = new Set<number>();
  return pages.flatMap(p => p.rows).filter((o: any) => o.studio_id && !seen.has(o.id) && seen.add(o.id));
}

export function usePlanData() {
  const { boot, studioId, year } = useApp();
  const locations = planningLocations(boot.studios);
  const scope = studioId ? boot.studios.filter(s => s.id === studioId) : locations;
  return useLoad<PlanData>(async () => {
    const details = await Promise.all(scope.map(s => api<any>(`/studio-plans/${s.id}?year=${year}`)));
    const plans = scope.map((studio, i) => {
      const months = monthRows(studio, details[i]);
      return {
        studio,
        detail: details[i],
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
