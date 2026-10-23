import { db } from '../db.js';
import { dataCoverage, latestCompleteMonth, recommendTarget, type TargetScenario } from './intelligence.js';

export type ReportColumnType = 'text' | 'currency' | 'number' | 'percent' | 'ratio' | 'month' | 'date' | 'datetime';
export type ReportColumn = { key: string; label: string; type?: ReportColumnType };
export type ReportCategory = 'Executive' | 'Commercial' | 'Retention' | 'Operations' | 'Governance';
export type ReportOptions = {
  report: string; from: string; to: string; studio?: number; status?: string; dataMode?: string;
  scenario?: TargetScenario; limit: number; sort?: string; direction: 'asc' | 'desc'; search?: string; columns?: string[];
};
type SummaryDefinition = { key: string; label: string; type: ReportColumnType; aggregate: 'sum' | 'mean' | 'ratio' | 'count'; numerator?: string; denominator?: string; denominatorAdd?: string; offset?: number };
type ChartDefinition = { x: string; series: { key: string; label: string; type: ReportColumnType }[]; kind?: 'bar' | 'line' };
type ReportDefinition = {
  id: string; name: string; category: ReportCategory; description: string; evidence: string; period: 'actual' | 'planning';
  columns: ReportColumn[]; summary: SummaryDefinition[]; chart?: ChartDefinition; notes: string[];
  statusOptions?: string[]; dataModeFilter?: boolean; scenarioFilter?: boolean; requiresPermission?: 'settings'; studioFilter?: boolean;
  defaultSort?: { key: string; direction: 'asc' | 'desc' }; run: (options: ReportOptions) => any[];
};

const currency = (key: string, label: string): ReportColumn => ({ key, label: `${label} (INR)`, type: 'currency' });
const number = (key: string, label: string): ReportColumn => ({ key, label, type: 'number' });
const percent = (key: string, label: string): ReportColumn => ({ key, label: `${label} (%)`, type: 'percent' });
const text = (key: string, label: string): ReportColumn => ({ key, label });
const month = { key: 'month', label: 'Month', type: 'month' as const };
const studio = { key: 'studio', label: 'Studio' };
const sum = (key: string, label: string, type: ReportColumnType = 'currency'): SummaryDefinition => ({ key, label, type, aggregate: 'sum' });
const ratio = (key: string, label: string, numerator: string, denominator: string, type: ReportColumnType = 'percent', offset = 0, denominatorAdd?: string): SummaryDefinition => ({ key, label, type, aggregate: 'ratio', numerator, denominator, offset, denominatorAdd });
const count = (label: string): SummaryDefinition => ({ key: 'rows', label, type: 'number', aggregate: 'count' });
const chart = (x: string, series: ChartDefinition['series'], kind: 'bar' | 'line' = 'bar'): ChartDefinition => ({ x, series, kind });
const moneySeries = (key: string, label: string) => ({ key, label, type: 'currency' as const });
const countSeries = (key: string, label: string) => ({ key, label, type: 'number' as const });
const actualNotes = ['Historical actuals use imported gross collected transaction value.', 'October 2026 is partial; November and December 2026 have no sales actuals. Missing periods are not imputed.'];
const planningNotes = ['Proposed targets and offer economics are planning scenarios, not approved decisions or observed performance.', 'Approved values remain separate where available.'];
const attendanceNotes = ['Checkins covers all bookings, not trial-specific attendance.', 'Current-day and future sessions are excluded from behavioural actuals; unattended source labels cannot recover original acquisition type.'];
const scoped = (options: ReportOptions, column: string) => options.studio ? `AND ${column}=?` : '';
const periodParams = (options: ReportOptions) => [options.from, options.to, ...(options.studio ? [options.studio] : [])];
const periodNumber = (value: string) => Number(value.replace('-', ''));
const round = (value: any) => value === null || value === undefined || !Number.isFinite(Number(value)) ? null : Math.round(Number(value) * 100) / 100;

function monthlyRows(options: ReportOptions) {
  const filter = scoped(options, 'studio_id'), params = periodParams(options);
  const rows = db.prepare(`WITH actual AS (
      SELECT studio_id,month,COUNT(*) transactions,SUM(amount) revenue,AVG(amount) aov,SUM(discount_amount) discount,
        SUM(CASE WHEN revenue_stream='new_client' THEN amount ELSE 0 END) new_client,
        SUM(CASE WHEN revenue_stream='renewal' THEN amount ELSE 0 END) renewal,
        SUM(CASE WHEN revenue_stream='reactivation' THEN amount ELSE 0 END) reactivation,
        SUM(CASE WHEN revenue_stream='additional' THEN amount ELSE 0 END) additional
      FROM transactions WHERE month BETWEEN ? AND ? ${filter} GROUP BY studio_id,month
    ), targets AS (
      SELECT studio_id,printf('%04d-%02d',year,month) month,scenario,proposed_target,approved_target,baseline_forecast
      FROM monthly_targets WHERE printf('%04d-%02d',year,month) BETWEEN ? AND ? ${filter}
    ), keys AS (SELECT studio_id,month FROM actual UNION SELECT studio_id,month FROM targets)
    SELECT k.studio_id,s.name studio,s.city,k.month,a.transactions,a.revenue,a.aov,a.discount,a.new_client,a.renewal,a.reactivation,a.additional,
      t.scenario,t.proposed_target,t.approved_target,t.baseline_forecast,COALESCE(t.approved_target,t.proposed_target) target,
      (SELECT SUM(p.amount) FROM transactions p WHERE p.studio_id=k.studio_id AND p.month=strftime('%Y-%m',date(k.month||'-01','-1 year'))) prior_revenue
    FROM keys k JOIN studios s ON s.id=k.studio_id LEFT JOIN actual a ON a.studio_id=k.studio_id AND a.month=k.month
    LEFT JOIN targets t ON t.studio_id=k.studio_id AND t.month=k.month ORDER BY k.month,s.name`).all(...params, ...params) as any[];
  return rows.map(row => ({
    ...row,
    target_basis: row.approved_target !== null && row.approved_target !== undefined ? 'approved' : row.target !== null && row.target !== undefined ? 'proposed' : 'missing',
    target_gap: row.target !== null && row.target !== undefined && row.revenue !== null && row.revenue !== undefined ? row.target - row.revenue : null,
    attainment_percent: row.target > 0 && row.revenue !== null && row.revenue !== undefined ? row.revenue / row.target * 100 : null,
    yoy_percent: row.prior_revenue > 0 && row.revenue !== null && row.revenue !== undefined ? (row.revenue / row.prior_revenue - 1) * 100 : null,
  }));
}

function annualStudioRows(options: ReportOptions) {
  const groups = new Map<number, any>();
  for (const row of monthlyRows(options)) {
    const current = groups.get(row.studio_id) || { studio_id: row.studio_id, studio: row.studio, city: row.city, months: 0, observed_months: 0,
      transactions: 0, revenue: null, new_client: 0, renewal: 0, reactivation: 0, additional: 0, discount: 0, target: null, prior_revenue: null };
    current.months += 1;
    if (row.revenue !== null && row.revenue !== undefined) { current.observed_months += 1; current.revenue = Number(current.revenue || 0) + row.revenue; current.transactions += row.transactions || 0; }
    for (const key of ['new_client','renewal','reactivation','additional','discount']) current[key] += Number(row[key] || 0);
    if (row.target !== null && row.target !== undefined) current.target = Number(current.target || 0) + row.target;
    if (row.prior_revenue !== null && row.prior_revenue !== undefined) current.prior_revenue = Number(current.prior_revenue || 0) + row.prior_revenue;
    groups.set(row.studio_id, current);
  }
  return [...groups.values()].map(row => ({ ...row, aov: row.transactions ? row.revenue / row.transactions : null,
    target_gap: row.target !== null && row.revenue !== null ? row.target - row.revenue : null,
    attainment_percent: row.target > 0 && row.revenue !== null ? row.revenue / row.target * 100 : null,
    yoy_percent: row.prior_revenue > 0 && row.revenue !== null ? (row.revenue / row.prior_revenue - 1) * 100 : null }));
}

