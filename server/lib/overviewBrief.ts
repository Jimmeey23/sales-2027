import { db } from '../db.js';
import { studioScopeIds } from './studios.js';
import { targetBreakdown } from './targetBreakdown.js';

// The 2026 full-year figure is the same one the Targets breakdown compares 2027 against
// (complete months actual, the rest estimated), so Overview and Plan never disagree.
function breakdown2026(id: number) {
  const b = targetBreakdown(id, 2027);
  return b ? b.total.lastYear : null;
}
const PLANNING = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'];

// Pop-up venues roll up into the Pop-up parent; portfolio totals exclude them so nothing double-counts.
const POPUP_CHILDREN = ['Copper + Cloves', 'Plash Pilates'];

type Studio = { id: number; name: string; city: string };

const pct = (a: number, b: number) => (b ? (a / b - 1) * 100 : null);
const share = (a: number, b: number) => (b ? (a / b) * 100 : null);
const placeholders = (ids: number[]) => ids.map(() => '?').join(',');
const crore = (v: number) => `₹${(v / 1e7).toFixed(2)} Cr`;
const lakh = (v: number) => `₹${(v / 1e5).toFixed(1)}L`;
const signed = (v: number | null) => (v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);
// Below this 2025 base a venue is treated as new: YoY and growth-scaled forecasts are not meaningful.
const MIN_COMPARABLE_BASE = 500000;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function periodMetrics(ids: number[], from: string, to: string) {
  const ph = placeholders(ids);
  const t = db
    .prepare(
      `SELECT COALESCE(SUM(amount),0) revenue, COUNT(*) transactions, COUNT(DISTINCT member_ref) clients,
        COALESCE(SUM(is_first_observed),0) new_clients, COALESCE(SUM(discount_amount),0) discount,
        COALESCE(SUM(CASE WHEN revenue_stream='new_client' THEN amount END),0) new_client,
        COALESCE(SUM(CASE WHEN revenue_stream='renewal' THEN amount END),0) renewal,
        COALESCE(SUM(CASE WHEN revenue_stream='reactivation' THEN amount END),0) reactivation,
        COALESCE(SUM(CASE WHEN revenue_stream='additional' THEN amount END),0) additional
       FROM transactions WHERE studio_id IN (${ph}) AND substr(purchased_at,1,10) BETWEEN ? AND ?`,
    )
    .get(...ids, from, to) as any;
  const categories = db
    .prepare(
      `SELECT COALESCE(category,'Other') name, SUM(amount) revenue, COUNT(*) transactions FROM transactions
       WHERE studio_id IN (${ph}) AND substr(purchased_at,1,10) BETWEEN ? AND ? GROUP BY 1 ORDER BY 2 DESC LIMIT 7`,
    )
    .all(...ids, from, to) as any[];
  const fromMonth = from.slice(0, 7),
    toMonth = to.slice(0, 7);
  const c = db
    .prepare(
      `SELECT COUNT(*) bookings, COALESCE(SUM(checked_in),0) checked_in, COALESCE(SUM(late_cancelled),0) late
       FROM checkins WHERE studio_id IN (${ph}) AND month BETWEEN ? AND ?`,
    )
    .get(...ids, fromMonth, toMonth) as any;
  const leads = (
    db
      .prepare(`SELECT COUNT(*) n FROM leads WHERE studio_id IN (${ph}) AND month BETWEEN ? AND ?`)
      .get(...ids, fromMonth, toMonth) as any
  ).n;
  const v = db
    .prepare(
      `SELECT COUNT(*) visits, SUM(CASE WHEN first_purchase_at IS NOT NULL AND first_purchase_at<>'' THEN 1 ELSE 0 END) converted
       FROM member_visits WHERE studio_id IN (${ph}) AND month BETWEEN ? AND ?`,
    )
    .get(...ids, fromMonth, toMonth) as any;
  const revenue = Number(t.revenue);
  return {
    revenue,
    transactions: Number(t.transactions),
    clients: Number(t.clients),
    newClients: Number(t.new_clients),
    aov: t.transactions ? revenue / t.transactions : null,
    revenuePerClient: t.clients ? revenue / t.clients : null,
    discountRate: share(Number(t.discount), revenue + Number(t.discount)),
    streams: {
      newClient: Number(t.new_client),
      renewal: Number(t.renewal),
      reactivation: Number(t.reactivation),
      additional: Number(t.additional),
    },
    categories: categories.map(r => ({
      name: r.name,
      revenue: Number(r.revenue),
      transactions: Number(r.transactions),
    })),
    bookings: Number(c.bookings),
    checkins: Number(c.checked_in),
    checkinRate: share(Number(c.checked_in), Number(c.bookings)),
    lateCancelRate: share(Number(c.late), Number(c.bookings)),
    leads: Number(leads),
    firstVisits: Number(v.visits),
    visitConversion: share(Number(v.converted || 0), Number(v.visits)),
  };
}

