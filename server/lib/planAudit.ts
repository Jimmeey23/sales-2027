// Deterministic plan audit: the discrepancies that can be proven from the data, found before
// the copilot reasons about them. Claude gets these as facts, so its review starts from real
// gaps instead of guessing, and the findings stay reproducible.
import { db } from '../db.js';

export type Severity = 'critical' | 'warn' | 'info';
export interface AuditFinding {
  severity: Severity;
  month: number | null;
  area: 'target' | 'offers' | 'pricing' | 'dates' | 'plan' | 'coverage';
  title: string;
  detail: string;
  offerId?: number;
  offerName?: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const L = (v: number) => `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
const json = (v: any, d: any) => {
  if (v == null) return d;
  if (typeof v === 'object') return v;
  try {
    return JSON.parse(v);
  } catch {
    return d;
  }
};
const num = (v: any) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export function monthOfferIds(studioId: number, year: number, month: number): number[] {
  const plan = db.prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=?').get(studioId, year, month) as any;
  const ids = new Set<number>();
  for (const v of Object.values(json(plan?.slots, {}) || {})) if (Number(v) > 0) ids.add(Number(v));
  for (const v of json(plan?.offer_ids, []) || []) if (Number(v) > 0) ids.add(Number(v));
  if (!ids.size)
    for (const r of db.prepare('SELECT id FROM offers WHERE studio_id=? AND year=? AND month=?').all(studioId, year, month) as any[])
      ids.add(r.id);
  return [...ids];
}

export function auditYear(studioId: number, year: number): { studio: string; findings: AuditFinding[]; summary: any } {
  const studio = db.prepare('SELECT name, max_discount_percent FROM studios WHERE id=?').get(studioId) as any;
  const cap = num(studio?.max_discount_percent) ?? 50;
  const findings: AuditFinding[] = [];
  const nameSeen = new Map<string, number[]>();
  let yearTarget = 0;
  let yearOffers = 0;

  for (let m = 1; m <= 12; m++) {
    const label = MONTHS[m - 1];
    const plan = db.prepare('SELECT * FROM monthly_plans WHERE studio_id=? AND year=? AND month=?').get(studioId, year, m) as any;
    const t = db
      .prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? AND month=? ORDER BY id DESC LIMIT 1')
      .get(studioId, year, m) as any;
    const target = num(t?.approved_target) ?? num(t?.proposed_target) ?? 0;
    yearTarget += target;
    const ids = monthOfferIds(studioId, year, m);
    const offers = ids.length
      ? (db.prepare(`SELECT * FROM offers WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as any[])
      : [];

    if (!target) findings.push({ severity: 'warn', month: m, area: 'target', title: `${label} has no revenue target`, detail: 'Offers cannot be judged against a target that is not set.' });
    if (!offers.length) {
      findings.push({ severity: target ? 'critical' : 'warn', month: m, area: 'offers', title: `${label} has no offers`, detail: target ? `${L(target)} target with nothing planned to carry it.` : 'No offers planned.' });
      continue;
    }

    // Coverage: offer revenue against target.
    const revenue = offers.reduce((s, o) => s + (num(o.expected_revenue) ?? (num(o.target_purchases) ?? 0) * (num(o.expected_asp) ?? 0)), 0);
    yearOffers += revenue;
    if (target > 0) {
      const share = revenue / target;
      if (share < 0.5)
        findings.push({ severity: 'critical', month: m, area: 'coverage', title: `${label} offers carry only ${Math.round(share * 100)}% of target`, detail: `${L(revenue)} planned against ${L(target)}; ${L(target - revenue)} has no offer behind it.` });
      else if (share < 0.75)
        findings.push({ severity: 'warn', month: m, area: 'coverage', title: `${label} offers carry ${Math.round(share * 100)}% of target`, detail: `${L(target - revenue)} short of ${L(target)}.` });
      else if (share > 1.4)
        findings.push({ severity: 'warn', month: m, area: 'coverage', title: `${label} offers forecast ${Math.round(share * 100)}% of target`, detail: `${L(revenue)} against ${L(target)} — either the target is low or the forecasts are optimistic.` });
    }

    // Stream mix: a month needs something for new clients and for renewals.
    const objectives = new Set(offers.map(o => String(o.objective || '').toLowerCase()));
    const slots = new Set(offers.map(o => String(o.plan_slot || '')));
    const hasNew = objectives.has('new_client') || slots.has('newcomer');
    const hasRenew = objectives.has('renewal') || objectives.has('retention') || slots.has('renewal');
    const hasBack = objectives.has('reactivation') || slots.has('lapsed');
    if (!hasNew) findings.push({ severity: 'warn', month: m, area: 'offers', title: `${label} has no new-client offer`, detail: 'Nothing in the month is built to convert trials or first-timers.' });
    if (!hasRenew && num(t?.renewal_target)) findings.push({ severity: 'warn', month: m, area: 'offers', title: `${label} has no renewal offer`, detail: `Renewal target is ${L(Number(t.renewal_target))} but no offer serves renewing members.` });
    if (!hasBack && num(t?.reactivation_target)) findings.push({ severity: 'info', month: m, area: 'offers', title: `${label} has no win-back offer`, detail: `Reactivation target ${L(Number(t.reactivation_target))} with no lapsed-client offer.` });

    const monthStart = `${year}-${String(m).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(m).padStart(2, '0')}-${new Date(year, m, 0).getDate()}`;
    for (const o of offers) {
      const base = { month: m, offerId: o.id, offerName: o.name };
      const prov = json(o.provenance, {});
      const disc = num(prov.pricing?.discount);
      const eff = num(o.effective_discount);
      const key = String(o.name || '').trim().toLowerCase();
      nameSeen.set(key, [...(nameSeen.get(key) || []), m]);
      if (!num(o.expected_asp)) findings.push({ ...base, severity: 'critical', area: 'pricing', title: `“${o.name}” has no price`, detail: 'No selling price, so its revenue cannot be forecast.' });
      if (!num(o.target_purchases)) findings.push({ ...base, severity: 'warn', area: 'offers', title: `“${o.name}” has no buyer target`, detail: 'No planned buyers, so it contributes nothing to the month.' });
      if (disc != null && disc * 100 > cap + 0.01) findings.push({ ...base, severity: 'critical', area: 'pricing', title: `“${o.name}” discount ${Math.round(disc * 100)}% exceeds the ${cap}% cap`, detail: 'Above studio policy.' });
      if (eff != null && eff > cap + 5) findings.push({ ...base, severity: 'warn', area: 'pricing', title: `“${o.name}” effective discount ${Math.round(eff)}%`, detail: `Cash plus perks give away more than the ${cap}% cap.` });
      if (!String(o.redemption_conditions || '').trim()) findings.push({ ...base, severity: 'warn', area: 'offers', title: `“${o.name}” has no conditions`, detail: 'No terms: stacking, eligibility and one-per-client are open — a loophole at the desk.' });
      if (!o.validity_start || !o.validity_end) findings.push({ ...base, severity: 'info', area: 'dates', title: `“${o.name}” has no validity window`, detail: 'Without dates the offer can be redeemed indefinitely.' });
      else {
        if (o.validity_end < o.validity_start) findings.push({ ...base, severity: 'critical', area: 'dates', title: `“${o.name}” ends before it starts`, detail: `${o.validity_start} → ${o.validity_end}.` });
        if (o.validity_start > monthEnd || o.validity_end < monthStart) findings.push({ ...base, severity: 'warn', area: 'dates', title: `“${o.name}” runs outside ${label}`, detail: `${o.validity_start} → ${o.validity_end}, but it is planned in ${label}.` });
      }
      if (!String(o.headline || o.customer_copy || '').trim()) findings.push({ ...base, severity: 'info', area: 'offers', title: `“${o.name}” has no customer-facing copy`, detail: 'Nothing for the desk or ads to say.' });
      if (num(o.month) && Number(o.month) !== m) findings.push({ ...base, severity: 'info', area: 'offers', title: `“${o.name}” is filed under ${MONTHS[Number(o.month) - 1]}`, detail: `It is planned in ${label}.` });
    }

    // Plan text that names offers not in the month.
    const text = `${plan?.notes || ''} ${plan?.objective || ''} ${plan?.strategy || ''}`;
    const quoted = [...text.matchAll(/[“"']([A-Z][^“”"']{3,60})[”"']/g)].map(x => x[1].trim());
    const names = offers.map(o => String(o.name).toLowerCase());
    for (const q of new Set(quoted))
      if (q.split(' ').length <= 7 && !names.some(nm => nm.includes(q.toLowerCase()) || q.toLowerCase().includes(nm)))
        findings.push({ severity: 'info', month: m, area: 'plan', title: `${label} plan mentions “${q}”`, detail: 'Named in the plan text but not among the month’s offers.' });
    if (!plan?.theme) findings.push({ severity: 'info', month: m, area: 'plan', title: `${label} has no theme`, detail: 'No campaign idea to hang the month on.' });
  }

  for (const [name, months] of nameSeen)
    if (name && months.length > 2)
      findings.push({ severity: 'info', month: null, area: 'offers', title: `“${name}” runs in ${months.length} months`, detail: `Repeated in ${months.map(m => MONTHS[m - 1].slice(0, 3)).join(', ')} — clients learn to wait for it.` });

  const order = { critical: 0, warn: 1, info: 2 } as const;
  findings.sort((a, b) => order[a.severity] - order[b.severity] || (a.month ?? 13) - (b.month ?? 13));
  return {
    studio: studio?.name || `Studio ${studioId}`,
    findings,
    summary: {
      yearTarget,
      yearOfferRevenue: yearOffers,
      coverage: yearTarget ? yearOffers / yearTarget : null,
      critical: findings.filter(f => f.severity === 'critical').length,
      warn: findings.filter(f => f.severity === 'warn').length,
      info: findings.filter(f => f.severity === 'info').length,
    },
  };
}