function monthsBetween(from: string, to: string) {
  const result: { year: number; month: number; key: string }[] = [];
  let [year, month] = from.split('-').map(Number); const end = Number(to.replace('-', ''));
  while (Number(`${year}${String(month).padStart(2, '0')}`) <= end) {
    result.push({ year, month, key: `${year}-${String(month).padStart(2, '0')}` });
    month += 1; if (month === 13) { month = 1; year += 1; }
  }
  return result;
}

const monthlyColumns = [studio, text('city','City'), month, number('transactions','Transactions'), currency('revenue','Observed revenue'),
  currency('target','Target'), text('target_basis','Target basis'), currency('target_gap','Target gap'), percent('attainment_percent','Target attainment'),
  currency('prior_revenue','Prior-year revenue'), percent('yoy_percent','YoY growth'), currency('discount','Discount value')];

export const reportDefinitions: ReportDefinition[] = [
  {
    id: 'monthly-performance', name: 'Monthly studio performance', category: 'Executive', evidence: 'Actuals + targets', period: 'actual',
    description: 'Month-by-month revenue, transactions, target basis, attainment, gap, prior-year comparison and discount exposure.',
    columns: monthlyColumns, summary: [sum('revenue','Observed revenue'),sum('target','Comparable target'),ratio('attainment','Attainment','revenue','target'),ratio('yoy','YoY growth','revenue','prior_revenue','percent',-1)],
    chart: chart('month',[moneySeries('revenue','Observed'),moneySeries('target','Target'),moneySeries('prior_revenue','Prior year')],'line'),
    notes: [...actualNotes, ...planningNotes, 'Target uses approved target when present, otherwise proposed target; the basis is shown per row.'], defaultSort: { key: 'month', direction: 'asc' }, run: monthlyRows,
  },
  {
    id: 'annual-studio-performance', name: 'Studio performance summary', category: 'Executive', evidence: 'Actuals + targets', period: 'actual',
    description: 'Consolidated studio scorecard with observed months, revenue, AOV, streams, target attainment and YoY growth for any period.',
    columns: [studio,text('city','City'),number('months','Period months'),number('observed_months','Observed months'),number('transactions','Transactions'),currency('revenue','Observed revenue'),currency('aov','Average transaction'),currency('target','Target'),currency('target_gap','Target gap'),percent('attainment_percent','Target attainment'),currency('prior_revenue','Prior-year revenue'),percent('yoy_percent','YoY growth'),currency('new_client','First observed purchase revenue'),currency('renewal','Inferred renewal revenue'),currency('discount','Discount value')],
    summary: [sum('revenue','Observed revenue'),sum('target','Target'),ratio('attainment','Attainment','revenue','target'),ratio('yoy','YoY growth','revenue','prior_revenue','percent',-1)],
    chart: chart('studio',[moneySeries('revenue','Observed'),moneySeries('target','Target')]), notes: [...actualNotes,...planningNotes,'Observed-month counts distinguish missing periods from genuine zero-revenue periods.'], defaultSort: { key: 'revenue', direction: 'desc' }, run: annualStudioRows,
  },
  {
    id: 'revenue-streams', name: 'Revenue stream mix', category: 'Executive', evidence: 'Historical actuals', period: 'actual',
    description: 'First observed purchase, inferred renewal, reactivation and additional-purchase revenue by studio and month.',
    columns: [studio,month,currency('revenue','Total revenue'),currency('new_client','First observed purchase'),currency('renewal','Inferred renewal'),currency('reactivation','Inferred reactivation'),currency('additional','Additional purchase')],
    summary: [sum('revenue','Total revenue'),sum('new_client','First observed purchase'),sum('renewal','Inferred renewal'),sum('reactivation','Inferred reactivation')],
    chart: chart('month',[moneySeries('new_client','First purchase'),moneySeries('renewal','Renewal'),moneySeries('reactivation','Reactivation'),moneySeries('additional','Additional')]),
    notes: [...actualNotes,'Revenue streams are classifications from observed purchase timing, not perfect customer-lifetime cohorts.'], defaultSort: { key: 'month', direction: 'asc' },
    run: options => monthlyRows(options).map(row => ({ studio_id: row.studio_id, studio: row.studio, month: row.month, revenue: row.revenue, new_client: row.new_client, renewal: row.renewal, reactivation: row.reactivation, additional: row.additional })).filter(row => row.revenue !== null),
  },
  {
    id: 'target-attainment', name: 'Target attainment & gap register', category: 'Executive', evidence: 'Planning + actuals', period: 'planning',
    description: 'Proposed/approved targets, baseline forecasts, actual revenue where available, attainment and remaining gap.',
    columns: [studio,month,text('scenario','Scenario'),currency('baseline_forecast','Baseline forecast'),currency('proposed_target','Proposed target'),currency('approved_target','Approved target'),currency('target','Reporting target'),text('target_basis','Target basis'),currency('revenue','Observed revenue'),currency('target_gap','Remaining gap'),percent('attainment_percent','Attainment')],
    summary: [sum('target','Reporting target'),sum('revenue','Observed revenue'),sum('target_gap','Remaining gap'),ratio('attainment','Attainment','revenue','target')],
    chart: chart('month',[moneySeries('baseline_forecast','Baseline'),moneySeries('target','Target'),moneySeries('revenue','Observed')],'line'), notes: [...planningNotes,...actualNotes], defaultSort: { key: 'month', direction: 'asc' },
    run: options => monthlyRows(options).filter(row => row.target !== null && row.target !== undefined),
  },
  {
    id: 'target-scenarios', name: 'Nominal / standard / aggressive scenarios', category: 'Executive', evidence: 'Unsaved planning scenario', period: 'planning', scenarioFilter: true,
    description: 'Recalculate a selected target posture from comparable actuals and preserved assumptions without changing saved targets.',
    columns: [studio,month,text('scenario','Scenario'),currency('comparable_revenue','Comparable actual'),currency('baseline_forecast','Standard baseline'),currency('proposed_target','Scenario target'),percent('target_growth_percent','Growth vs comparable'),currency('rent_minimum','Rent guardrail minimum'),currency('rent_maximum','Rent guardrail maximum')],
    summary: [sum('proposed_target','Scenario target'),sum('comparable_revenue','Comparable actual'),sum('baseline_forecast','Standard baseline'),ratio('growth','Target growth','proposed_target','comparable_revenue','percent',-1)],
    chart: chart('month',[moneySeries('comparable_revenue','Comparable'),moneySeries('baseline_forecast','Baseline'),moneySeries('proposed_target','Scenario')],'line'),
    notes: ['Read-only scenario calculation. No target, approval or version is changed.', 'Kemps Corner 2027 retains monthly seasonality inside the ₹30–40L user-directed guardrail.', 'Aggressive is a planning posture, not a forecast or approved decision.'], defaultSort: { key: 'month', direction: 'asc' },
    run: options => {
      const studios = db.prepare(`SELECT id,name FROM studios WHERE active=1 ${options.studio ? 'AND id=?' : ''} ORDER BY name`).all(...(options.studio ? [options.studio] : [])) as any[];
      const scenario = options.scenario || 'standard', rows: any[] = [];
      for (const item of studios) for (const period of monthsBetween(options.from, options.to)) {
        const rec = recommendTarget(item.id, period.year, period.month, scenario), assumptions = JSON.parse(rec.assumptions);
        rows.push({ studio_id: item.id, studio: item.name, month: period.key, scenario, comparable_revenue: rec.historical_revenue,
          baseline_forecast: rec.baseline_forecast, proposed_target: rec.proposed_target, target_growth_percent: rec.target_growth,
          rent_minimum: assumptions.rentAdjustment?.minimumTarget ?? null, rent_maximum: assumptions.rentAdjustment?.maximumTarget ?? null });
      }
      return rows;
    },
  },
  {
    id: 'product-performance', name: 'Product & package performance', category: 'Commercial', evidence: 'Historical actuals', period: 'actual',
    description: 'Revenue, transactions, observed buyers, AOV, first purchases and discount value by sold product and studio.',
    columns: [studio,text('product','Product'),text('category','Category'),number('transactions','Transactions'),number('buyers','Observed buyers'),currency('revenue','Revenue'),currency('aov','Average transaction'),number('first_purchases','First observed purchases'),currency('discount','Discount value'),percent('discount_percent','Discount exposure')],
    summary: [sum('revenue','Revenue'),sum('transactions','Transactions','number'),sum('buyers','Observed buyers','number'),sum('discount','Discount value')],
    chart: chart('product',[moneySeries('revenue','Revenue'),moneySeries('discount','Discount')]), notes: [...actualNotes,'Observed buyers counts distinct pseudonymous member references in the filtered sales rows; it is not a lifetime unique-customer count.'], defaultSort: { key: 'revenue', direction: 'desc' },
    run: options => (db.prepare(`SELECT t.studio_id,s.name studio,COALESCE(t.product_name,'Unmapped product') product,COALESCE(t.category,'Unmapped') category,
      COUNT(*) transactions,COUNT(DISTINCT t.member_ref) buyers,SUM(t.amount) revenue,AVG(t.amount) aov,SUM(t.is_first_observed) first_purchases,SUM(t.discount_amount) discount
      FROM transactions t JOIN studios s ON s.id=t.studio_id WHERE t.month BETWEEN ? AND ? ${scoped(options,'t.studio_id')}
      GROUP BY t.studio_id,t.product_name,t.category ORDER BY revenue DESC`).all(...periodParams(options)) as any[]).map(row => ({ ...row, discount_percent: row.revenue + row.discount > 0 ? row.discount / (row.revenue + row.discount) * 100 : null })),
  },
  {
    id: 'discount-exposure', name: 'Discount exposure & revenue quality', category: 'Commercial', evidence: 'Historical actuals', period: 'actual',
    description: 'Discount value and incidence relative to gross collected revenue by studio and month.',
    columns: [studio,month,currency('revenue','Gross collected revenue'),currency('discount','Discount value'),percent('discount_percent','Discount exposure'),number('transactions','Transactions'),number('discounted_transactions','Discounted transactions'),percent('discounted_incidence','Discounted transaction incidence')],
    summary: [sum('revenue','Revenue'),sum('discount','Discount value'),ratio('exposure','Discount exposure','discount','revenue','percent',0,'discount'),ratio('incidence','Discounted incidence','discounted_transactions','transactions')],
    chart: chart('month',[moneySeries('revenue','Revenue'),moneySeries('discount','Discount')],'line'), notes: [...actualNotes,'Discount exposure is discount value divided by gross collected revenue plus discount value. It is not incremental margin loss.'], defaultSort: { key: 'month', direction: 'asc' },
    run: options => (db.prepare(`SELECT t.studio_id,s.name studio,t.month,SUM(t.amount) revenue,SUM(t.discount_amount) discount,COUNT(*) transactions,
      SUM(CASE WHEN t.discount_amount>0 THEN 1 ELSE 0 END) discounted_transactions FROM transactions t JOIN studios s ON s.id=t.studio_id
      WHERE t.month BETWEEN ? AND ? ${scoped(options,'t.studio_id')} GROUP BY t.studio_id,t.month ORDER BY t.month,s.name`).all(...periodParams(options)) as any[]).map(row => ({ ...row,
        discount_percent: row.revenue + row.discount > 0 ? row.discount / (row.revenue + row.discount) * 100 : null,
        discounted_incidence: row.transactions ? row.discounted_transactions / row.transactions * 100 : null })),
  },
  {
    id: 'offer-portfolio', name: 'Offer portfolio & economics', category: 'Commercial', evidence: 'Mixed evidence', period: 'planning', dataModeFilter: true,
    statusOptions: ['draft','under_review','approved','scheduled','active','paused','completed','archived','rejected'],
    description: 'Detailed offer register with audience, scenario economics, observed outcomes, approval, generation source and data mode.',
    columns: [text('offer_uid','Offer ID'),text('name','Offer'),studio,text('objective','Objective'),text('audience','Audience'),text('offer_type','Mechanism'),currency('expected_asp','Expected ASP'),currency('expected_revenue','Scenario revenue'),percent('effective_discount','Customer benefit'),currency('actual_revenue','Observed attributed revenue'),number('actual_redemptions','Observed redemptions'),text('status','Status'),text('approval_status','Approval'),text('generation_source','Generation source'),text('data_mode','Data mode'),text('validity_start','Valid from'),text('validity_end','Valid until')],
    summary: [count('Offers in scope'),sum('expected_revenue','Scenario revenue'),sum('actual_revenue','Observed attributed revenue'),sum('actual_redemptions','Observed redemptions','number')],
    chart: chart('name',[moneySeries('expected_revenue','Scenario'),moneySeries('actual_revenue','Observed')]), notes: [...planningNotes,'Observed attributed revenue is not proven incremental lift. Customer benefit may include separately disclosed perks, not only cash discount.','Unscheduled offers remain in scope; scheduled offers are filtered by their planning year/month.'], defaultSort: { key: 'expected_revenue', direction: 'desc' },
    run: options => {
      const params: any[] = [periodNumber(options.from),periodNumber(options.to)]; let filter = '';
      if (options.studio) { filter += ' AND o.studio_id=?'; params.push(options.studio); }
      if (options.status) { filter += ' AND o.status=?'; params.push(options.status); }
      if (options.dataMode) { filter += ' AND o.data_mode=?'; params.push(options.dataMode); }
      return db.prepare(`SELECT o.offer_uid,o.name,o.studio_id,s.name studio,o.objective,o.audience,o.offer_type,o.expected_asp,o.expected_revenue,o.effective_discount,
        o.actual_revenue,o.actual_redemptions,o.status,o.approval_status,o.generation_source,o.data_mode,o.validity_start,o.validity_end
        FROM offers o LEFT JOIN studios s ON s.id=o.studio_id WHERE (o.year IS NULL OR o.month IS NULL OR (o.year*100+o.month) BETWEEN ? AND ?) ${filter}
        ORDER BY o.updated_at DESC`).all(...params);
    },
  },
  {
    id: 'campaign-performance', name: 'Campaign plan vs observed performance', category: 'Commercial', evidence: 'Planning + attributed actuals', period: 'actual', dataModeFilter: true,
    statusOptions: ['draft','scheduled','active','paused','completed','archived'],
    description: 'Campaign timing, targets, recorded reach/buyers/revenue, AOV, gap and data-mode provenance.',
    columns: [text('campaign','Campaign'),studio,text('start_date','Start date'),text('end_date','End date'),text('offer','Linked offer'),text('objective','Objective'),currency('target_revenue','Target revenue'),currency('actual_revenue','Observed attributed revenue'),currency('revenue_gap','Revenue gap'),number('buyers','Observed buyers'),number('redemptions','Observed redemptions'),currency('aov','Observed AOV'),text('status','Status'),text('data_mode','Data mode')],
    summary: [sum('target_revenue','Target revenue'),sum('actual_revenue','Observed attributed revenue'),sum('revenue_gap','Revenue gap'),sum('buyers','Observed buyers','number')],
    chart: chart('campaign',[moneySeries('target_revenue','Target'),moneySeries('actual_revenue','Observed')]), notes: ['Attributed campaign revenue is not causal or incremental lift.','Demonstration plans remain labelled by data mode and never become observed actuals.'], defaultSort: { key: 'start_date', direction: 'desc' },
    run: options => {
      const params: any[] = [options.from,options.to]; let filter = '';
      if (options.studio) { filter += ' AND c.studio_id=?'; params.push(options.studio); }
      if (options.status) { filter += ' AND c.status=?'; params.push(options.status); }
      if (options.dataMode) { filter += ' AND c.data_mode=?'; params.push(options.dataMode); }
      return (db.prepare(`SELECT c.name campaign,c.studio_id,s.name studio,c.start_date,c.end_date,o.name offer,c.objective,c.target_revenue,
        p.revenue actual_revenue,p.buyers,p.redemptions,p.aov,c.status,c.data_mode FROM campaigns c JOIN studios s ON s.id=c.studio_id
        LEFT JOIN offers o ON o.id=c.offer_id LEFT JOIN campaign_performance p ON p.campaign_id=c.id
        WHERE substr(c.start_date,1,7)<=? AND substr(c.end_date,1,7)>=? ${filter} ORDER BY c.start_date DESC`).all(...params) as any[])
        .map(row => ({ ...row, revenue_gap: row.actual_revenue !== null && row.actual_revenue !== undefined ? row.target_revenue - row.actual_revenue : null }));
    },
  },
  {
    id: 'experiment-register', name: 'Newcomer experiment register', category: 'Commercial', evidence: 'Experiment outcomes only', period: 'planning',
    statusOptions: ['draft','running','paused','completed'],
    description: 'Control/variant linkage, eligibility, buyers, attributed revenue, purchase rates, outcome source and completion status.',
    columns: [text('experiment','Experiment'),studio,text('control_offer','Control'),text('variant_offer','Variant'),text('start_date','Start date'),text('end_date','End date'),text('status','Status'),number('minimum_sample','Minimum sample / arm'),number('control_eligible','Control eligible'),number('control_buyers','Control buyers'),percent('control_purchase_rate','Control purchase rate'),number('variant_eligible','Variant eligible'),number('variant_buyers','Variant buyers'),percent('variant_purchase_rate','Variant purchase rate'),currency('control_revenue','Control attributed revenue'),currency('variant_revenue','Variant attributed revenue'),text('outcome_source','Outcome source')],
    summary: [count('Experiments'),sum('control_eligible','Control eligible','number'),sum('variant_eligible','Variant eligible','number'),ratio('variant_rate','Variant purchase rate','variant_buyers','variant_eligible')],
    notes: ['Drafts contain no assumed outcomes. Monthly cadence does not randomise customers by itself.','Observed rate differences are not statistical significance or automatic causal-lift claims.'], defaultSort: { key: 'start_date', direction: 'desc' },
    run: options => {
      const params: any[] = [options.from,options.to]; let filter = '';
      if (options.studio) { filter += ' AND e.studio_id=?'; params.push(options.studio); }
      if (options.status) { filter += ' AND e.status=?'; params.push(options.status); }
      return (db.prepare(`SELECT e.*,s.name studio,c.name control_offer,v.name variant_offer,e.results FROM offer_experiments e JOIN studios s ON s.id=e.studio_id
        JOIN offers c ON c.id=e.control_offer_id JOIN offers v ON v.id=e.variant_offer_id
        WHERE substr(e.start_date,1,7)<=? AND substr(COALESCE(e.end_date,'9999-12-31'),1,7)>=? ${filter} ORDER BY e.start_date DESC`).all(...params) as any[])
        .map(row => { const results = JSON.parse(row.results || '{}'), control = results.control || {}, variant = results.variant || {}; return {
          experiment: row.name, studio_id: row.studio_id, studio: row.studio, control_offer: row.control_offer, variant_offer: row.variant_offer,
          start_date: row.start_date, end_date: row.end_date, status: row.status, minimum_sample: row.minimum_sample,
          control_eligible: control.eligible ?? null, control_buyers: control.buyers ?? null, control_purchase_rate: control.eligible > 0 ? control.buyers / control.eligible * 100 : null,
          variant_eligible: variant.eligible ?? null, variant_buyers: variant.buyers ?? null, variant_purchase_rate: variant.eligible > 0 ? variant.buyers / variant.eligible * 100 : null,
          control_revenue: control.revenue ?? null, variant_revenue: variant.revenue ?? null, outcome_source: results.source || null }; });
    },
  },
  {
    id: 'lead-sources', name: 'Lead source & conversion snapshot', category: 'Commercial', evidence: 'Current-state lead snapshot', period: 'actual',
    description: 'Lead volume, recorded conversion state, purchases, visits and attributed LTV by source, campaign and studio.',
    columns: [studio,text('source','Lead source'),text('campaign','Campaign'),number('leads','Leads'),number('conversions','Recorded conversions'),percent('conversion_percent','Recorded conversion'),number('purchases','Recorded purchases'),number('visits','Recorded visits'),currency('ltv','Attributed LTV')],
    summary: [sum('leads','Leads','number'),sum('conversions','Recorded conversions','number'),ratio('conversion','Recorded conversion','conversions','leads'),sum('ltv','Attributed LTV')],
    chart: chart('source',[countSeries('leads','Leads'),countSeries('conversions','Conversions')]), notes: ['The lead file is a current-state snapshot, not a dated booking-event log. Recorded conversion is not a trial-specific funnel rate.','Attributed LTV is source data, not incremental campaign lift.'], defaultSort: { key: 'leads', direction: 'desc' },
    run: options => (db.prepare(`SELECT l.studio_id,s.name studio,COALESCE(l.source_name,'Unmapped') source,COALESCE(l.campaign,'Unmapped') campaign,
      COUNT(*) leads,SUM(CASE WHEN l.converted_at IS NOT NULL THEN 1 ELSE 0 END) conversions,SUM(l.purchases) purchases,SUM(l.visits) visits,SUM(l.ltv) ltv
      FROM leads l JOIN studios s ON s.id=l.studio_id WHERE l.month BETWEEN ? AND ? ${scoped(options,'l.studio_id')}
      GROUP BY l.studio_id,l.source_name,l.campaign ORDER BY leads DESC`).all(...periodParams(options)) as any[])
      .map(row => ({ ...row, conversion_percent: row.leads ? row.conversions / row.leads * 100 : null })),
  },
  {
    id: 'renewal-due', name: 'Membership renewals due', category: 'Retention', evidence: 'Current package snapshot', period: 'planning',
    description: 'Aggregate open packages expiring by month, with paid due, matched current list MRP, value coverage and zero-value rows.',
    columns: [studio,month,number('due_packages','Open packages due'),currency('paid_due_value','Known paid due value'),number('paid_value_packages','Packages with paid value'),percent('paid_coverage','Paid-value coverage'),currency('list_due_value','Matched current list value'),number('list_matched_packages','Packages with matched MRP'),percent('list_coverage','List-MRP coverage'),number('zero_amount_due','Zero-value due rows')],
    summary: [sum('due_packages','Packages due','number'),sum('paid_due_value','Known paid due value'),sum('list_due_value','Matched list value'),ratio('paid_coverage','Paid-value coverage','paid_value_packages','due_packages')],
    chart: chart('month',[moneySeries('paid_due_value','Paid due'),moneySeries('list_due_value','List due')],'line'),
    notes: ['Only Active, New and Frozen open packages are due; Renewed and Lapsed rows are excluded.','Paid due, current list MRP and historical renewal revenue are different measures. No future conversion is assumed.','Future package coverage is incomplete and outliers must be reviewed.'], defaultSort: { key: 'month', direction: 'asc' },
    run: options => (db.prepare(`SELECT cp.studio_id,s.name studio,substr(cp.end_date,1,7) month,COUNT(*) due_packages,
      SUM(CASE WHEN cp.amount>0 THEN cp.amount ELSE 0 END) paid_due_value,SUM(CASE WHEN cp.amount>0 THEN 1 ELSE 0 END) paid_value_packages,
      SUM(CASE WHEN p.list_price>0 THEN p.list_price ELSE 0 END) list_due_value,SUM(CASE WHEN p.list_price>0 THEN 1 ELSE 0 END) list_matched_packages,
      SUM(CASE WHEN cp.amount=0 THEN 1 ELSE 0 END) zero_amount_due
      FROM customer_packages cp JOIN studios s ON s.id=cp.studio_id LEFT JOIN products p ON p.studio_id=cp.studio_id AND p.name=cp.product_name AND p.active=1
      WHERE cp.status IN ('Active','New','Frozen') AND substr(cp.end_date,1,7) BETWEEN ? AND ? ${scoped(options,'cp.studio_id')}
      GROUP BY cp.studio_id,substr(cp.end_date,1,7) ORDER BY month,s.name`).all(...periodParams(options)) as any[])
      .map(row => ({ ...row, paid_coverage: row.due_packages ? row.paid_value_packages / row.due_packages * 100 : null,
        list_coverage: row.due_packages ? row.list_matched_packages / row.due_packages * 100 : null })),
  },
  {
    id: 'package-lifecycle', name: 'Customer package lifecycle', category: 'Retention', evidence: 'Current package snapshot', period: 'actual',
    statusOptions: ['Active','New','Frozen','Renewed','Lapsed'],
    description: 'Aggregate package counts, paid value, session limits, usage and utilisation by product and lifecycle status.',
    columns: [studio,text('product','Product'),text('status','Lifecycle status'),number('packages','Packages'),currency('paid_value','Recorded paid value'),currency('discount','Discount value'),number('sessions_limit','Session limit'),number('sessions_used','Sessions used'),percent('utilisation_percent','Session utilisation')],
    summary: [sum('packages','Packages','number'),sum('paid_value','Recorded paid value'),sum('sessions_used','Sessions used','number'),ratio('utilisation','Session utilisation','sessions_used','sessions_limit')],
    chart: chart('status',[countSeries('packages','Packages')]), notes: ['Aggregate only; no customer identifiers are exposed. Package status is the imported lifecycle snapshot, not a predicted churn label.','Blank session limits are not treated as unlimited usage or zero utilisation.'], defaultSort: { key: 'paid_value', direction: 'desc' },
    run: options => {
      const params = periodParams(options); let filter = ''; if (options.status) { filter = ' AND cp.status=?'; params.push(options.status); }
      return (db.prepare(`SELECT cp.studio_id,s.name studio,COALESCE(cp.product_name,'Unmapped') product,COALESCE(cp.status,'Unknown') status,COUNT(*) packages,
        SUM(cp.amount) paid_value,SUM(cp.discount_amount) discount,SUM(cp.sessions_limit) sessions_limit,SUM(cp.sessions_used) sessions_used
        FROM customer_packages cp JOIN studios s ON s.id=cp.studio_id WHERE substr(cp.purchase_date,1,7) BETWEEN ? AND ? ${scoped(options,'cp.studio_id')} ${filter}
        GROUP BY cp.studio_id,cp.product_name,cp.status ORDER BY paid_value DESC`).all(...params) as any[])
        .map(row => ({ ...row, utilisation_percent: row.sessions_limit > 0 ? row.sessions_used / row.sessions_limit * 100 : null }));
    },
  },
  {
    id: 'historical-renewal-revenue', name: 'Historical renewal-coded revenue', category: 'Retention', evidence: 'Historical actuals', period: 'actual',
    description: 'Observed transactions classified as renewals by month and studio, kept separate from the forward due register.',
    columns: [studio,month,number('transactions','Renewal-coded transactions'),currency('revenue','Renewal-coded revenue'),currency('aov','Average renewal transaction'),currency('discount','Discount value')],
    summary: [sum('revenue','Renewal-coded revenue'),sum('transactions','Transactions','number'),sum('discount','Discount value')],
    chart: chart('month',[moneySeries('revenue','Renewal-coded revenue')],'line'), notes: [...actualNotes,'This transaction classification is not joined to the forward renewal-due cohort and is not proof of retention incrementality.'], defaultSort: { key: 'month', direction: 'asc' },
    run: options => db.prepare(`SELECT t.studio_id,s.name studio,t.month,COUNT(*) transactions,SUM(t.amount) revenue,AVG(t.amount) aov,SUM(t.discount_amount) discount
      FROM transactions t JOIN studios s ON s.id=t.studio_id WHERE t.revenue_stream='renewal' AND t.month BETWEEN ? AND ? ${scoped(options,'t.studio_id')}
      GROUP BY t.studio_id,t.month ORDER BY t.month,s.name`).all(...periodParams(options)),
  },
  {
    id: 'attendance-cancellations', name: 'Attendance & late cancellations', category: 'Operations', evidence: 'Checkins actuals', period: 'actual',
    description: 'Bookings, check-ins, late cancellations, other non-check-ins, complimentary visits and behaviour rates by month.',
    columns: [studio,month,number('bookings','Bookings'),number('checkins','Check-ins'),number('late_cancellations','Late cancellations'),number('other_not_checked','Other non-check-ins'),number('complimentary','Complimentary check-ins'),percent('checkin_rate','Check-in rate'),percent('late_cancellation_rate','Late-cancellation rate')],
    summary: [sum('bookings','Bookings','number'),sum('checkins','Check-ins','number'),ratio('checkin_rate','Check-in rate','checkins','bookings'),ratio('late_rate','Late-cancellation rate','late_cancellations','bookings')],
    chart: chart('month',[countSeries('bookings','Bookings'),countSeries('checkins','Check-ins'),countSeries('late_cancellations','Late cancellations')],'line'), notes: attendanceNotes, defaultSort: { key: 'month', direction: 'asc' },
    run: options => (db.prepare(`SELECT c.studio_id,s.name studio,c.month,COUNT(*) bookings,SUM(c.checked_in) checkins,SUM(c.late_cancelled) late_cancellations,
      SUM(CASE WHEN c.checked_in=0 AND c.late_cancelled=0 THEN 1 ELSE 0 END) other_not_checked,SUM(CASE WHEN c.checked_in=1 THEN c.complimentary ELSE 0 END) complimentary
      FROM checkins c JOIN studios s ON s.id=c.studio_id WHERE c.month BETWEEN ? AND ? AND c.session_at<strftime('%s','now','start of day') ${scoped(options,'c.studio_id')}
      GROUP BY c.studio_id,c.month ORDER BY c.month,s.name`).all(...periodParams(options)) as any[])
      .map(row => ({ ...row, checkin_rate: row.bookings ? row.checkins / row.bookings * 100 : null, late_cancellation_rate: row.bookings ? row.late_cancellations / row.bookings * 100 : null })),
  },
  {
    id: 'class-attendance', name: 'Class-level attendance review', category: 'Operations', evidence: 'Checkins actuals', period: 'actual',
    description: 'Class-level booking volume, attendance, late cancellations and other non-check-ins for operational review.',
    columns: [studio,text('class_name','Class'),number('bookings','Bookings'),number('checkins','Check-ins'),number('late_cancellations','Late cancellations'),number('other_not_checked','Other non-check-ins'),percent('checkin_rate','Check-in rate'),percent('late_cancellation_rate','Late-cancellation rate')],
    summary: [sum('bookings','Bookings','number'),sum('checkins','Check-ins','number'),ratio('checkin_rate','Check-in rate','checkins','bookings'),ratio('late_rate','Late-cancellation rate','late_cancellations','bookings')],
    chart: chart('class_name',[countSeries('bookings','Bookings'),countSeries('checkins','Check-ins'),countSeries('late_cancellations','Late cancellations')]), notes: [...attendanceNotes,'Small class groups can produce volatile rates; review numerator and denominator before acting.'], defaultSort: { key: 'bookings', direction: 'desc' },
    run: options => (db.prepare(`SELECT c.studio_id,s.name studio,COALESCE(c.class_name,'Unmapped class') class_name,COUNT(*) bookings,SUM(c.checked_in) checkins,
      SUM(c.late_cancelled) late_cancellations,SUM(CASE WHEN c.checked_in=0 AND c.late_cancelled=0 THEN 1 ELSE 0 END) other_not_checked
      FROM checkins c JOIN studios s ON s.id=c.studio_id WHERE c.month BETWEEN ? AND ? AND c.session_at<strftime('%s','now','start of day') ${scoped(options,'c.studio_id')}
      GROUP BY c.studio_id,c.class_name ORDER BY bookings DESC`).all(...periodParams(options)) as any[])
      .map(row => ({ ...row, checkin_rate: row.bookings ? row.checkins / row.bookings * 100 : null, late_cancellation_rate: row.bookings ? row.late_cancellations / row.bookings * 100 : null })),
  },
  {
    id: 'trainer-delivery', name: 'Trainer delivery snapshot', category: 'Operations', evidence: 'Payroll/trainer report', period: 'actual',
    description: 'Trainer-month sessions, customers, paid value, new clients and unweighted conversion/retention averages.',
    columns: [studio,text('trainer','Trainer'),number('report_months','Report months'),number('sessions','Sessions'),number('customers','Customers'),currency('paid_revenue','Paid value'),number('new_clients','New clients'),percent('conversion_rate','Average conversion'),percent('retention_rate','Average retention')],
    summary: [sum('sessions','Sessions','number'),sum('customers','Customers','number'),sum('paid_revenue','Paid value'),sum('new_clients','New clients','number')],
    chart: chart('trainer',[moneySeries('paid_revenue','Paid value')]), notes: ['Paid value comes from the imported trainer/payroll report and is not added to transaction revenue.','Conversion and retention are unweighted averages across available trainer-month rows, consistent with Studio Intelligence.'], defaultSort: { key: 'paid_revenue', direction: 'desc' },
    run: options => db.prepare(`SELECT t.studio_id,s.name studio,COALESCE(t.trainer_name,t.trainer_ref) trainer,COUNT(*) report_months,SUM(t.total_sessions) sessions,
      SUM(t.customers) customers,SUM(t.paid_revenue) paid_revenue,SUM(t.new_clients) new_clients,AVG(t.conversion_rate)*100 conversion_rate,AVG(t.retention_rate)*100 retention_rate
      FROM trainer_performance t JOIN studios s ON s.id=t.studio_id WHERE t.month BETWEEN ? AND ? ${scoped(options,'t.studio_id')}
      GROUP BY t.studio_id,t.trainer_ref ORDER BY paid_revenue DESC`).all(...periodParams(options)),
  },
  {
    id: 'studio-capacity', name: 'Scheduled capacity & utilisation', category: 'Operations', evidence: 'Class-session actuals', period: 'actual',
    description: 'Scheduled sessions, capacity, booked and checked-in values with explicit fill and attendance calculations.',
    columns: [studio,month,number('sessions','Scheduled sessions'),number('capacity','Scheduled capacity'),number('booked','Booked'),number('checked_in','Checked in'),percent('booking_fill_rate','Booking fill rate'),percent('capacity_attendance_rate','Capacity attendance rate')],
    summary: [sum('sessions','Sessions','number'),sum('capacity','Scheduled capacity','number'),ratio('fill','Booking fill rate','booked','capacity'),ratio('attendance','Capacity attendance','checked_in','capacity')],
    chart: chart('month',[countSeries('capacity','Capacity'),countSeries('booked','Booked'),countSeries('checked_in','Checked in')],'line'),
    notes: ['Scheduled capacity is not a reservation-system guarantee. Zero or missing booked values remain as sourced and are not imputed.'], defaultSort: { key: 'month', direction: 'asc' },
    run: options => (db.prepare(`SELECT c.studio_id,s.name studio,c.month,COUNT(*) sessions,SUM(c.capacity) capacity,SUM(c.booked) booked,SUM(c.checked_in) checked_in
      FROM class_sessions c JOIN studios s ON s.id=c.studio_id WHERE c.month BETWEEN ? AND ? ${scoped(options,'c.studio_id')}
      GROUP BY c.studio_id,c.month ORDER BY c.month,s.name`).all(...periodParams(options)) as any[])
      .map(row => ({ ...row, booking_fill_rate: row.capacity > 0 ? row.booked / row.capacity * 100 : null,
        capacity_attendance_rate: row.capacity > 0 ? row.checked_in / row.capacity * 100 : null })),
  },
  {
    id: 'import-provenance', name: 'Import lineage & reconciliation', category: 'Governance', evidence: 'Import metadata', period: 'actual', studioFilter: false,
    statusOptions: ['uploaded','validating','validated','committing','committed','failed'],
    description: 'Source file, category, worksheet, processing status, valid/invalid/duplicate counts and committed rows.',
    columns: [number('id','Import ID'),text('filename','Source file'),text('category','Category'),text('worksheet','Worksheet'),text('status','Status'),number('total_rows','Source rows'),number('valid_rows','Valid rows'),number('invalid_rows','Invalid rows'),number('duplicate_rows','Duplicates'),number('imported_rows','Committed rows'),text('created_at','Created at'),text('completed_at','Completed at')],
    summary: [count('Imports'),sum('total_rows','Source rows','number'),sum('imported_rows','Committed rows','number'),sum('invalid_rows','Invalid rows','number')],
    chart: chart('category',[countSeries('total_rows','Source rows'),countSeries('imported_rows','Committed'),countSeries('invalid_rows','Invalid')]),
    notes: ['Invalid and duplicate rows are reported rather than silently discarded. Source files and row-level errors remain separate from this aggregate lineage report.'], defaultSort: { key: 'id', direction: 'desc' },
    run: options => {
      const params = periodParams(options).slice(0,2); let filter = '';
      if (options.status) { filter = ' AND status=?'; params.push(options.status); }
      return db.prepare(`SELECT id,filename,category,worksheet,status,total_rows,valid_rows,invalid_rows,duplicate_rows,imported_rows,created_at,completed_at
        FROM imports WHERE substr(created_at,1,7) BETWEEN ? AND ? ${filter} ORDER BY id DESC`).all(...params);
    },
  },
  {
    id: 'data-quality', name: 'Studio data-quality & coverage', category: 'Governance', evidence: 'Coverage diagnostics', period: 'actual',
    description: 'Row coverage, latest observed sales month, future Checkins, negative values and missing package end dates by studio.',
    columns: [studio,text('city','City'),number('sales_rows','Sales rows'),text('latest_sales_month','Latest sales month'),number('negative_sales_rows','Negative sales rows'),number('checkin_rows','Behavioural Checkins rows'),number('future_checkin_rows','Current/future Checkins rows'),number('package_rows','Package rows'),number('missing_package_end_dates','Missing package end dates')],
    summary: [sum('sales_rows','Sales rows','number'),sum('checkin_rows','Behavioural Checkins rows','number'),sum('future_checkin_rows','Current/future rows','number'),sum('missing_package_end_dates','Missing package end dates','number')],
    chart: chart('studio',[countSeries('sales_rows','Sales'),countSeries('checkin_rows','Checkins'),countSeries('package_rows','Packages')]),
    notes: ['Diagnostics flag review work; they do not invent reconciliation or silently repair source data.','Behavioural Checkins excludes current/future sessions, which are shown separately. Package rows use purchase month for period scope; missing end dates are a current-scope quality flag.'], defaultSort: { key: 'studio', direction: 'asc' },
    run: options => {
      const studios = db.prepare(`SELECT id,name,city FROM studios WHERE active=1 ${options.studio ? 'AND id=?' : ''} ORDER BY name`).all(...(options.studio ? [options.studio] : [])) as any[];
      return studios.map(item => {
        const sales = db.prepare('SELECT COUNT(*) rows,MAX(month) latest,SUM(CASE WHEN amount<0 THEN 1 ELSE 0 END) negative FROM transactions WHERE studio_id=? AND month BETWEEN ? AND ?').get(item.id,options.from,options.to) as any;
        const attendance = db.prepare(`SELECT SUM(CASE WHEN session_at<strftime('%s','now','start of day') THEN 1 ELSE 0 END) actual_rows,
          SUM(CASE WHEN session_at>=strftime('%s','now','start of day') THEN 1 ELSE 0 END) future_rows FROM checkins WHERE studio_id=? AND month BETWEEN ? AND ?`).get(item.id,options.from,options.to) as any;
        const packages = db.prepare('SELECT COUNT(*) rows,SUM(CASE WHEN end_date IS NULL OR end_date=\'\' THEN 1 ELSE 0 END) missing_end FROM customer_packages WHERE studio_id=? AND substr(purchase_date,1,7) BETWEEN ? AND ?').get(item.id,options.from,options.to) as any;
        return { studio_id: item.id, studio: item.name, city: item.city, sales_rows: sales.rows || 0, latest_sales_month: sales.latest,
          negative_sales_rows: sales.negative || 0, checkin_rows: attendance.actual_rows || 0, future_checkin_rows: attendance.future_rows || 0,
          package_rows: packages.rows || 0, missing_package_end_dates: packages.missing_end || 0 };
      });
    },
  },
  {
    id: 'audit-activity', name: 'Audit activity summary', category: 'Governance', evidence: 'Audit metadata', period: 'actual', requiresPermission: 'settings',
    description: 'Privacy-conscious event counts by day, actor, action, entity and studio; excludes before/after payloads.',
    columns: [text('day','Day'),text('user','Actor'),text('action','Action'),text('entity_type','Entity'),studio,number('events','Events'),text('latest_at','Latest event')],
    summary: [sum('events','Audit events','number'),count('Grouped activity rows')], chart: chart('day',[countSeries('events','Events')],'line'),
    notes: ['Only aggregate event metadata is included. Before/after payloads, session tokens and customer-level records are not exported by this report.'], defaultSort: { key: 'day', direction: 'desc' },
    run: options => {
      const params: any[] = [options.from,options.to]; let filter = ''; if (options.studio) { filter = ' AND a.studio_id=?'; params.push(options.studio); }
      return db.prepare(`SELECT date(a.created_at) day,COALESCE(u.name,'System') user,a.action,a.entity_type,COALESCE(s.name,'Not studio-specific') studio,
        COUNT(*) events,MAX(a.created_at) latest_at FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id LEFT JOIN studios s ON s.id=a.studio_id
        WHERE substr(a.created_at,1,7) BETWEEN ? AND ? ${filter} GROUP BY day,user,action,entity_type,studio ORDER BY day DESC,events DESC`).all(...params);
    },
  },
];

