import crypto from 'node:crypto';
import fs from 'node:fs';
import { db } from '../db.js';
import { offerBankReady, BANK_SOURCE } from './offerBank2027.js';
import { planningStudios } from './linkedOffers.js';

// The final approved 2027 Sales and Offer Plan (export of 29 Oct 2026, parsed by scripts/parse-approved-plan-2027.py).
// Each studio-month gets its three selected offers (newcomer, winback, renewal) picked from the offer bank and
// loaded as draft (planners approve by hand), plus the month's theme, commercial job, goals, KPIs and week-by-week implementation plan.
// Runs once, guarded by the `approved_plan_2027` setting.

const FLAG = 'approved_plan_2027';
const YEAR = 2027;
const SOURCE = new URL('../data/approved-plan-2027.json', import.meta.url);

type Fields = Record<string, string[]>;
export interface PlanOffer {
  slot: 'newcomer' | 'lapsed' | 'renewal';
  name: string;
  tagline: string;
  fields: Fields;
}
export interface PlanMonth {
  studio: string;
  month: number;
  theme: string;
  hook: string;
  job: string;
  moment: string;
  figures: Record<string, any>;
  offers: PlanOffer[];
}

const OBJECTIVE = { newcomer: 'acquisition', lapsed: 'reactivation', renewal: 'retention' } as const;
const STREAM = { newcomer: 'newClientPlan', lapsed: 'reactivationPlan', renewal: 'renewalPlan' } as const;
const LABEL = { newcomer: 'Newcomer', lapsed: 'Winback', renewal: 'Renewal' } as const;
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const json = (v: any, fallback: any) => {
  try {
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const text = (f: Fields, key: string) => (f[key] || []).join('\n');
const line = (f: Fields, key: string) => (f[key] || []).map(s => s.replace(/^•\s*/, '')).join('; ');
const lakh = (v: number) => `₹${(v / 100000).toFixed(1)}L`;
const uid = () => `P57-${YEAR}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

function insertOffer(row: Record<string, any>) {
  const cols = Object.keys(row);
  return db
    .prepare(`INSERT INTO offers(offer_uid,${cols.join(',')}) VALUES (?${',?'.repeat(cols.length)})`)
    .run(uid(), ...Object.values(row)).lastInsertRowid as number;
}

export function offerRow(o: PlanOffer, studioId: number) {
  const f = o.fields;
  const revenue = text(f, 'Expected revenue');
  const rev = Number(revenue.match(/₹([\d.]+)L counted/)?.[1] || 0) * 100000;
  const buyers = Number(revenue.match(/(\d+) buyers/)?.[1] || 0);
  const discount = Number(text(f, 'Effective discount').match(/([\d.]+)% effective/)?.[1] || 0);
  return {
    rev,
    buyers,
    row: {
      name: o.name,
      headline: o.tagline,
      customer_copy: [o.tagline, ...(f['You get'] || [])].join('\n'),
      internal_description: text(f, 'Model'),
      rationale: `Why: ${line(f, 'Why it works')}`,
      objective: OBJECTIVE[o.slot],
      offer_type: 'experience',
      studio_id: studioId,
      year: YEAR,
      audience: line(f, 'Who qualifies'),
      benefit: line(f, 'You pay'),
      redemption_conditions: line(f, 'Rules'),
      effective_discount: discount,
      success_metrics: JSON.stringify(f['What to watch'] || []),
      cta: line(f, 'When'),
      plan_slot: o.slot,
      data_mode: 'user',
    },
  };
}

export function monthPlan(m: PlanMonth) {
  const fg = m.figures;
  const name = MONTHS[m.month - 1];
  const strategy = [
    `${m.theme} — ${m.hook}.`,
    `Commercial job: ${m.job}`,
    ...m.offers.map(o => `${LABEL[o.slot]}: ${o.name} (“${o.tagline}”). ${line(o.fields, 'Why it works')}`),
  ].join('\n\n');
  const focusPoints = [
    `Hit the ${name} target of ${lakh(fg.target)} (approved plan projects ${lakh(fg.projected)}).`,
    `New clients: ${fg.leadsTrials?.[0]} leads → ${fg.leadsTrials?.[1]} completed trials → ${fg.newBuyers} new buyers (${lakh(fg.newClientPlan)}).`,
    `Renewals: ${fg.renewals?.[0]} due → ${fg.renewals?.[1]} purchases (${lakh(fg.renewalPlan)}).`,
    `Reactivation: ${fg.lapsed?.[0]} lapsed touches → ${fg.lapsed?.[1]} reactivated (${lakh(fg.reactivationPlan)}).`,
    `Drop-ins, privates and retail: ${lakh(fg.otherPlan)}.`,
  ];
  const kpis = m.offers.map(o => `${o.name}: ${line(o.fields, 'What to watch')}`);
  const act = (week: number, owner: string, t: string) => ({ week, owner, text: t, done: false });
  const actions = [
    ...m.offers.map(o =>
      act(
        1,
        'Studio manager',
        `Set up ${o.name} in Momence before launch (${line(o.fields, 'When')}): ${line(o.fields, 'You pay')}`,
      ),
    ),
    act(
      1,
      'Sales lead',
      `Brief the team on the three ${name} offers, their rules and the no-stacking rule; print the offer cards for the desk.`,
    ),
    ...m.offers.map(o =>
      act(1, 'Sales lead', `Launch ${o.name} to ${line(o.fields, 'Who qualifies').replace(/\.$/, '')}.`),
    ),
    act(2, 'Studio manager', `Run the month's moment: ${m.moment}`),
    act(2, 'Sales lead', `Weekly check: ${kpis.join(' | ')}`),
    act(
      3,
      'Sales lead',
      `Mid-month review against ${lakh(fg.target)}: renewals ${fg.renewals?.[1]}, reactivations ${fg.lapsed?.[1]}, new buyers ${fg.newBuyers}. Push the lists, not a deeper discount.`,
    ),
    act(
      4,
      'Studio manager',
      `Close ${name}: tag every redemption by offer, record results and brief next month's offers.`,
    ),
  ];
  return { strategy, focusPoints, kpis, actions };
}