function monthlyRevenue(ids: number[], year: number) {
  const rows = db
    .prepare(
      `SELECT CAST(substr(month,6,2) AS INTEGER) m, SUM(amount) revenue, SUM(is_first_observed) new_clients, COUNT(*) tx
       FROM transactions WHERE studio_id IN (${placeholders(ids)}) AND substr(month,1,4)=? GROUP BY 1`,
    )
    .all(...ids, String(year)) as any[];
  const map = new Map(rows.map(r => [r.m, r]));
  return Array.from({ length: 12 }, (_, i) => {
    const r = map.get(i + 1);
    return r ? { revenue: Number(r.revenue), newClients: Number(r.new_clients), transactions: Number(r.tx) } : null;
  });
}

function revenueBetween(ids: number[], from: string, to: string) {
  return Number(
    (
      db
        .prepare(
          `SELECT COALESCE(SUM(amount),0) v FROM transactions WHERE studio_id IN (${placeholders(ids)})
           AND substr(purchased_at,1,10) BETWEEN ? AND ?`,
        )
        .get(...ids, from, to) as any
    ).v,
  );
}

export function overviewBrief(studioId: number | null) {
  const allStudios = db.prepare('SELECT id, name, city FROM studios WHERE active=1 ORDER BY id').all() as Studio[];
  const scopeIds = studioId ? studioScopeIds(db, studioId) : allStudios.map(s => s.id);
  // Portfolio rows: top-level studios only (children roll into Pop-up).
  const rowStudios = studioId
    ? allStudios.filter(s => s.id === studioId)
    : allStudios.filter(s => !POPUP_CHILDREN.includes(s.name));
  const targetIds = studioId ? [studioId] : allStudios.filter(s => !POPUP_CHILDREN.includes(s.name)).map(s => s.id);

  const lastSale =
    (
      db
        .prepare(
          `SELECT MAX(substr(purchased_at,1,10)) d FROM transactions WHERE studio_id IN (${placeholders(scopeIds)})`,
        )
        .get(...scopeIds) as any
    ).d || '2026-10-22';
  const cutoff26 = lastSale.startsWith('2026') ? lastSale : '2026-12-31';
  const cutoff25 = `2025${cutoff26.slice(4)}`;
  const cutoffMonth = Number(cutoff26.slice(5, 7));
  const cutoffDay = Number(cutoff26.slice(8, 10));
  const dayOfYear = Math.round((Date.parse(`${cutoff26}T00:00:00Z`) - Date.parse('2026-01-01T00:00:00Z')) / 864e5) + 1;

  const full2025 = periodMetrics(scopeIds, '2025-01-01', '2025-12-31');
  const ytd2025 = periodMetrics(scopeIds, '2025-01-01', cutoff25);
  const ytd2026 = periodMetrics(scopeIds, '2026-01-01', cutoff26);
  const ytdGrowth = ytd2025.revenue >= MIN_COMPARABLE_BASE ? pct(ytd2026.revenue, ytd2025.revenue) : null;

  // Remainder of 2026 = 2025's same remaining days scaled by the YTD growth rate.
  const next = new Date(`${cutoff25}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const restFrom2025 = next.toISOString().slice(0, 10);
  const rest2025 = revenueBetween(scopeIds, restFrom2025, '2025-12-31');
  const forecast = (ytd26: number, ytd25: number, rest25: number) =>
    ytd25 < MIN_COMPARABLE_BASE ? (ytd26 / dayOfYear) * 365 : ytd26 + rest25 * (ytd26 / ytd25);
  const planningIds = PLANNING.map(n => (db.prepare('SELECT id FROM studios WHERE name=?').get(n) as any)?.id).filter(
    Boolean,
  ) as number[];
  const scoped2026 = studioId
    ? breakdown2026(studioId)
    : planningIds.map(breakdown2026).every(v => v !== null)
      ? planningIds.reduce((a, id) => a + (breakdown2026(id) || 0), 0)
      : null;
  const forecast2026 = scoped2026 ?? forecast(ytd2026.revenue, ytd2025.revenue, rest2025);

  const m25 = monthlyRevenue(scopeIds, 2025);
  const m26 = monthlyRevenue(scopeIds, 2026);

  const targets = db
    .prepare(
      `SELECT studio_id, year, month, COALESCE(approved_target, proposed_target) target, new_client_target,
        renewal_target, reactivation_target, repeat_target, other_target, target_transactions, funnel
       FROM monthly_targets WHERE studio_id IN (${placeholders(targetIds)}) AND year IN (2026, 2027)`,
    )
    .all(...targetIds) as any[];
  const t27 = targets.filter(t => t.year === 2027);
  const t26 = targets.filter(t => t.year === 2026);
  const sum = (rows: any[], key: string) => rows.reduce((a, r) => a + Number(r[key] || 0), 0);
  const target2027 = sum(t27, 'target');
  const target2026 = sum(t26, 'target');
  const target2026Ytd = t26
    .filter(t => t.month < cutoffMonth || (t.month === cutoffMonth && cutoffDay >= 28))
    .reduce((a, r) => a + Number(r.target || 0), 0);
  const ytd2026Complete = revenueBetween(
    scopeIds,
    '2026-01-01',
    cutoffDay >= 28 ? cutoff26 : `2026-${String(cutoffMonth - 1).padStart(2, '0')}-31`,
  );

  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: MONTH_NAMES[i],
    actual2025: m25[i]?.revenue ?? null,
    actual2026: m26[i]?.revenue ?? null,
    partial2026: i + 1 === cutoffMonth && cutoffDay < 28,
    target2026: t26.filter(t => t.month === i + 1).reduce((a, r) => a + Number(r.target || 0), 0) || null,
    target2027: t27.filter(t => t.month === i + 1).reduce((a, r) => a + Number(r.target || 0), 0) || null,
    newClients2025: m25[i]?.newClients ?? null,
    newClients2026: m26[i]?.newClients ?? null,
  }));

  const studios = rowStudios
    .map(s => {
      const ids = studioScopeIds(db, s.id);
      const f25 = revenueBetween(ids, '2025-01-01', '2025-12-31');
      const y25 = revenueBetween(ids, '2025-01-01', cutoff25);
      const y26 = revenueBetween(ids, '2026-01-01', cutoff26);
      const r25 = revenueBetween(ids, restFrom2025, '2025-12-31');
      const fc26 = breakdown2026(s.id) ?? forecast(y26, y25, r25);
      const tgt = t27.filter(t => t.studio_id === s.id).reduce((a, r) => a + Number(r.target || 0), 0);
      const clients26 = Number(
        (
          db
            .prepare(
              `SELECT COUNT(DISTINCT member_ref) n FROM transactions WHERE studio_id IN (${placeholders(ids)}) AND substr(purchased_at,1,10) BETWEEN '2026-01-01' AND ?`,
            )
            .get(...ids, cutoff26) as any
        ).n,
      );
      return {
        id: s.id,
        name: s.name,
        city: s.city,
        full2025: f25,
        ytd2025: y25,
        ytd2026: y26,
        yoy: y25 >= MIN_COMPARABLE_BASE ? pct(y26, y25) : null,
        isNew: y25 < MIN_COMPARABLE_BASE,
        forecast2026: fc26,
        target2027: tgt,
        growth2027: pct(tgt, fc26),
        clients2026: clients26,
      };
    })
    .filter(s => s.full2025 || s.ytd2026 || s.target2027)
    .sort((a, b) => b.target2027 - a.target2027 || b.ytd2026 - a.ytd2026);

  // ---------- 2027 plan detail ----------
  const streams2027 = {
    newClient: sum(t27, 'new_client_target'),
    renewal: sum(t27, 'renewal_target'),
    reactivation: sum(t27, 'reactivation_target'),
    other: sum(t27, 'repeat_target') + sum(t27, 'other_target'),
  };
  const funnel2027 = t27.reduce(
    (acc, r) => {
      let f: any = {};
      try {
        f = JSON.parse(r.funnel || '{}');
      } catch {
        /* malformed funnel */
      }
      acc.leads += Number(f.requiredLeads || 0);
      acc.trials += Number(f.requiredCompletedTrials || 0);
      acc.buyers += Number(f.requiredNewBuyers || 0);
      return acc;
    },
    { leads: 0, trials: 0, buyers: 0 },
  );
  const quarters = [0, 1, 2, 3].map(q => {
    const rows = t27.filter(t => Math.ceil(t.month / 3) === q + 1);
    const actual25 = m25.slice(q * 3, q * 3 + 3).reduce((a, r) => a + (r?.revenue || 0), 0);
    return {
      quarter: `Q${q + 1}`,
      target: sum(rows, 'target'),
      actual2025: actual25,
      vs2025: pct(sum(rows, 'target'), actual25),
    };
  });

  const themeStudioId = studioId ?? allStudios.find(s => s.name === 'Kemps Corner')?.id ?? allStudios[0]?.id;
  const themes = db
    .prepare(
      'SELECT month, theme, objective, strategy FROM monthly_plans WHERE studio_id=? AND year=2027 ORDER BY month',
    )
    .all(themeStudioId) as any[];
  const offerCounts = db
    .prepare(
      `SELECT month, COUNT(*) n FROM offers WHERE year=2027 ${studioId ? `AND studio_id IN (${placeholders(scopeIds)})` : ''} GROUP BY month`,
    )
    .all(...(studioId ? scopeIds : [])) as any[];
  const offerTypes = db
    .prepare(
      `SELECT offer_type, COUNT(*) n FROM offers WHERE year=2027 ${studioId ? `AND studio_id IN (${placeholders(scopeIds)})` : ''} GROUP BY 1 ORDER BY 2 DESC`,
    )
    .all(...(studioId ? scopeIds : [])) as any[];
  const campaigns = db
    .prepare(
      `SELECT COUNT(*) n, COALESCE(SUM(target_revenue),0) target FROM campaigns WHERE year=2027 ${studioId ? `AND studio_id IN (${placeholders(scopeIds)})` : ''}`,
    )
    .get(...(studioId ? scopeIds : [])) as any;
  const playbook = db
    .prepare(
      `SELECT section, title, body FROM studio_playbook_items WHERE studio_id=? AND year=2027 AND enabled=1 ORDER BY section, sort`,
    )
    .all(themeStudioId) as any[];

  const monthPlan = monthly.map(m => {
    const theme = themes.find(t => t.month === m.month);
    return {
      month: m.month,
      label: m.label,
      target: m.target2027,
      actual2025: m.actual2025,
      forecastBase2026: m.actual2026 && !m.partial2026 ? m.actual2026 : null,
      theme: theme?.theme ?? null,
      objective: theme?.objective ?? null,
      offers: Number(offerCounts.find(o => o.month === m.month)?.n || 0),
    };
  });

  // ---------- findings ----------
  const findings: Array<{ tone: 'positive' | 'negative' | 'neutral'; title: string; detail: string }> = [];
  findings.push({
    tone: (ytdGrowth ?? 0) >= 0 ? 'positive' : 'negative',
    title: `2026 revenue is ${signed(ytdGrowth)} vs the same period of 2025`,
    detail: `${crore(ytd2026.revenue)} collected 1 Jan – ${cutoff26.slice(8)} ${MONTH_NAMES[cutoffMonth - 1]} 2026 against ${crore(ytd2025.revenue)} in the same window of 2025. Full-year 2026 is tracking to about ${crore(forecast2026)} vs ${crore(full2025.revenue)} in 2025.`,
  });
  if (target2026Ytd) {
    const att = share(ytd2026Complete, target2026Ytd);
    findings.push({
      tone: (att ?? 0) >= 95 ? 'positive' : 'negative',
      title: `2026 plan attainment: ${att?.toFixed(0)}% on completed months`,
      detail: `${crore(ytd2026Complete)} actual vs ${crore(target2026Ytd)} targeted for completed months. Full 2026 target was ${crore(target2026)}; forecast lands ${crore(Math.abs(target2026 - forecast2026))} ${forecast2026 < target2026 ? 'short' : 'above'}.`,
    });
  }
  const ncDelta = pct(ytd2026.streams.newClient, ytd2025.streams.newClient);
  const newClientsDelta = pct(ytd2026.newClients, ytd2025.newClients);
  findings.push({
    tone: (ncDelta ?? 0) >= 0 ? 'positive' : 'negative',
    title: `New-client revenue ${signed(ncDelta)} YoY; first-time buyers ${signed(newClientsDelta)}`,
    detail: `${lakh(ytd2026.streams.newClient)} from ${ytd2026.newClients.toLocaleString('en-IN')} first-time buyers in 2026 YTD vs ${lakh(ytd2025.streams.newClient)} from ${ytd2025.newClients.toLocaleString('en-IN')} in 2025. First-purchase value ₹${Math.round(ytd2026.streams.newClient / (ytd2026.newClients || 1)).toLocaleString('en-IN')} vs ₹${Math.round(ytd2025.streams.newClient / (ytd2025.newClients || 1)).toLocaleString('en-IN')}${(ncDelta ?? 0) < 0 && (newClientsDelta ?? 0) > 0 ? ' — more newcomers, but entering on cheaper intro products and converting to smaller first commitments.' : '.'}`,
  });
  const discDelta = (ytd2026.discountRate ?? 0) - (ytd2025.discountRate ?? 0);
  findings.push({
    tone: discDelta > 1 ? 'negative' : 'positive',
    title: `Discount rate ${ytd2026.discountRate?.toFixed(1)}% in 2026 vs ${ytd2025.discountRate?.toFixed(1)}% in 2025`,
    detail: `${discDelta >= 0 ? 'Up' : 'Down'} ${Math.abs(discDelta).toFixed(1)} pts. Average transaction ₹${Math.round(ytd2026.aov || 0).toLocaleString('en-IN')} vs ₹${Math.round(ytd2025.aov || 0).toLocaleString('en-IN')} (${signed(pct(ytd2026.aov || 0, ytd2025.aov || 0))}). ${(ytd2026.aov || 0) < (ytd2025.aov || 0) ? 'Deeper discounting has not bought a bigger ticket. ' : ''}2027 caps campaign discounts at 15–20% and steers buyers to 3M+ commitments.`,
  });
  const renewShare26 = share(ytd2026.streams.renewal, ytd2026.revenue);
  findings.push({
    tone: 'neutral',
    title: `Renewals carry the business: ${renewShare26?.toFixed(0)}% of 2026 revenue`,
    detail: `Renewal revenue ${crore(ytd2026.streams.renewal)} (${signed(pct(ytd2026.streams.renewal, ytd2025.streams.renewal))} YoY). Reactivation ${lakh(ytd2026.streams.reactivation)} (${signed(pct(ytd2026.streams.reactivation, ytd2025.streams.reactivation))}); additional purchases ${lakh(ytd2026.streams.additional)} (${signed(pct(ytd2026.streams.additional, ytd2025.streams.additional))}).`,
  });
  findings.push({
    tone: (pct(ytd2026.clients, ytd2025.clients) ?? 0) >= 0 ? 'positive' : 'negative',
    title: `${ytd2026.clients.toLocaleString('en-IN')} paying clients in 2026 YTD (${signed(pct(ytd2026.clients, ytd2025.clients))})`,
    detail: `vs ${ytd2025.clients.toLocaleString('en-IN')} in the same 2025 window. Revenue per client ₹${Math.round(ytd2026.revenuePerClient || 0).toLocaleString('en-IN')} (${signed(pct(ytd2026.revenuePerClient || 0, ytd2025.revenuePerClient || 0))}); ${ytd2026.transactions.toLocaleString('en-IN')} transactions (${signed(pct(ytd2026.transactions, ytd2025.transactions))}).`,
  });
  if (ytd2026.bookings) {
    findings.push({
      tone: (ytd2026.lateCancelRate ?? 0) > (ytd2025.lateCancelRate ?? 0) ? 'negative' : 'positive',
      title: `Attendance: ${ytd2026.checkinRate?.toFixed(1)}% check-in, ${ytd2026.lateCancelRate?.toFixed(1)}% late cancels`,
      detail: `${ytd2026.checkins.toLocaleString('en-IN')} check-ins from ${ytd2026.bookings.toLocaleString('en-IN')} bookings in 2026 YTD (2025 same period: ${ytd2025.checkinRate?.toFixed(1)}% check-in, ${ytd2025.lateCancelRate?.toFixed(1)}% late cancel).`,
    });
  }
  const growers = studios.filter(s => s.yoy !== null).sort((a, b) => (b.yoy ?? 0) - (a.yoy ?? 0));
  if (growers.length > 1) {
    const best = growers[0],
      worst = growers[growers.length - 1];
    findings.push({
      tone: 'neutral',
      title: `Studio spread: ${best.name} ${signed(best.yoy)}, ${worst.name} ${signed(worst.yoy)}`,
      detail: growers.map(s => `${s.name} ${signed(s.yoy)} (${lakh(s.ytd2026)})`).join(' · '),
    });
  }
  const peak25 = m25.reduce((b, r, i) => ((r?.revenue || 0) > (m25[b]?.revenue || 0) ? i : b), 0);
  const trough25 = m25.reduce((b, r, i) => (r && r.revenue < (m25[b]?.revenue ?? Infinity) ? i : b), 0);
  findings.push({
    tone: 'neutral',
    title: `Seasonality: ${MONTH_NAMES[peak25]} peaks, ${MONTH_NAMES[trough25]} troughs`,
    detail: `2025 peak ${MONTH_NAMES[peak25]} at ${lakh(m25[peak25]?.revenue || 0)} vs trough ${MONTH_NAMES[trough25]} at ${lakh(m25[trough25]?.revenue || 0)} — a ${((m25[peak25]?.revenue || 0) / (m25[trough25]?.revenue || 1)).toFixed(1)}× swing. The 2027 calendar loads anniversary (Apr) and festive (Oct–Nov) to exploit it.`,
  });
  const topCat = ytd2026.categories[0];
  if (topCat)
    findings.push({
      tone: 'neutral',
      title: `${topCat.name} drive ${share(topCat.revenue, ytd2026.revenue)?.toFixed(0)}% of 2026 revenue`,
      detail: ytd2026.categories
        .slice(0, 5)
        .map(c => `${c.name} ${lakh(c.revenue)} (${share(c.revenue, ytd2026.revenue)?.toFixed(0)}%)`)
        .join(' · '),
    });

  const growthVsForecast = pct(target2027, forecast2026);
  const plan = {
    target: target2027,
    target2026,
    growthVsForecast2026: growthVsForecast,
    growthVs2025: pct(target2027, full2025.revenue),
    incremental: target2027 - forecast2026,
    monthlyAverage: target2027 / 12,
    streams: streams2027,
    transactions: sum(t27, 'target_transactions'),
    funnel: funnel2027,
    quarters,
    months: monthPlan,
    offerTotal: offerCounts.reduce((a, o) => a + Number(o.n), 0),
    offerTypes: offerTypes.map(o => ({ type: o.offer_type, count: Number(o.n) })),
    campaigns: { count: Number(campaigns.n), target: Number(campaigns.target) },
    alwaysOn: playbook.filter(p => p.section === 'always_on').map(p => ({ title: p.title, body: p.body })),
    recovery: playbook.filter(p => p.section === 'recovery').map(p => ({ title: p.title, body: p.body })),
    themeSource: allStudios.find(s => s.id === themeStudioId)?.name ?? null,
    bridge: [
      { label: '2026 forecast', value: forecast2026 },
      { label: 'Plan uplift', value: target2027 - forecast2026 },
      { label: '2027 target', value: target2027 },
    ],
  };

  return {
    scope: studioId ? allStudios.find(s => s.id === studioId)?.name : 'All studios',
    asOf: cutoff26,
    window: { from2026: '2026-01-01', to2026: cutoff26, from2025: '2025-01-01', to2025: cutoff25 },
    full2025,
    ytd2025,
    ytd2026,
    ytdGrowth,
    forecast2026,
    monthly,
    studios,
    findings,
    plan,
    notes: [
      `YTD comparisons use identical calendar windows (1 Jan – ${cutoff26.slice(5)}) in both years.`,
      '2026 full-year forecast = 2026 YTD + remaining 2025 days scaled by the YTD growth rate.',
      'Renewal / reactivation streams are inferred from observed membership timing.',
      'Pop-up totals include Copper + Cloves and Plash Pilates; they are not counted twice.',
    ],
  };
}
