import { z } from 'zod';
import { db } from '../db.js';
import { buildCommercialOffer, commercialCatalog, type CommercialKind } from './commercial.js';
import { actualMetrics, attendanceProfile, latestCompleteMonth, recommendTarget } from './intelligence.js';
import { renewalReport } from './renewals.js';
import { canonicalStudio } from './studios.js';

export interface CopilotAnswer { content: string; attachments: any; mode: string; saveOffer?: any; }
const money = (value: unknown) => value === null || value === undefined ? 'not available' : `₹${Number(value).toLocaleString('en-IN',{ maximumFractionDigits: 0 })}`;
const percent = (value: unknown) => value === null || value === undefined ? 'not available' : `${(Number(value) * 100).toFixed(1)}%`;
function planningMonth(message: string) {
  const explicit = message.match(/(20\d{2})-(0[1-9]|1[0-2])/);
  if (explicit) return { year: Number(explicit[1]), month: Number(explicit[2]) };
  const names = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const lower = message.toLowerCase(), index = names.findIndex(name => new RegExp(`\\b${name}\\b`).test(lower));
  const year = Number(lower.match(/\b(20\d{2})\b/)?.[1] || new Date().getFullYear());
  if (index >= 0) return { year, month: index + 1 };
  const next = new Date(Date.UTC(new Date().getFullYear(),new Date().getMonth()+1,1));
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}
function studioFor(message: string, selected?: number | null) {
  if (selected) return db.prepare('SELECT * FROM studios WHERE id=? AND active=1').get(selected) as any;
  const canonical = canonicalStudio(message);
  return canonical ? db.prepare('SELECT * FROM studios WHERE name=? AND active=1').get(canonical) as any : null;
}
function offerKind(message: string): { kind: CommercialKind; count?: number } | null {
  const lower = message.toLowerCase();
  if (/3\s*(?:classes?)?\s*(?:for|\/)\s*(?:the price of\s*)?2|three.*price of two|3-for-2/.test(lower)) return { kind: 'newcomer_3_for_2' };
  if (/2\s*(?:classes?)?\s*(?:for|\/)\s*(?:the price of\s*)?1|two.*price of one|2-for-1/.test(lower)) return { kind: 'newcomer_2_for_1' };
  if (/intro pack|first-class intro|first class intro/.test(lower)) return { kind: 'intro_pack' };
  if (/free trial|complimentary trial/.test(lower)) return { kind: 'free_trial' };
  if (/paid trial/.test(lower)) return { kind: 'paid_trial' };
  if (/first membership/.test(lower)) return { kind: 'first_membership' };
  if (/lapsed|comeback|reactivat/.test(lower)) return { kind: 'lapsed_return' };
  if (/annual|12.month|yearly/.test(lower)) return { kind: 'annual' };
  if (/6.month|six.month/.test(lower)) return { kind: 'six_month' };
  if (/student/.test(lower)) return { kind: 'student' };
  const pack = lower.match(/\b(10|20|30)[ -]?(?:class|pack)/);
  if (pack || /class pack/.test(lower)) return { kind: 'class_pack', count: Number(pack?.[1] || 10) };
  return null;
}
function findPack(studioId: number, count: number) {
  return db.prepare(`SELECT * FROM products WHERE studio_id=? AND active=1 AND list_price>0 AND source='membership_catalogue' AND
    (name=? OR name=?) ORDER BY id LIMIT 1`).get(studioId,`Studio ${count} Single Class Pack`,count === 10 ? 'Studio Extended 10 Single Class Pack' : `Studio ${count} Single Class Pack`) as any;
}
function formatValue(format?: string) {
  const value = Number(format) || 0;
  return Number.isFinite(value) ? value : 0;
}