export function applyApprovedPlan2027() {
  const done = db.prepare('SELECT value FROM settings WHERE key=?').get(FLAG) as any;
  if (done?.value === '1' || !offerBankReady() || !fs.existsSync(SOURCE)) return null;
  const plan: PlanMonth[] = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  const studios = new Map(planningStudios().map(s => [s.name, s.id]));
  const report = { months: 0, bankAdded: 0, picks: 0 };
  db.transaction(() => {
    // The approved plan replaces the earlier recommendations.
    for (const r of db
      .prepare("SELECT id, provenance FROM offers WHERE year=? AND month IS NULL AND provenance LIKE '%recommended%'")
      .all(YEAR) as any[]) {
      const p = json(r.provenance, {});
      delete p.recommended;
      delete p.recommendedMonths;
      db.prepare('UPDATE offers SET provenance=? WHERE id=?').run(JSON.stringify(p), r.id);
    }
    const months = new Map<number, Set<number>>();
    for (const m of plan) {
      const studioId = studios.get(m.studio);
      if (!studioId) continue;
      const slots: Record<string, number | null> = { newcomer: null, lapsed: null, renewal: null };
      for (const o of m.offers) {
        const { row, rev, buyers } = offerRow(o, studioId);
        let bank = db
          .prepare(
            'SELECT id, provenance FROM offers WHERE studio_id=? AND year=? AND month IS NULL AND lower(name)=lower(?)',
          )
          .get(studioId, YEAR, o.name) as any;
        if (!bank) {
          const id = insertOffer({
            ...row,
            month: null,
            status: 'draft',
            approval_status: 'pending',
            generation_source: BANK_SOURCE,
            provenance: JSON.stringify({ source: 'approved_plan_2027' }),
          });
          bank = { id, provenance: JSON.stringify({ source: 'approved_plan_2027' }) };
          report.bankAdded++;
        }
        months.set(bank.id, (months.get(bank.id) || new Set()).add(m.month));
        slots[o.slot] = insertOffer({
          ...row,
          month: m.month,
          status: 'draft',
          approval_status: 'pending',
          generation_source: BANK_SOURCE,
          expected_revenue: rev,
          revenue_target: m.figures[STREAM[o.slot]] || 0,
          target_purchases: buyers,
          expected_asp: buyers ? Math.round(rev / buyers) : 0,
          provenance: JSON.stringify({ source: 'approved_plan_2027', bankId: bank.id, fields: o.fields }),
        });
        report.picks++;
      }
      const prior = db
        .prepare('SELECT content FROM monthly_plans WHERE studio_id=? AND year=? AND month=?')
        .get(studioId, YEAR, m.month) as any;
      const keyDates = json(prior?.content, {})?.keyDates;
      const { strategy, focusPoints, kpis, actions } = monthPlan(m);
      const content = {
        ...(keyDates ? { keyDates } : {}),
        focusPoints,
        kpis,
        kpi: kpis[0],
        approvedPlan: { figures: m.figures, moment: m.moment, hook: m.hook },
      };
      db.prepare(
        `INSERT INTO monthly_plans(studio_id,year,month,theme,objective,strategy,actions,notes,status,content,slots,offer_ids)
         VALUES (?,?,?,?,?,?,?,?,'draft',?,?,'[]')
         ON CONFLICT(studio_id,year,month) DO UPDATE SET theme=excluded.theme, objective=excluded.objective,
         strategy=excluded.strategy, actions=excluded.actions, notes=excluded.notes, status='draft',
         content=excluded.content, slots=excluded.slots, offer_ids='[]', updated_at=CURRENT_TIMESTAMP`,
      ).run(
        studioId,
        YEAR,
        m.month,
        m.theme,
        m.job,
        strategy,
        JSON.stringify(actions),
        `Moment: ${m.moment}`,
        JSON.stringify(content),
        JSON.stringify(slots),
      );
      report.months++;
    }
    for (const [bankId, set] of months) {
      const bank = db.prepare('SELECT provenance FROM offers WHERE id=?').get(bankId) as any;
      const prov = json(bank?.provenance, {});
      db.prepare('UPDATE offers SET provenance=? WHERE id=?').run(
        JSON.stringify({ ...prov, recommended: true, recommendedMonths: [...set].sort((a, b) => a - b) }),
        bankId,
      );
    }
    db.prepare(
      `INSERT INTO settings(key,value) VALUES(?, '1') ON CONFLICT(key) DO UPDATE SET value='1',updated_at=CURRENT_TIMESTAMP`,
    ).run(FLAG);
  })();
  return report;
}