const definitionMap = new Map(reportDefinitions.map(definition => [definition.id, definition]));
export function reportSupportsStudio(report: string) { return definitionMap.get(report)?.studioFilter !== false; }
const monthPattern = /^(20\d{2})-(0[1-9]|1[0-2])$/;
function error(message: string, status = 422) { return Object.assign(new Error(message), { status }); }
function parseMonth(value: any, label: string) {
  const text = String(value || ''); if (!monthPattern.test(text)) throw error(`${label} must be a valid YYYY-MM month.`);
  const year = Number(text.slice(0,4)); if (year < 2020 || year > 2100) throw error(`${label} is outside the supported planning range.`);
  return text;
}
function list(value: any) {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return undefined;
  return String(value).split(',').map(item => item.trim()).filter(Boolean);
}

export function parseReportOptions(input: any, exportMode = false): ReportOptions {
  const report = String(input.report || input.type || ''); const definition = definitionMap.get(report);
  if (!definition) throw error('Unknown advanced report type.',404);
  const from = parseMonth(input.from,'From month'), to = parseMonth(input.to,'To month');
  if (from > to) throw error('From month cannot be after To month.');
  if (monthsBetween(from,to).length > 60) throw error('Report period cannot exceed 60 months. Narrow the selected range.');
  const studio = input.studio === undefined || input.studio === null || input.studio === '' || input.studio === 'all' ? undefined : Number(input.studio);
  if (studio !== undefined && (!Number.isInteger(studio) || studio < 1)) throw error('Invalid studio identifier.',400);
  if (studio !== undefined && definition.studioFilter === false) throw error(`${definition.name} is a consolidated business report and does not accept a studio filter.`);
  if (studio !== undefined && !db.prepare('SELECT id FROM studios WHERE id=? AND active=1').get(studio)) throw error('Studio not found or inactive.',404);
  const status = input.status ? String(input.status) : undefined;
  if (status && !definition.statusOptions) throw error(`${definition.name} does not support a status filter.`);
  if (status && !definition.statusOptions!.includes(status)) throw error('Unsupported status for this report.');
  const dataMode = input.dataMode ? String(input.dataMode) : undefined;
  if (dataMode && !definition.dataModeFilter) throw error(`${definition.name} does not support a data-mode filter.`);
  if (dataMode && !['actual','scenario','demo','derived','user'].includes(dataMode)) throw error('Unsupported data mode.');
  const scenario = input.scenario ? String(input.scenario) as TargetScenario : undefined;
  if (scenario && !definition.scenarioFilter) throw error(`${definition.name} does not support target-scenario selection.`);
  if (scenario && !['nominal','standard','aggressive'].includes(scenario)) throw error('Unsupported target scenario.');
  const limit = input.limit === undefined || input.limit === '' ? (exportMode ? 10000 : 200) : Number(input.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw error('Row limit must be an integer between 1 and 10,000.');
  const direction = String(input.direction || definition.defaultSort?.direction || 'desc');
  if (!['asc','desc'].includes(direction)) throw error('Sort direction must be asc or desc.');
  const sort = input.sort ? String(input.sort) : definition.defaultSort?.key;
  if (sort && !definition.columns.some(column => column.key === sort)) throw error('Unknown report sort column.');
  const columns = list(input.columns);
  if (columns?.length) for (const key of columns) if (!definition.columns.some(column => column.key === key)) throw error(`Unknown report column: ${key}`);
  return { report, from, to, studio, status, dataMode, scenario, limit, sort, direction: direction as 'asc'|'desc',
    search: input.search ? String(input.search).trim().slice(0,100) : undefined, columns };
}

function summaryValue(rows: any[], definition: SummaryDefinition) {
  if (!rows.length) return null;
  if (definition.aggregate === 'count') return rows.length;
  if (definition.aggregate === 'ratio') {
    let numerator = 0, denominator = 0, numeratorSeen = false, denominatorSeen = false;
    for (const row of rows) {
      const top = row[definition.numerator!], bottom = row[definition.denominator!];
      if (top !== null && top !== undefined && Number.isFinite(Number(top))) { numerator += Number(top); numeratorSeen = true; }
      if (bottom !== null && bottom !== undefined && Number.isFinite(Number(bottom))) { denominator += Number(bottom); denominatorSeen = true; }
      if (definition.denominatorAdd) {
        const extra = row[definition.denominatorAdd];
        if (extra !== null && extra !== undefined && Number.isFinite(Number(extra))) denominator += Number(extra);
      }
    }
    if (!numeratorSeen || !denominatorSeen || !denominator) return null;
    const value = numerator / denominator + (definition.offset || 0); return definition.type === 'percent' ? value * 100 : value;
  }
  const values = rows.map(row => row[definition.key]).filter(value => value !== null && value !== undefined && Number.isFinite(Number(value))).map(Number);
  if (!values.length) return null;
  const value = definition.aggregate === 'mean' ? values.reduce((a,b) => a+b,0) / values.length : values.reduce((a,b) => a+b,0);
  return round(value);
}

function chartData(rows: any[], definition: ChartDefinition) {
  const groups = new Map<string,any>();
  for (const row of rows) {
    const x = String(row[definition.x] ?? 'Unmapped'); const current = groups.get(x) || { [definition.x]: x };
    for (const series of definition.series) {
      const value = row[series.key]; if (value === null || value === undefined || !Number.isFinite(Number(value))) continue;
      current[series.key] = Number(current[series.key] || 0) + Number(value);
    }
    groups.set(x,current);
  }
  const result = [...groups.values()];
  const primary = definition.series[0]?.key;
  if (definition.x !== 'month' && definition.x !== 'day' && primary) result.sort((a,b) => Number(b[primary] || 0) - Number(a[primary] || 0));
  return result.slice(0,14);
}

export function runReport(input: any, exportMode = false) {
  const options = parseReportOptions(input,exportMode), definition = definitionMap.get(options.report)!;
  let rows = definition.run(options);
  if (options.search) {
    const needle = options.search.toLowerCase();
    rows = rows.filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(needle)));
  }
  if (options.sort) {
    const key = options.sort, factor = options.direction === 'asc' ? 1 : -1;
    rows = [...rows].sort((a,b) => {
      const left = a[key], right = b[key]; if (left === null || left === undefined) return 1; if (right === null || right === undefined) return -1;
      const numericLeft = Number(left), numericRight = Number(right);
      if (Number.isFinite(numericLeft) && Number.isFinite(numericRight) && `${left}`.trim() !== '' && `${right}`.trim() !== '') return (numericLeft-numericRight)*factor;
      return String(left).localeCompare(String(right)) * factor;
    });
  }
  const totalRows = rows.length, summary = definition.summary.map(item => ({ key: item.key, label: item.label, type: item.type, value: summaryValue(rows,item) }));
  const chartResult = definition.chart ? { ...definition.chart, data: chartData(rows,definition.chart) } : null;
  const truncated = totalRows > options.limit;
  if (exportMode && truncated) throw error(`This report has ${totalRows.toLocaleString('en-IN')} matching rows, above the 10,000-row export limit. Narrow the filters before exporting.`);
  const visibleRows = rows.slice(0,options.limit);
  const selectedColumns = options.columns?.length ? definition.columns.filter(column => options.columns!.includes(column.key)) : definition.columns;
  const projected = visibleRows.map(row => Object.fromEntries(selectedColumns.map(column => [column.key, row[column.key] ?? null])));
  const coverage = dataCoverage();
  return {
    definition: { id: definition.id, name: definition.name, category: definition.category, description: definition.description, evidence: definition.evidence, notes: definition.notes },
    options, columns: selectedColumns, allColumns: definition.columns, rows: projected, summary, chart: chartResult,
    totalRows, returnedRows: projected.length, truncated, generatedAt: new Date().toISOString(),
    provenance: { source: 'P57 SQLite reporting engine', studioScope: options.studio || 'all_accessible', period: `${options.from} → ${options.to}`,
      latestCompleteSalesMonth: latestCompleteMonth(), salesCoverage: coverage.sales, rowLimit: options.limit,
      exportPolicy: 'CSV/XLSX use the same filtered, sorted and column-projected result as this preview. Exports above 10,000 rows are rejected rather than silently truncated.' },
  };
}

export function reportCatalog(permissions: string[] = []) {
  return reportDefinitions.filter(definition => !definition.requiresPermission || permissions.includes(definition.requiresPermission)).map(definition => ({
    id: definition.id, name: definition.name, category: definition.category, description: definition.description, evidence: definition.evidence,
    period: definition.period, columns: definition.columns, summary: definition.summary.map(({key,label,type}) => ({key,label,type})),
    chart: definition.chart ? { kind: definition.chart.kind || 'bar', series: definition.chart.series } : null,
    statusOptions: definition.statusOptions || [], dataModeFilter: Boolean(definition.dataModeFilter), scenarioFilter: Boolean(definition.scenarioFilter), studioFilter: definition.studioFilter !== false,
    defaultSort: definition.defaultSort || null, notes: definition.notes,
  }));
}

export function reportDefaults() {
  const latestSale = String(dataCoverage().sales.last || '2026-10-22').slice(0,7);
  return { actualFrom: `${latestSale.slice(0,4)}-01`, actualTo: latestSale, planningFrom: '2027-01', planningTo: '2027-12' };
}