function planResponse(studio: any, message: string) {
  const { year, month } = planningMonth(message), key = `${year}-${String(month).padStart(2,'0')}`;
  const target = db.prepare('SELECT * FROM monthly_targets WHERE studio_id=? AND year=? AND month=?').get(studio.id,year,month) as any;
  const recommendation = target ? null : recommendTarget(studio.id,year,month,'standard');
  const latest = latestCompleteMonth(), actual = actualMetrics(studio.id,latest), renewals = renewalReport(key,studio.id);
  const concepts: any[] = [], issues: string[] = [];
  const kinds = studio.name === 'Kenkere House' ? ['intro_pack','first_membership','lapsed_return'] : ['newcomer_2_for_1','first_membership','lapsed_return'];
  for (const kind of kinds) {
    try { const concept = buildCommercialOffer({ studioId: studio.id, kind: kind as CommercialKind, year, month, targetRevenue: Number(target?.proposed_target || recommendation?.proposed_target || 0) * .05 }); concepts.push(concept); }
    catch (error: any) { issues.push(`${kind}: ${error.message}`); }
  }
  const plan = { studioId: studio.id, studio: studio.name, year, month, status: 'deterministic_plan_not_approved',
    target: target ? { id: target.id, proposed: target.proposed_target, approved: target.approved_target, scenario: target.scenario, funnel: JSON.parse(target.funnel || '{}') } : { proposed: recommendation?.proposed_target, approved: null, scenario: 'standard_preview', funnel: JSON.parse(recommendation?.funnel || '{}') },
    latestObserved: { month: latest, revenue: actual.revenue, transactions: actual.transactions, newClientRevenue: actual.new_client, renewalRevenue: actual.renewal,
      leads: actual.leads, firstVisits: actual.completed_trials, checkinRate: actual.checkin_rate, lateCancellationRate: actual.late_cancellation_rate,
      note: 'Latest complete observed month; not actual performance of the future planning month.' },
    renewalDue: { packages: renewals.summary.duePackages, paidValue: renewals.summary.paidDueValue, listValue: renewals.summary.listDueValue,
      paidCoverage: renewals.summary.paidCoverage, listCoverage: renewals.summary.listCoverage },
    workstreams: [
      { sequence: 1, owner: 'Studio manager', action: `Review ${renewals.summary.duePackages} open memberships expiring in ${key}; prioritise exact paid-value follow-up where available.`, measure: 'Due members contacted and subsequent observed renewals' },
      { sequence: 2, owner: 'Sales manager', action: 'Validate newcomer eligibility and capacity, then submit the appropriate journey offer for approval.', measure: 'Eligible trials, attendance and 90-day purchase conversion' },
      { sequence: 3, owner: 'Studio team', action: 'Use actual attendance and late-cancellation patterns to adjust follow-up timing; do not label every non-check-in a no-show.', measure: 'Check-in and late-cancellation rates by booking cohort' },
      { sequence: 4, owner: 'Management', action: 'Review cash revenue, benefit cost and subsequent purchase behaviour separately. Do not claim incremental lift without a valid experiment.', measure: 'Observed revenue and experiment arm outcomes' },
    ], concepts, issues,
    boundaries: ['Target values are recommendations unless separately approved.','Latest observed actuals and future planning months are kept distinct.','Offer concepts are drafts and require approval.','No external publishing action has been taken.'] };
  const content = [`Deterministic sales plan for ${studio.name} · ${key}`,`Target: ${money(target?.approved_target ?? target?.proposed_target ?? recommendation?.proposed_target)} (${target ? target.scenario : 'standard preview'}).`,
    `Latest observed month ${latest}: ${money(actual.revenue)} revenue; check-in ${percent(actual.checkin_rate)}; late cancellation ${percent(actual.late_cancellation_rate)}.`,
    `Renewal due in ${key}: ${renewals.summary.duePackages} open packages; ${money(renewals.summary.paidDueValue)} known paid value; ${money(renewals.summary.listDueValue)} matched list value.`,
    `${concepts.length} policy-checked offer concepts are attached. ${issues.length ? `${issues.length} could not be built safely.` : 'All requested workstreams resolved.'}`].join('\n');
  return { content, attachments: { type: 'sales_plan', plan }, mode: 'deterministic' };
}