const ALT_FLAG = 'approved_plan_alternatives_2027';

interface PlanAlternative {
  name: string;
  tagline: string;
  auditor: number | null;
  fields: Record<string, string>;
  effectiveDiscount: number;
  expectedRevenue: number;
  buyers: number;
  why: string;
}

// The alternatives considered for each approved slot join the location's offer bank, tagged with the month and slot
// they were weighed for. They stay unpicked, so they never count toward a month's expected revenue.
export function applyApprovedAlternatives2027() {
  const done = db.prepare('SELECT value FROM settings WHERE key=?').get(ALT_FLAG) as any;
  if (done?.value === '1' || !fs.existsSync(SOURCE)) return null;
  const approved = db.prepare('SELECT value FROM settings WHERE key=?').get(FLAG) as any;
  if (approved?.value !== '1') return null;
  const plan: Array<PlanMonth & { offers: Array<PlanOffer & { alternatives?: PlanAlternative[] }> }> = JSON.parse(
    fs.readFileSync(SOURCE, 'utf8'),
  );
  const studios = new Map(planningStudios().map(s => [s.name, s.id]));
  const report = { alternatives: 0, bankAdded: 0 };
  db.transaction(() => {
    for (const m of plan) {
      const studioId = studios.get(m.studio);
      if (!studioId) continue;
      for (const o of m.offers) {
        for (const a of o.alternatives || []) {
          const f = a.fields;
          let bank = db
            .prepare(
              'SELECT id, provenance FROM offers WHERE studio_id=? AND year=? AND month IS NULL AND lower(name)=lower(?)',
            )
            .get(studioId, YEAR, a.name) as any;
          if (!bank) {
            const id = insertOffer({
              name: a.name,
              headline: a.tagline,
              customer_copy: [a.tagline, f.Get].filter(Boolean).join('\n'),
              rationale: `Why: ${a.why}`,
              objective: OBJECTIVE[o.slot],
              offer_type: 'experience',
              studio_id: studioId,
              month: null,
              year: YEAR,
              audience: f.Who || '',
              benefit: f.Pay || '',
              redemption_conditions: f.Rules || '',
              effective_discount: a.effectiveDiscount,
              expected_revenue: a.expectedRevenue,
              target_purchases: a.buyers,
              expected_asp: a.buyers ? Math.round(a.expectedRevenue / a.buyers) : 0,
              cta: f.When || '',
              plan_slot: o.slot,
              status: 'draft',
              approval_status: 'pending',
              generation_source: BANK_SOURCE,
              data_mode: 'user',
              provenance: JSON.stringify({ source: 'approved_plan_2027_alternative' }),
            });
            bank = { id, provenance: JSON.stringify({ source: 'approved_plan_2027_alternative' }) };
            report.bankAdded++;
          }
          const prov = json(bank.provenance, {});
          const alternateFor = [
            ...(prov.alternateFor || []),
            { month: m.month, slot: o.slot, for: o.name, auditor: a.auditor },
          ];
          db.prepare('UPDATE offers SET provenance=? WHERE id=?').run(
            JSON.stringify({ ...prov, alternateFor }),
            bank.id,
          );
          report.alternatives++;
        }
      }
    }
    db.prepare(
      `INSERT INTO settings(key,value) VALUES(?, '1') ON CONFLICT(key) DO UPDATE SET value='1',updated_at=CURRENT_TIMESTAMP`,
    ).run(ALT_FLAG);
  })();
  return report;
}

const UNAPPROVE_FLAG = 'approved_plan_unapproved_2027';

