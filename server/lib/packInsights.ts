import fs from 'node:fs';
import { db } from '../db.js';

// Figures from the P57 2027 Sales Plan Pack (1_Insights, 2_Targets), extracted by
// scripts/pack-insights-to-json.py. They are the only source of last-12-month and prior-year
// history while the transactions table is empty, and are always labelled as pack figures.
const file = (n: string) => new URL(`../data/pack-2027/${n}`, import.meta.url);
const cache: Record<string, any> = {};
function load(name: string): any | null {
  if (name in cache) return cache[name];
  try {
    cache[name] = JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch {
    cache[name] = null;
  }
  return cache[name];
}

export const PACK_STUDIOS = ['Kemps Corner', 'Bandra', 'Kenkere House', 'Pop-up'];
const POPUP_VENUES = ['Copper + Cloves', 'Plash Pilates'];

/** App studio id -> the pack studio name it is covered by (pop-up venues roll into Pop-up). */
export function packNameFor(studioId: number): { name: string | null; studioName: string | null } {
  const row = db.prepare('SELECT name FROM studios WHERE id=?').get(studioId) as { name: string } | undefined;
  if (!row) return { name: null, studioName: null };
  const name = POPUP_VENUES.includes(row.name) ? 'Pop-up' : PACK_STUDIOS.includes(row.name) ? row.name : null;
  return { name, studioName: row.name };
}

export function packInsights(names: string[]) {
  const data = load('insights.json');
  if (!data) return null;
  return {
    source: data.source,
    studios: names.filter(n => data.studios[n]).map(n => ({ name: n, ...data.studios[n] })),
  };
}

const num = (s: unknown) => {
  if (typeof s === 'number') return s;
  const m = String(s ?? '').replace(/[₹,\s]/g, '').match(/-?[\d.]+/);
  return m ? Number(m[0]) : null;
};

type Rows = any[][];
const findTable = (doc: any, headFirst: string) => {
  for (const s of doc?.sections || [])
    for (const b of s.blocks)
      if (b.t === 'table' && String(b.head[0]).trim() === headFirst) return b as { head: string[]; rows: string[][] };
  return null;
};
const col = (t: { head: string[] }, startsWith: string) => t.head.findIndex(h => h.startsWith(startsWith));

const STREAM_KEYS: Array<[string, string, string]> = [
  ['newClient', 'New clients', 'New clients'],
  ['renewal', 'Renewals', 'Renewals'],
  ['reactivation', 'Reactivations', 'Reactivations'],
  ['additional', 'Add-ons', 'Add-ons (singles, privates, retail)'],
];

/** Aggregated last-12-month / prior-year / 2027-target history for a set of pack studios. */
export function packHistory(names: string[]) {
  const hist = load('history.json');
  const ins = load('insights.json');
  if (!hist || !ins) return null;
  const have = names.filter(n => hist.studios[n] && ins.studios[n]);
  if (!have.length) return null;

  const monthly = Array.from({ length: 12 }, () => ({ actual: 0, target: 0, prior: 0, priorOk: true }));
  const streams: Record<string, { l12: number; prior: number; target: number; clients: number }> = {};
  STREAM_KEYS.forEach(([k]) => (streams[k] = { l12: 0, prior: 0, target: 0, clients: 0 }));
  const catMap = new Map<string, { l12: number; prior: number }>();
  const h14 = new Map<string, any>();
  const perStudio: any[] = [];
  let l12 = 0,
    prior12 = 0,
    target = 0;
  const funnelXlsx = { leads: 0, firstVisits: 0, newClients: 0, renewalsDue: 0, renewals: 0, winbacks: 0 };

  for (const n of have) {
    const mt: Rows = hist.studios[n]['Monthly Targets'];
    const head = mt.findIndex(r => r[0] === 'Month');
    const hdr = mt[head] as string[];
    const ix = (p: string) => hdr.findIndex(h => String(h).startsWith(p));
    let sL = 0,
      sT = 0;
    for (let i = 0; i < 12; i++) {
      const r = mt[head + 1 + i];
      monthly[i].actual += Number(r[ix('2026 actual')] || 0);
      monthly[i].target += Number(r[ix('2027 target')] || 0);
      sL += Number(r[ix('2026 actual')] || 0);
      sT += Number(r[ix('2027 target')] || 0);
    }
    const total = mt[head + 13] || mt.find(r => String(r[0]).includes('total'));
    if (total) {
      funnelXlsx.leads += Number(total[ix('Leads needed')] || 0);
      funnelXlsx.firstVisits += Number(total[ix('First visits needed')] || 0);
      funnelXlsx.newClients += Number(total[ix('New paying clients')] || 0);
      funnelXlsx.renewals += Number(total[ix('Renewals to sell')] || 0);
      funnelXlsx.renewalsDue += Number(total[ix('Renewals due')] || 0);
      funnelXlsx.winbacks += Number(total[ix('Winbacks')] || 0);
    }

    // Prior-year same-month revenue per calendar month, from the History sheet (14 months).
    const hs: Rows = hist.studios[n]['History'];
    const hh = hs.findIndex(r => r[0] === 'Month');
    const priorByMonth: Record<number, number> = {};
    for (const r of hs.slice(hh + 1)) {
      if (typeof r[0] !== 'string' || !/^\d{4}-\d{2}/.test(r[0])) continue;
      const key = r[0].slice(0, 7);
      const rec = h14.get(key) || { month: key, revenue: 0, prior: 0, payers: 0, priorPayers: 0, paidVisits: 0, visits: 0, leads: 0, firstVisits: 0 };
      rec.revenue += Number(r[1] || 0);
      rec.prior += Number(r[2] || 0);
      rec.payers += Number(r[4] || 0);
      rec.priorPayers += Number(r[5] || 0);
      rec.paidVisits += Number(r[6] || 0);
      rec.visits += Number(r[7] || 0);
      rec.leads += Number(r[8] || 0);
      rec.firstVisits += Number(r[9] || 0);
      h14.set(key, rec);
      // The row inside the Nov-25..Oct-26 window for this calendar month carries its prior year.
      const y = Number(key.slice(0, 4)),
        m = Number(key.slice(5, 7));
      if ((m <= 10 && y === 2026) || (m >= 11 && y === 2025)) priorByMonth[m] = Number(r[2] || 0);
    }
    for (let m = 1; m <= 12; m++) {
      if (priorByMonth[m] === undefined) monthly[m - 1].priorOk = false;
      else monthly[m - 1].prior += priorByMonth[m];
    }

    const doc = ins.studios[n].insights;
    const st = findTable(doc, 'Revenue stream');
    let sPrior = 0;
    if (st) {
      const c12 = col(st, 'Nov-25'),
        cp = col(st, 'Nov-24'),
        cc = col(st, 'Clients');
      for (const r of st.rows) {
        if (/^total/i.test(r[0])) {
          sPrior = num(r[cp]) || 0;
          continue;
        }
        const key = STREAM_KEYS.find(([, p]) => r[0].startsWith(p));
        if (!key) continue;
        streams[key[0]].l12 += num(r[c12]) || 0;
        streams[key[0]].prior += num(r[cp]) || 0;
        streams[key[0]].clients += num(r[cc]) || 0;
      }
    }
    const ct = findTable(doc, 'Category');
    if (ct) {
      const c12 = col(ct, 'Nov-25'),
        cp = col(ct, 'Nov-24');
      for (const r of ct.rows) {
        if (/^total/i.test(r[0])) continue;
        const e = catMap.get(r[0]) || { l12: 0, prior: 0 };
        e.l12 += num(r[c12]) || 0;
        e.prior += num(r[cp]) || 0;
        catMap.set(r[0], e);
      }
    }
    // 2027 stream targets from the workbook's 'Stream plan for the year' block.
    const sp = mt.findIndex(r => String(r[0]).startsWith('Stream plan'));
    if (sp >= 0)
      for (const r of mt.slice(sp + 2, sp + 8)) {
        const key = STREAM_KEYS.find(([, p]) => String(r[0]).startsWith(p));
        if (key) streams[key[0]].target += Number(r[2] || 0);
      }
    l12 += sL;
    prior12 += sPrior;
    target += sT;
    perStudio.push({ name: n, l12: sL, prior12: sPrior, yoy: sPrior >= 500000 ? (sL / sPrior - 1) * 100 : null, isNew: sPrior < 500000, target2027: sT, growth2027: sL ? (sT / sL - 1) * 100 : null });
  }

  const allPriorOk = monthly.every(m => m.priorOk);
  const h14rows = [...h14.values()].sort((a, b) => a.month.localeCompare(b.month));
  const ytd = h14rows.filter(r => r.month >= '2026-01' && r.month <= '2026-10');
  const sumK = (rows: any[], k: string) => rows.reduce((a, r) => a + r[k], 0);
  // A tiny prior-year base (a venue that barely traded) makes growth percentages meaningless.
  const isNew = prior12 < 500000;
  const pct = (a: number, b: number) => (b && !isNew ? (a / b - 1) * 100 : null);
  return {
    isNew,
    source: 'P57 2027 Sales Plan Pack: 1_Insights and 2_Targets workbooks',
    studios: have,
    period: { current: 'Nov-25 to Oct-26', prior: 'Nov-24 to Oct-25' },
    l12,
    prior12,
    yoy: pct(l12, prior12),
    target2027: target,
    growth2027: pct(target, l12),
    monthly: monthly.map((m, i) => ({
      month: i + 1,
      actual: m.actual,
      prior: allPriorOk && !isNew ? m.prior : null,
      target: m.target,
    })),
    streams: STREAM_KEYS.map(([k, , label]) => ({
      key: k,
      label,
      ...streams[k],
      shareL12: l12 ? (streams[k].l12 / l12) * 100 : null,
      shareTarget: target ? (streams[k].target / target) * 100 : null,
      yoy: pct(streams[k].l12, streams[k].prior),
      growth2027: pct(streams[k].target, streams[k].l12),
    })),
    categories: [...catMap.entries()]
      .map(([name, v]) => ({ name, ...v, share: l12 ? (v.l12 / l12) * 100 : null, yoy: pct(v.l12, v.prior) }))
      .sort((a, b) => b.l12 - a.l12),
    h14: h14rows,
    jan_oct: {
      revenue2026: sumK(ytd, 'revenue'),
      revenue2025: isNew ? null : sumK(ytd, 'prior'),
      payers2026: sumK(ytd, 'payers'),
      payers2025: isNew ? null : sumK(ytd, 'priorPayers'),
      paidVisits: sumK(ytd, 'paidVisits'),
      visits: sumK(ytd, 'visits'),
      leads: sumK(ytd, 'leads'),
      firstVisits: sumK(ytd, 'firstVisits'),
      months: ytd.length,
    },
    funnel2027: funnelXlsx,
    perStudio,
    headlines: have.map(n => {
      const intro = ins.studios[n].insights.intro.find((b: any) => b.t === 'callout');
      const data = ins.studios[n].insights.sections.find((s: any) => s.title === 'What the data says');
      const opp = ins.studios[n].insights.sections.find((s: any) => s.title.startsWith('Opportunities'));
      return {
        name: n,
        lead: intro?.lead ?? null,
        summary: intro?.text ?? null,
        bullets: (data?.blocks || []).filter((b: any) => b.t === 'li').map((b: any) => ({ lead: b.lead, text: b.text })),
        opportunities: findTable(ins.studios[n].insights, 'Opportunity')?.rows ?? [],
        _o: !!opp,
      };
    }),
  };
}
