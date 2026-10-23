import { db } from '../db.js';

const DEFINITIONS: Record<string, { name: string; recommendation: string; incentive: string; response: number }> = {
  new_leads: {
    name: 'New leads',
    recommendation: 'Lead nurture and trial booking sequence',
    incentive: 'Trial experience; no discount by default',
    response: 0.08,
  },
  unconverted_trials: {
    name: 'Unconverted trial attendees',
    recommendation: '48-hour trial follow-up campaign',
    incentive: 'Low-discount newcomer package or bonus onboarding',
    response: 0.08,
  },
  first_time_purchasers: {
    name: 'First-time purchasers',
    recommendation: 'Second-purchase habit builder',
    incentive: 'Milestone benefit or added validity',
    response: 0.06,
  },
  active_customers: {
    name: 'Active customers',
    recommendation: 'Additional purchase and referral programme',
    incentive: 'Non-discount experience or referral benefit',
    response: 0.03,
  },
  frequent_purchasers: {
    name: 'Frequent purchasers',
    recommendation: 'Loyalty and higher-value package upgrade',
    incentive: 'Recognition, priority access or bonus session',
    response: 0.05,
  },
  approaching_expiry: {
    name: 'Approaching expiry',
    recommendation: 'Renewal before expiry',
    incentive: 'Loyalty benefit or validity extension before discount',
    response: 0.1,
  },
  declining_attendance: {
    name: 'Declining attendance',
    recommendation: 'Attendance recovery outreach',
    incentive: 'Coach check-in; incentive only if needed',
    response: 0.05,
  },
  recently_lapsed: {
    name: 'Recently lapsed',
    recommendation: 'Personalised comeback campaign',
    incentive: 'Modest reactivation benefit',
    response: 0.04,
  },
  long_lapsed: {
    name: 'Long-lapsed customers',
    recommendation: 'Segmented win-back test',
    incentive: 'Time-bound comeback package',
    response: 0.02,
  },
  high_value: {
    name: 'High-value customers',
    recommendation: 'High-touch retention and upgrade',
    incentive: 'Premium loyalty benefit; protect price',
    response: 0.06,
  },
  promotion_sensitive: {
    name: 'Promotion-sensitive customers',
    recommendation: 'Value-added bundle test',
    incentive: 'Bonus value rather than deeper discount',
    response: 0.04,
  },
  reactivated: {
    name: 'Reactivated customers',
    recommendation: '90-day second-renewal plan',
    incentive: 'Habit and milestone reward',
    response: 0.08,
  },
};