// Planners approve offers and months by hand: the imported plan is loaded as draft, pending approval.
export function unapproveImportedPlan2027() {
  const done = db.prepare('SELECT value FROM settings WHERE key=?').get(UNAPPROVE_FLAG) as any;
  if (done?.value === '1') return null;
  let offers = 0,
    months = 0;
  db.transaction(() => {
    offers = db
      .prepare(
        `UPDATE offers SET status='draft', approval_status='pending' WHERE year=? AND provenance LIKE '%approved_plan_2027%'`,
      )
      .run(YEAR).changes;
    months = db.prepare(`UPDATE monthly_plans SET status='draft' WHERE year=? AND status='approved'`).run(YEAR).changes;
    db.prepare(
      `INSERT INTO settings(key,value) VALUES(?, '1') ON CONFLICT(key) DO UPDATE SET value='1',updated_at=CURRENT_TIMESTAMP`,
    ).run(UNAPPROVE_FLAG);
  })();
  return { offers, months };
}

const CURATE_FLAG = 'final_plan_curated_2027';

// The final plan replaces every earlier 2027 plan: old campaigns (and the offers only they kept alive) and the
// seeded playbook items go; each month's picked offers get a draft campaign for that month. Playbook items reseed
// from the final plan on next view.
export function curateFinalPlan2027() {
  const done = db.prepare('SELECT value FROM settings WHERE key=?').get(CURATE_FLAG) as any;
  if (done?.value === '1') return null;
  const ready = db.prepare('SELECT value FROM settings WHERE key=?').get(FLAG) as any;
  if (ready?.value !== '1') return null;
  const report = { campaignsRemoved: 0, offersRemoved: 0, playbookItemsRemoved: 0, campaignsCreated: 0 };
  db.transaction(() => {
    const old = db.prepare('SELECT id, offer_id FROM campaigns WHERE year=?').all(YEAR) as any[];
    db.prepare('DELETE FROM campaign_performance WHERE campaign_id IN (SELECT id FROM campaigns WHERE year=?)').run(
      YEAR,
    );
    report.campaignsRemoved = db.prepare('DELETE FROM campaigns WHERE year=?').run(YEAR).changes;
    for (const { offer_id: id } of old) {
      if (!id) continue;
      const o = db.prepare('SELECT provenance FROM offers WHERE id=?').get(id) as any;
      if (!o || /approved_plan_2027/.test(o.provenance || '')) continue;
      db.prepare('UPDATE offers SET original_offer_id=NULL WHERE original_offer_id=?').run(id);
      db.prepare('DELETE FROM offer_versions WHERE offer_id=?').run(id);
      db.prepare('DELETE FROM offer_experiments WHERE control_offer_id=? OR variant_offer_id=?').run(id, id);
      report.offersRemoved += db.prepare('DELETE FROM offers WHERE id=?').run(id).changes;
    }
    report.playbookItemsRemoved = db.prepare('DELETE FROM studio_playbook_items WHERE year=?').run(YEAR).changes;

    const plans = db.prepare('SELECT studio_id, month, slots FROM monthly_plans WHERE year=?').all(YEAR) as any[];
    const insert = db.prepare(
      `INSERT INTO campaigns(name,studio_id,offer_id,year,start_date,end_date,audience,objective,target_revenue,expected_purchases,status,approval_status,tasks,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,'draft','pending',?,?)`,
    );
    for (const p of plans) {
      for (const id of Object.values(json(p.slots, {})).filter(Boolean) as number[]) {
        const o = db.prepare('SELECT * FROM offers WHERE id=?').get(id) as any;
        if (!o) continue;
        const mm = String(p.month).padStart(2, '0');
        const last = new Date(Date.UTC(YEAR, p.month, 0)).getUTCDate();
        const tasks = [
          { text: `Set up ${o.name} in Momence`, done: false },
          { text: `Brief the desk and send to: ${o.audience}`, done: false },
          { text: 'Tag every redemption and record results at month end', done: false },
        ];
        insert.run(
          `${o.name} · ${MONTHS[p.month - 1]} ${YEAR}`,
          p.studio_id,
          o.id,
          YEAR,
          `${YEAR}-${mm}-01`,
          `${YEAR}-${mm}-${last}`,
          o.audience,
          o.objective,
          o.expected_revenue || 0,
          o.target_purchases || 0,
          JSON.stringify(tasks),
          `When: ${o.cta || 'all month'}`,
        );
        report.campaignsCreated++;
      }
    }
    db.prepare(
      `INSERT INTO settings(key,value) VALUES(?, '1') ON CONFLICT(key) DO UPDATE SET value='1',updated_at=CURRENT_TIMESTAMP`,
    ).run(CURATE_FLAG);
  })();
  return report;
}
