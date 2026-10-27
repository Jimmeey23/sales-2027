import crypto from 'node:crypto';
import { db } from '../db.js';
import { PLAYBOOK_2027 } from '../../src/data/playbook2027.js';

// One offer bank per location for 2027. Bank rows carry no month; a month's plan holds its own copy of each
// picked bank offer (provenance.bankId) so month economics stay per month. Every other 2027 offer source —
// the archived plan/bank imports, the membership library, scenario/demo rows and the hard-coded playbook
// offers — is folded into the bank or removed. Runs once, guarded by the `offer_bank_2027` setting.

export const BANK_SOURCE = 'offer_bank';
const FLAG = 'offer_bank_2027';
const YEAR = 2027;

const json = (v: any, fallback: any) => {
  try {
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const OBJECTIVE_OF_TAG: Record<string, string> = {
  Conversion: 'trial_conversion',
  Acquisition: 'acquisition',
  'Win-back': 'reactivation',
  Renewal: 'retention',
  Retention: 'retention',
  Capacity: 'additional_purchase',
  Upsell: 'aov',
  Operations: 'retention',
};

const uid = () => `P57-${YEAR}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
const baseName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '').trim();

function insertRow(row: Record<string, any>) {
  const cols = Object.keys(row);
  return db
    .prepare(`INSERT INTO offers(offer_uid,${cols.join(',')}) VALUES (?${',?'.repeat(cols.length)})`)
    .run(uid(), ...Object.values(row)).lastInsertRowid as number;
}

function copyRow(offer: any, patch: Record<string, any>) {
  const skip = new Set(['id', 'offer_uid', 'created_at', 'updated_at', 'version']);
  const row: Record<string, any> = Object.fromEntries(Object.entries(offer).filter(([k]) => !skip.has(k)));
  return insertRow({ ...row, ...patch });
}

function selectedIds(studioId: number, month: number) {
  const plan = db
    .prepare('SELECT slots, offer_ids FROM monthly_plans WHERE studio_id=? AND year=? AND month=?')
    .get(studioId, YEAR, month) as any;
  const slots: Record<string, number | null> = json(plan?.slots, {}) || {};
  const ids: number[] = json(plan?.offer_ids, []) || [];
  return { slots, ids };
}

export function ensureOfferBank2027() {
  const done = db.prepare('SELECT value FROM settings WHERE key=?').get(FLAG) as any;
  if (done?.value === '1') return null;
  const plannedStudios = db
    .prepare('SELECT DISTINCT p.studio_id id, s.name FROM monthly_plans p JOIN studios s ON s.id=p.studio_id WHERE p.year=?')
    .all(YEAR) as Array<{ id: number; name: string }>;
  if (!plannedStudios.length) return null;

  const report = { bank: 0, playbookAdded: 0, playbookPicked: 0, deleted: 0 };
  db.transaction(() => {
    const keep = new Set<number>();
    for (const studio of plannedStudios) {
      const bankByName = new Map<string, number>();
      const bankFor = (offer: any) => {
        const key = offer.name.toLowerCase();
        let id = bankByName.get(key);
        if (!id) {
          const prov = json(offer.provenance, {});
          delete prov.linkGroup;
          id = copyRow(offer, {
            month: null,
            status: 'draft',
            approval_status: 'pending',
            generation_source: BANK_SOURCE,
            data_mode: 'user',
            provenance: JSON.stringify({ ...prov, bankFrom: offer.id }),
          });
          bankByName.set(key, id);
          keep.add(id);
          report.bank++;
        }
        return id;
      };

      // 1. Every offer a month has picked becomes (or joins) a bank offer; the month keeps its copy, linked back.
      for (let month = 1; month <= 12; month++) {
        const { slots, ids } = selectedIds(studio.id, month);
        for (const id of [...Object.values(slots), ...ids].filter(Boolean) as number[]) {
          const offer = db.prepare('SELECT * FROM offers WHERE id=?').get(id) as any;
          if (!offer) continue;
          const bankId = bankFor(offer);
          const prov = json(offer.provenance, {});
          db.prepare('UPDATE offers SET month=?, provenance=? WHERE id=?').run(
            month,
            JSON.stringify({ ...prov, bankId }),
            offer.id,
          );
          keep.add(offer.id);
        }
      }

      // 2. The written playbook's offers join the bank and are picked in the months the playbook names.
      const pb = (PLAYBOOK_2027.studios as Record<string, any>)[studio.name];
      if (!pb) continue;
      const pbBank = new Map<string, number>();
      for (const o of pb.offers) {
        const objective = OBJECTIVE_OF_TAG[o.tag] || 'retention';
        const id = insertRow({
          name: o.name,
          headline: o.tag,
          customer_copy: o.mechanic,
          internal_description: o.economics,
          rationale: o.logic,
          objective,
          offer_type: 'experience',
          studio_id: studio.id,
          month: null,
          year: YEAR,
          audience: o.audience,
          benefit: o.mechanic,
          redemption_conditions: o.months,
          status: 'draft',
          approval_status: 'pending',
          generation_source: BANK_SOURCE,
          data_mode: 'user',
          target_purchases: 0,
          expected_asp: 0,
          expected_revenue: 0,
          revenue_target: 0,
          success_metrics: JSON.stringify(o.kpi ? [o.kpi] : []),
          provenance: JSON.stringify({ source: 'playbook_2027', lever: o.lever || null }),
        });
        pbBank.set(o.name.toLowerCase(), id);
        keep.add(id);
        report.playbookAdded++;
      }
      pb.months.forEach((m: any, i: number) => {
        const month = i + 1;
        const { slots, ids } = selectedIds(studio.id, month);
        for (const name of m.offers as string[]) {
          let bankId = pbBank.get(name.toLowerCase()) || pbBank.get(baseName(name).toLowerCase());
          if (!bankId) {
            bankId = insertRow({
              name,
              objective: 'additional_purchase',
              offer_type: 'experience',
              studio_id: studio.id,
              month: null,
              year: YEAR,
              status: 'draft',
              approval_status: 'pending',
              generation_source: BANK_SOURCE,
              data_mode: 'user',
              provenance: JSON.stringify({ source: 'playbook_2027' }),
            });
            pbBank.set(name.toLowerCase(), bankId);
            keep.add(bankId);
            report.playbookAdded++;
          }
          const bank = db.prepare('SELECT * FROM offers WHERE id=?').get(bankId) as any;
          const prov = json(bank.provenance, {});
          const copyId = copyRow(bank, { month, provenance: JSON.stringify({ ...prov, bankId }) });
          keep.add(copyId);
          ids.push(copyId);
          report.playbookPicked++;
        }
        db.prepare(
          `INSERT INTO monthly_plans(studio_id,year,month,offer_ids,slots) VALUES (?,?,?,?,?)
           ON CONFLICT(studio_id,year,month) DO UPDATE SET offer_ids=excluded.offer_ids, slots=excluded.slots, updated_at=CURRENT_TIMESTAMP`,
        ).run(studio.id, YEAR, month, JSON.stringify(ids), JSON.stringify(slots));
      });
    }

    // 3. Remove every other 2027 offer, unless a campaign still points at it.
    for (const r of db.prepare('SELECT offer_id id FROM campaigns WHERE offer_id IS NOT NULL').all() as any[]) keep.add(r.id);
    const drop = (db.prepare('SELECT id FROM offers WHERE year=?').all(YEAR) as any[])
      .map(r => r.id as number)
      .filter(id => !keep.has(id));
    const del = (sql: string) => db.prepare(sql);
    const clearOriginal = del('UPDATE offers SET original_offer_id=NULL WHERE original_offer_id=?');
    const delVersions = del('DELETE FROM offer_versions WHERE offer_id=?');
    const delExperiments = del('DELETE FROM offer_experiments WHERE control_offer_id=? OR variant_offer_id=?');
    const delOffer = del('DELETE FROM offers WHERE id=?');
    for (const id of drop) {
      clearOriginal.run(id);
      delVersions.run(id);
      delExperiments.run(id, id);
      delOffer.run(id);
    }
    report.deleted = drop.length;

    db.prepare(
      `INSERT INTO settings(key,value) VALUES(?, '1') ON CONFLICT(key) DO UPDATE SET value='1',updated_at=CURRENT_TIMESTAMP`,
    ).run(FLAG);
  })();
  return report;
}

export const offerBankReady = () =>
  (db.prepare('SELECT value FROM settings WHERE key=?').get(FLAG) as any)?.value === '1';