export function recalculateSegments(studioId?: number) {
  const rules = db.prepare('SELECT * FROM segment_rules WHERE id=1').get() as any;
  const studios = db
    .prepare(`SELECT id FROM studios WHERE active=1 ${studioId ? 'AND id=?' : ''}`)
    .all(...(studioId ? [studioId] : [])) as any[];
  const upsert =
    db.prepare(`INSERT INTO segment_snapshots(studio_id,segment_key,segment_name,audience_size,average_spend,response_rate,expected_revenue,priority,recommendation,evidence,limitations,calculated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(studio_id,segment_key) DO UPDATE SET audience_size=excluded.audience_size,
    average_spend=excluded.average_spend,response_rate=excluded.response_rate,expected_revenue=excluded.expected_revenue,priority=excluded.priority,
    recommendation=excluded.recommendation,evidence=excluded.evidence,limitations=excluded.limitations,calculated_at=CURRENT_TIMESTAMP`);
  const run = db.transaction(() => {
    for (const studio of studios) {
      const ids: Record<string, Set<string>> = Object.fromEntries(
        Object.keys(DEFINITIONS).map(key => [key, new Set<string>()]),
      );
      const add = (key: string, rows: any[], field = 'member_ref') =>
        rows.forEach(row => {
          if (row[field]) ids[key].add(String(row[field]));
        });
      add(
        'new_leads',
        db
          .prepare(
            `SELECT member_ref,COALESCE(source_uid,'') member_ref FROM leads WHERE studio_id=? AND converted_at IS NULL AND created_at>=date('now','-90 days') AND stage IN ('Open','Trial Scheduled','Sent Introductory message')`,
          )
          .all(studio.id),
      );
      add(
        'unconverted_trials',
        db
          .prepare(
            `SELECT member_ref FROM member_visits WHERE studio_id=? AND first_purchase_at IS NULL AND first_visit_at>=date('now','-180 days')`,
          )
          .all(studio.id),
      );
      add(
        'first_time_purchasers',
        db
          .prepare(
            `SELECT DISTINCT member_ref FROM transactions WHERE studio_id=? AND is_first_observed=1 AND purchased_at>=date('now','-90 days')`,
          )
          .all(studio.id),
      );
      add(
        'active_customers',
        db
          .prepare(
            `SELECT DISTINCT member_ref FROM customer_packages WHERE studio_id=? AND end_date>=date('now') AND status NOT IN ('Lapsed','Not Activated')`,
          )
          .all(studio.id),
      );
      add(
        'frequent_purchasers',
        db
          .prepare(`SELECT member_ref FROM transactions WHERE studio_id=? GROUP BY member_ref HAVING COUNT(*)>=?`)
          .all(studio.id, rules.frequent_purchase_count),
      );
      add(
        'approaching_expiry',
        db
          .prepare(
            `SELECT DISTINCT member_ref FROM customer_packages WHERE studio_id=? AND end_date BETWEEN date('now') AND date('now','+'||?||' days') AND status NOT IN ('Lapsed','Not Activated')`,
          )
          .all(studio.id, rules.expiry_days),
      );
      add(
        'recently_lapsed',
        db
          .prepare(
            `SELECT DISTINCT member_ref FROM customer_packages WHERE studio_id=? AND status='Lapsed' AND COALESCE(churned_date,end_date) BETWEEN date('now','-'||?||' days') AND date('now')`,
          )
          .all(studio.id, rules.recently_lapsed_days),
      );
      add(
        'long_lapsed',
        db
          .prepare(
            `SELECT DISTINCT member_ref FROM customer_packages WHERE studio_id=? AND status='Lapsed' AND COALESCE(churned_date,end_date)<date('now','-'||?||' days')`,
          )
          .all(studio.id, rules.long_lapsed_days),
      );
      add(
        'promotion_sensitive',
        db
          .prepare(
            `SELECT member_ref FROM transactions WHERE studio_id=? GROUP BY member_ref HAVING COUNT(*)>=2 AND 1.0*SUM(CASE WHEN discount_amount>0 THEN 1 ELSE 0 END)/COUNT(*)>=?`,
          )
          .all(studio.id, rules.promo_sensitivity_threshold),
      );
      add(
        'reactivated',
        db
          .prepare(
            `SELECT DISTINCT member_ref FROM transactions WHERE studio_id=? AND revenue_stream='reactivation' AND purchased_at>=date('now','-90 days')`,
          )
          .all(studio.id),
      );
      const values = db
        .prepare(
          'SELECT member_ref,SUM(amount) value FROM transactions WHERE studio_id=? GROUP BY member_ref ORDER BY value DESC',
        )
        .all(studio.id) as any[];
      if (values.length) {
        const rank = Math.max(0, Math.floor(values.length * (1 - rules.high_value_percentile / 100)));
        const threshold = values[Math.min(rank, values.length - 1)].value;
        values.filter(v => v.value >= threshold).forEach(v => ids.high_value.add(v.member_ref));
      }
      for (const [key, definition] of Object.entries(DEFINITIONS)) {
        const audience = ids[key].size;
        let averageSpend: number | null = null;
        if (audience) {
          const refs = [...ids[key]];
          const placeholders = refs.map(() => '?').join(',');
          const rows = db
            .prepare(
              `SELECT member_ref,SUM(amount) total,COUNT(*) purchases FROM transactions WHERE studio_id=? AND member_ref IN (${placeholders}) GROUP BY member_ref`,
            )
            .all(studio.id, ...refs) as any[];
          if (rows.length) averageSpend = rows.reduce((sum, row) => sum + row.total / row.purchases, 0) / rows.length;
        }
        const expected = averageSpend && audience ? audience * definition.response * averageSpend : null;
        const limitation =
          key === 'declining_attendance'
            ? 'Unavailable from supplied files: member-level monthly attendance series is required. Audience intentionally set to zero.'
            : key === 'new_leads'
              ? 'Lead snapshots can duplicate lifecycle states; member reference or lead ID is used for counting.'
              : 'Audience is an imported-data estimate. Response rate is a planning assumption, not an observed campaign response.';
        upsert.run(
          studio.id,
          key,
          definition.name,
          key === 'declining_attendance' ? 0 : audience,
          averageSpend,
          definition.response,
          expected,
          expected && expected > 100000 ? 'high' : audience > 20 ? 'medium' : 'normal',
          `${definition.recommendation} · ${definition.incentive}`,
          `${audience} privacy-safe customer references meet the configured rule. Expected revenue uses a ${(definition.response * 100).toFixed(0)}% scenario response.`,
          limitation,
        );
      }
    }
  });
  run();
}
