/* One definition of "this offer's forecast can be counted", shared by the plan pages and the
   server. A stored expected_revenue only counts when it agrees with the financial model it was
   built from (within ₹2 or 0.01%, whichever is larger) — a row whose model has moved on is
   stale and must not be added into a month's covered revenue. */

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function parseFinancials(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Allowed gap between a stored forecast and its model: ₹2, or 0.01% of the model. */
export function forecastTolerance(modeledRevenue: unknown) {
  return Math.max(2, Math.abs(num(modeledRevenue)) * 0.0001);
}

/** True when stored revenue and modelled revenue agree (or there is no model to disagree with). */
export function forecastMatchesModel(expectedRevenue: unknown, modeledRevenue: unknown) {
  if (modeledRevenue == null) return true;
  return Math.abs(num(expectedRevenue) - num(modeledRevenue)) <= forecastTolerance(modeledRevenue);
}

/** A countable forecast: real (not demo) offer, numeric expected_revenue, consistent with its model. */
export function hasValidForecast(o: any): boolean {
  if (
    !o ||
    o.data_mode === 'demo' ||
    o.generation_source === 'demo_seed' ||
    o.expected_revenue == null ||
    o.expected_revenue === '' ||
    !Number.isFinite(Number(o.expected_revenue))
  )
    return false;
  return forecastMatchesModel(o.expected_revenue, parseFinancials(o.financials).expectedRevenue);
}

/** Revenue a month may count for this offer: expected_revenue when valid, else 0. */
export function forecastRevenue(o: any): number {
  return hasValidForecast(o) ? num(o.expected_revenue) : 0;
}

/** An offer whose stored revenue is deliberately not units × price: deposits, free/zero-revenue
    offers, or an explicit override recorded on its financial model. */
export function isRevenueOverride(o: any): boolean {
  const f = parseFinancials(o?.financials);
  if (f.revenueOverride || f.zeroRevenue || f.deposit) return true;
  const type = `${o?.offer_type ?? o?.offerType ?? ''}`.toLowerCase();
  return /deposit|zero[-_ ]?revenue/.test(type);
}

/** target_purchases × expected_asp when both are present and no override applies; otherwise
    the stored expected_revenue (or null). */
export function expectedRevenueOf(o: any): number | null {
  const stored = o?.expected_revenue ?? o?.expectedRevenue;
  const storedNum = stored == null || stored === '' || !Number.isFinite(Number(stored)) ? null : Number(stored);
  if (!o || isRevenueOverride(o)) return storedNum;
  const units = o.target_purchases ?? o.targetPurchases;
  const asp = o.expected_asp ?? o.expectedAsp;
  if (units == null || asp == null || units === '' || asp === '') return storedNum;
  const u = Number(units),
    p = Number(asp);
  if (!Number.isFinite(u) || !Number.isFinite(p)) return storedNum;
  return Math.round(u * p);
}
