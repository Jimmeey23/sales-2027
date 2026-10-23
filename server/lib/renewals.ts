import { db } from '../db.js';

const OPEN_STATUSES = ['Active','New','Frozen'];
function validMonth(value: string) { return /^20\d{2}-(0[1-9]|1[0-2])$/.test(value); }
function nextMonth(month: string, offset: number) { const [y,m] = month.split('-').map(Number); return new Date(Date.UTC(y,m-1+offset,1)).toISOString().slice(0,7); }
function monthBounds(month: string) { return { start: `${month}-01`, end: nextMonth(month,1) + '-01' }; }

export function renewalReport(rawMonth: string, studioId?: number, conversionRate?: number | null, valueBasis: 'paid'|'list' = 'paid') {
  if (!validMonth(rawMonth)) throw Object.assign(new Error('Renewal month must use YYYY-MM format.'), { status: 400 });
  if (conversionRate !== undefined && conversionRate !== null && (!Number.isFinite(conversionRate) || conversionRate < 0 || conversionRate > 1)) throw Object.assign(new Error('Renewal conversion assumption must be between 0% and 100%.'), { status: 400 });
  const month = rawMonth, { start, end } = monthBounds(month);
  const studioWhere = studioId ? 'AND cp.studio_id=?' : '', params = studioId ? [studioId] : [];
  const rows = db.prepare(`SELECT cp.id,cp.studio_id,cp.status,cp.product_name,cp.end_date,cp.amount,cp.original_amount,p.id product_id,p.list_price,p.source price_source,s.name studio
    FROM customer_packages cp JOIN studios s ON s.id=cp.studio_id
    LEFT JOIN products p ON p.studio_id=cp.studio_id AND p.name=cp.product_name AND p.active=1
    WHERE cp.end_date>=? AND cp.end_date<? ${studioWhere}`).all(start,end,...params) as any[];
  const due = rows.filter(row => OPEN_STATUSES.includes(row.status));
  const productMap = new Map<string,any>(), dayMap = new Map<string,any>();
  for (const row of due) {
    const key = `${row.studio_id}|${row.product_name}`;
    const item = productMap.get(key) || { studio_id: row.studio_id, studio: row.studio, product_name: row.product_name, due_packages: 0, paid_value_packages: 0, paid_due_value: 0, list_matched_packages: 0, list_due_value: 0, original_value: 0 };
    item.due_packages++;
    if (row.amount > 0) { item.paid_value_packages++; item.paid_due_value += Number(row.amount); }
    if (row.original_amount > 0) item.original_value += Number(row.original_amount);
    if (row.list_price > 0) { item.list_matched_packages++; item.list_due_value += Number(row.list_price); }
    productMap.set(key,item);
    const day = dayMap.get(row.end_date) || { date: row.end_date, due_packages: 0, paid_due_value: 0 };
    day.due_packages++; if (row.amount > 0) day.paid_due_value += Number(row.amount); dayMap.set(row.end_date,day);
  }
  const paidDueValue = due.reduce((sum,row) => sum + (row.amount > 0 ? Number(row.amount) : 0), 0);
  const listDueValue = due.reduce((sum,row) => sum + (row.list_price > 0 ? Number(row.list_price) : 0), 0);
  const paidCoverage = due.length ? due.filter(row => row.amount > 0).length / due.length : 0;
  const listCoverage = due.length ? due.filter(row => row.list_price > 0).length / due.length : 0;
  const selectedValue = valueBasis === 'list' ? listDueValue : paidDueValue;
  const historical = db.prepare(`SELECT month,SUM(amount) revenue,COUNT(*) transactions,COUNT(DISTINCT member_ref) members
    FROM transactions WHERE revenue_stream='renewal' ${studioId ? 'AND studio_id=?' : ''} AND month>=? AND month<=? GROUP BY month ORDER BY month`)
    .all(...(studioId ? [studioId] : []),nextMonth(month,-11),month) as any[];
  const selectedActual = db.prepare(`SELECT COALESCE(SUM(amount),0) revenue,COUNT(*) transactions,COUNT(DISTINCT member_ref) members FROM transactions
    WHERE revenue_stream='renewal' AND month=? ${studioId ? 'AND studio_id=?' : ''}`).get(month,...params) as any;
  const upcoming = Array.from({ length: 6 },(_,index) => {
    const key = nextMonth(month,index), bounds = monthBounds(key);
    const row = db.prepare(`SELECT COUNT(*) due_packages,COALESCE(SUM(CASE WHEN amount>0 THEN amount ELSE 0 END),0) paid_due_value
      FROM customer_packages cp WHERE cp.end_date>=? AND cp.end_date<? AND cp.status IN ('Active','New','Frozen') ${studioId ? 'AND cp.studio_id=?' : ''}`)
      .get(bounds.start,bounds.end,...params) as any;
    return { month: key, ...row };
  });
  const today = new Date().toISOString().slice(0,10), outlierBefore = nextMonth(today.slice(0,7),60) + '-01';
  const quality = db.prepare(`SELECT
    SUM(CASE WHEN end_date IS NULL OR end_date='' THEN 1 ELSE 0 END) missing_end_dates,
    SUM(CASE WHEN end_date>? THEN 1 ELSE 0 END) outlier_end_dates,
    SUM(CASE WHEN amount<0 THEN 1 ELSE 0 END) negative_amount_rows,
    SUM(CASE WHEN amount=0 THEN 1 ELSE 0 END) zero_amount_rows,
    COUNT(*) total_packages FROM customer_packages cp WHERE 1=1 ${studioId ? 'AND cp.studio_id=?' : ''}`).get(outlierBefore,...params) as any;
  return { month, studioId: studioId || null, scope: 'currently_open_packages_expiring', openStatuses: OPEN_STATUSES,
    summary: { duePackages: due.length, paidDueValue, listDueValue, paidValuePackages: due.filter(row => row.amount > 0).length,
      listMatchedPackages: due.filter(row => row.list_price > 0).length, paidCoverage, listCoverage,
      zeroAmountDuePackages: due.filter(row => !row.amount).length, negativeAmountDuePackages: due.filter(row => row.amount < 0).length,
      alreadyRenewedCohort: rows.filter(row => row.status === 'Renewed').length, lapsedCohort: rows.filter(row => row.status === 'Lapsed').length,
      notActivatedCohort: rows.filter(row => row.status === 'Not Activated').length },
    products: [...productMap.values()].sort((a,b) => b.due_packages - a.due_packages || b.paid_due_value - a.paid_due_value),
    daily: [...dayMap.values()].sort((a,b) => a.date.localeCompare(b.date)), upcoming, historicalRenewalRevenue: historical,
    selectedMonthHistoricalRenewal: { ...selectedActual, classification: 'Imported transaction revenue_stream=renewal; not joined to this due cohort and not incremental lift.' },
    projection: conversionRate === undefined || conversionRate === null ? null : { conversionRate, valueBasis, knownValueBasis: selectedValue,
      projectedRenewals: due.length * conversionRate, projectedRevenueFromKnownValues: selectedValue * conversionRate,
      coverage: valueBasis === 'list' ? listCoverage : paidCoverage, status: 'scenario_not_forecast',
      note: 'Applies an explicit assumption to known due value only. Missing package values are not imputed; this is not a statistically validated renewal forecast.' },
    dataQuality: { ...quality, outlierRule: `End dates after ${outlierBefore} are flagged for review.`, dueCaveat: 'Future package coverage is incomplete and can change. Zero/blank amounts are not treated as free renewals; negative amounts are flagged rather than silently included.', listPriceCaveat: 'List due is current product-master MRP where an exact studio/product match exists, not actual renewal revenue.' },
    provenance: { source: 'Lapsed New - Lapsed (21).csv / customer_packages plus membership_catalogue product MRP', generatedAt: new Date().toISOString(), aggregated: true } };
}