export async function deterministicCopilot(message: string, selectedStudioId?: number | null, history: any[] = []): Promise<CopilotAnswer> {
  const text = message.trim(); if (!text) throw Object.assign(new Error('Enter a question or planning instruction.'), { status: 400 });
  const lower = text.toLowerCase(), studio = studioFor(text,selectedStudioId);
  if (/\b(help|what can you do|capabilities)\b/.test(lower) && !studio) return { content: 'I can build policy-checked offers, compare 2-for-1 with 3-for-2, report memberships due for renewal, explain observed revenue/attendance, and assemble a month-specific sales plan. Select a studio or name it in your request. Financials are deterministic; no AI provider is used in this mode.', attachments: { type: 'help' }, mode: 'deterministic' };
  if (!studio) return { content: 'Select a studio first (or name Kemps Corner, Bandra, Kenkere House, Copper + Cloves, or Plash Pilates). I need a studio-specific product and policy context before calculating.', attachments: { type: 'studio_required' }, mode: 'deterministic' };
  const previousOffer = [...history].reverse().find(item => item.role === 'assistant' && item.attachments?.type === 'offer_concept' && item.attachments.concept?.studioId === studio.id)?.attachments?.concept;
  if (previousOffer && /save|draft/.test(lower) && !offerKind(text)) return { content: `The previous ${previousOffer.name} concept is ready to save as a draft. Policy and financial validation will run again; no approval or publishing will occur.`, attachments: { type: 'offer_concept', concept: previousOffer }, saveOffer: previousOffer, mode: 'deterministic' };
  if (/renew|expir|due back/.test(lower) && !/sales plan|complete plan/.test(lower)) {
    const { year, month } = planningMonth(text), key = `${year}-${String(month).padStart(2,'0')}`;
    const rateMatch = lower.match(/(?:conversion|renewal rate|convert)\s*(?:of|at|=)?\s*(\d+(?:\.\d+)?)\s*%/) || lower.match(/(\d+(?:\.\d+)?)\s*%\s*(?:conversion|renewal)/);
    const rate = rateMatch ? Number(rateMatch[1]) / 100 : null, report = renewalReport(key,studio.id,rate);
    const content = [`${studio.name} renewal-due report · ${key}`,`${report.summary.duePackages} currently open packages expire. Known paid due value is ${money(report.summary.paidDueValue)} across ${report.summary.paidValuePackages} packages; matched current list value is ${money(report.summary.listDueValue)} across ${report.summary.listMatchedPackages}.`,
      `Historical renewal-coded revenue in ${key}: ${money(report.selectedMonthHistoricalRenewal.revenue)}. This is a separate transaction classification, not revenue from the due cohort above.`,
      report.projection ? `Scenario at ${percent(rate)} conversion: ${money(report.projection.projectedRevenueFromKnownValues)} from known values only. This is not a forecast.` : 'Add a conversion assumption (for example, “at 60% conversion”) to calculate an explicitly labelled scenario.'].join('\n');
    return { content, attachments: { type: 'renewal_report', report }, mode: 'deterministic' };
  }
  if (/sales plan|complete plan|monthly plan|plan for/.test(lower)) return planResponse(studio,text);
  const selected = offerKind(text);
  if (selected && /offer|trial|pack|membership|class|comeback|student|annual|2.for.1|3.for.2|build|create|draft/.test(lower)) {
    const { year, month } = planningMonth(text), options: any = { studioId: studio.id, kind: selected.kind, year, month };
    if (selected.kind === 'class_pack') {
      const product = findPack(studio.id,selected.count || 10); if (!product) return { content: `No verified ${selected.count || 10}-class product-master MRP exists at ${studio.name}. Configure the product before building this offer; I will not substitute another price.`, attachments: { type: 'unresolved_product' }, mode: 'deterministic' };
      options.productId = product.id;
    }
    if (selected.kind === 'free_trial') options.format = /powercycle|power cycle/.test(lower) ? 'powercycle' : /strength/.test(lower) ? 'strength' : 'barre';
    if (/30.minute|30 minute/.test(lower)) options.mechanics = { privateSessionMinutes: 30 };
    let concept;
    try { concept = buildCommercialOffer(options); }
    catch (error: any) { return { content: `I could not build this safely: ${error.message}`, attachments: { type: 'policy_issue' }, mode: 'deterministic' }; }
    const saveRequested = /save|create|build|draft|generate/.test(lower) && !/what if|simulate|don't save|do not save/.test(lower);
    const content = [`${concept.name} · ${studio.name}`,`${concept.benefit}.`,`Pricing reference MRP: ${money(concept.mechanics.listedPrice)}. Selling price: ${money(concept.financials.sellingPrice)}. Effective customer benefit: ${concept.financials.effectiveDiscountPercent.toFixed(1)}%.`,
      `Scenario revenue: ${money(concept.financials.expectedRevenue)} from ${concept.financials.expectedBuyers ?? 'unavailable'} expected buyers. Contribution margin: ${concept.financials.economicsComplete ? money(concept.financials.contributionMargin) : 'incomplete because one or more costs are missing'}.`,
      concept.financials.errors.length ? `Guardrails: ${concept.financials.errors.join(' ')}` : saveRequested ? 'This concept is ready to save as a draft; it will not be approved or published automatically.' : 'This is a simulation only. Ask me to “save this as a draft” if you want it in Offer Bank.'].join('\n');
    return { content, attachments: { type: 'offer_concept', concept }, saveOffer: saveRequested && !concept.financials.errors.length ? concept : null, mode: 'deterministic' };
  }
  if (/attendance|check.?in|cancel|revenue|sales|performance|insight/.test(lower)) {
    const month = latestCompleteMonth(), actual = actualMetrics(studio.id,month), profile = attendanceProfile(studio.id,Number(month.slice(0,4)));
    const content = [`${studio.name} observed intelligence · ${month}`,`Revenue: ${money(actual.revenue)} across ${actual.transactions} transactions. New-client revenue: ${money(actual.new_client)}. Renewal-coded revenue: ${money(actual.renewal)}.`,
      `Bookings: ${actual.booking_count}; check-in rate ${percent(actual.checkin_rate)}; late-cancellation rate ${percent(actual.late_cancellation_rate)}. Other non-check-ins remain separate.`,
      `Leads: ${actual.leads}; first visits: ${actual.completed_trials}; mature-cohort trial conversion: ${percent(actual.trial_conversion)}.`,
      'These are observed actuals. They do not prove offer incrementality or forecast future conversion.'];
    return { content: content.join('\n'), attachments: { type: 'observed_intelligence', studioId: studio.id, month, actual, attendanceProfile: profile }, mode: 'deterministic' };
  }
  const catalog = commercialCatalog(studio.id);
  return { content: `I could not map that request to a validated workflow. For ${studio.name}, try “build a 3-for-2 newcomer offer”, “show November renewals due”, “build a complete sales plan for January 2027”, or “summarise observed attendance”. The studio has ${catalog.products.length} priced/configured catalogue options; I have not invented an answer.`, attachments: { type: 'unrecognised', catalogSummary: { products: catalog.products.length, checks: catalog.policy ? true : false } }, mode: 'deterministic' };
}

const narrativeSchema = z.object({ summary: z.string().min(10).max(1800), recommendations: z.array(z.string().min(3).max(500)).max(6), risks: z.array(z.string().min(3).max(500)).max(6) });
export async function providerNarrative(message: string, deterministic: any, history: any[]) {
  if (!process.env.OPENAI_API_KEY) throw Object.assign(new Error('No AI provider is configured. Use the explicitly labelled Deterministic Copilot.'), { status: 503, code: 'AI_NOT_CONFIGURED' });
  const schema = { type: 'object', additionalProperties: false, required: ['summary','recommendations','risks'], properties: {
    summary: { type: 'string' }, recommendations: { type: 'array', items: { type: 'string' } }, risks: { type: 'array', items: { type: 'string' } } } };
  const response = await fetch(`${process.env.AI_PROVIDER_BASE_URL || 'https://api.openai.com/v1'}/responses`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', input: [
      { role: 'system', content: 'You are P57 Copilot. Use only the supplied deterministic facts. Do not invent metrics, prices, approvals, performance, or external publishing. Recommendations are not decisions. Return concise structured JSON.' },
      ...history.slice(-6).map(item => ({ role: item.role === 'user' ? 'user' : 'assistant', content: item.content })),
      { role: 'user', content: JSON.stringify({ request: message, deterministicFacts: deterministic.attachments, deterministicAnswer: deterministic.content }) }
    ], text: { format: { type: 'json_schema', name: 'p57_copilot_narrative', strict: true, schema } } }), signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw Object.assign(new Error(`AI provider returned ${response.status}. No unvalidated response was saved.`), { status: 502 });
  const payload = await response.json() as any, text = payload.output_text || payload.output?.flatMap((o: any) => o.content || []).find((c: any) => c.type === 'output_text')?.text;
  let parsed: z.infer<typeof narrativeSchema>;
  try { parsed = narrativeSchema.parse(JSON.parse(text)); } catch { throw Object.assign(new Error('AI narrative failed schema validation. No AI response was saved.'), { status: 422 }); }
  return { content: [parsed.summary, ...parsed.recommendations.map(item => `• ${item}`), '', 'Deterministic calculation detail:', deterministic.content, ...(parsed.risks.length ? ['', 'Risks:', ...parsed.risks.map(item => `• ${item}`)] : [])].join('\n'),
    attachments: { ...deterministic.attachments, providerNarrative: parsed, providerValidated: true }, saveOffer: deterministic.saveOffer, mode: 'openai_validated' };
}

export function copilotCapability() { return { providerConfigured: Boolean(process.env.OPENAI_API_KEY), defaultMode: process.env.OPENAI_API_KEY ? 'provider_available' : 'deterministic',
  deterministicLabel: 'Deterministic Copilot · validated code, not AI', providerLabel: 'Provider-backed narrative + deterministic calculations', keyExposed: false }; }
