import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001';
let cookie = '';
let smokeTargetId: number | null = null;
let smokeImportId: number | null = null;
let smokeCheckinImportId: number | null = null;
let smokeConversationId: number | null = null;
let smokeRunId = '';
let smokeSavedReportId: number | null = null;
let smokeReportAuditFloor = 0;
const smokeFingerprints: string[] = [];
const checks: string[] = [];
async function request(route: string, options: RequestInit = {}, expected = 200) {
  const headers = new Headers(options.headers); if (cookie) headers.set('cookie', cookie);
  if (options.body && !(options.body instanceof FormData) && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(`${base}/api${route}`, { ...options, headers });
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie')!.split(';')[0];
  const type = response.headers.get('content-type') || '';
  const body = type.includes('json') ? await response.json() : type.includes('spreadsheetml') ? Buffer.from(await response.arrayBuffer()) : await response.text();
  if (response.status !== expected) throw new Error(`${options.method || 'GET'} ${route}: expected ${expected}, got ${response.status}: ${JSON.stringify(body).slice(0,500)}`);
  return { body, response };
}
const json = (body: any) => JSON.stringify(body);
const pass = (name: string) => { checks.push(name); console.log(`✓ ${name}`); };

async function run() {
  await request('/health'); pass('API and database health');
  const direct = (await request('/auth/workspace', { method: 'POST', body: json({}) })).body;
  if (direct.user.role !== 'administrator' || !cookie) throw new Error('Direct workspace session was not created.');
  pass('Login-free direct workspace creates an audited administrator session');
  await request('/auth/login', { method: 'POST', body: json({ email: 'admin@p57.demo', password: 'P57demo!' }) }); pass('Authentication and persistent session cookie');
  const { body: boot } = await request('/bootstrap');
  if (boot.studios.length < 4 || !boot.coverage.sales.rows) throw new Error('Expected imported studios and sales.');
  pass(`Bootstrap with ${boot.studios.length} studios and ${boot.coverage.sales.rows} sales rows`);
  const { body: dash } = await request('/dashboard?year=2026&month=9');
  if (!dash.rows.length || dash.kpis.trialBookings !== null) throw new Error('Dashboard metric integrity failed.');
  pass('Executive metrics and unavailable trial bookings remain null');
  const studio = (await request('/studios/1?year=2026')).body;
  const segments = (await request('/segments?studio=1')).body;
  const anniversary = (await request('/anniversary?year=2027&studio=1')).body;
  if (!studio.trainers.length || segments.rows.length !== 12 || !anniversary.baseline.length || anniversary.retentionPlan.length !== 4) throw new Error('Studio, segment, or anniversary intelligence missing.');
  pass('Studio trainer intelligence, twelve segments, April baseline and retention plan');
  if (!studio.attendance?.summary?.bookings || studio.funnel.sources.bookingToAttendanceRate !== 'checkins_historical_all_bookings' ||
    studio.attendance.summary.bookings !== studio.attendance.summary.checkins + studio.attendance.summary.late_cancellations + studio.attendance.summary.other_not_checked ||
    !studio.attendance.outlook.method.includes('not a confidence interval or revenue forecast')) throw new Error('Checkins behavioural metrics or provenance failed.');
  pass('Checkins attendance, cancellation, member-return and bounded outlook intelligence');
  const { body: targets } = await request('/targets?year=2027&studio=1');
  if (targets.rows.length !== 12) throw new Error('Annual target matrix does not contain 12 months.');
  if (targets.rows.some((row: any) => row.proposed_target < 3000000 || row.proposed_target > 4000000 || row.assumptions.rentAdjustment?.effectiveMonth !== '2027-01') || new Set(targets.rows.map((row: any) => row.proposed_target)).size < 5) throw new Error('Kemps Corner seasonal 2027 target guardrail failed.');
  const target = targets.rows[0]; smokeTargetId = target.id;
  const updated = (await request(`/targets/${target.id}`, { method: 'PATCH', body: json({ proposedTarget: target.proposed_target + 1000, reason: 'Automated smoke test; restored immediately.' }) })).body;
  if (updated.version !== target.version + 1 || !updated.funnel.calculationPath) throw new Error('Target update did not recalculate/version.');
  await request(`/targets/${target.id}`, { method: 'PATCH', body: json({ proposedTarget: target.proposed_target, reason: 'Restore after automated smoke test.' }) });
  const versions = (await request(`/targets/${target.id}/versions`)).body;
  if (versions.length < 3) throw new Error('Target version history missing.');
  pass('Studio-specific target update, reconciliation, funnel recalculation and version history');
  const product = boot.products.find((p: any) => p.studio_id === 1 && p.list_price > 0);
  const commercial = (await request('/commercial/catalog?studioId=3')).body;
  if (commercial.policy.formats.join(',') !== 'barre' || commercial.policy.single_class_product_id !== 32 || commercial.policy.newcomer_product_id !== 235) throw new Error('Kenkere commercial catalogue binding failed.');
  const kenkereIntro = (await request('/commercial/generate', { method: 'POST', body: json({ studioId: 3, kind: 'intro_pack', year: 2027, month: 1, saveDraft: false }) })).body.concept;
  const kenkereAlternative = (await request('/commercial/generate', { method: 'POST', body: json({ studioId: 3, kind: 'newcomer_3_for_2', year: 2027, month: 1, saveDraft: false }) })).body.concept;
  if (kenkereIntro.financials.sellingPrice !== 675 || kenkereIntro.provenance.pricing.mrp !== 1350 || kenkereAlternative.financials.sellingPrice !== 2700) throw new Error('Kenkere commercial pricing failed.');
  pass('Studio-specific product/MRP catalogue, ₹675 Kenkere intro and ₹2,700 3-for-2 preview');
  const hostedTrial = (await request('/commercial/generate', { method: 'POST', body: json({ studioId: 5, kind: 'paid_trial', year: 2027, month: 1, saveDraft: false }) })).body.concept;
  if (hostedTrial.financials.sellingPrice !== 900 || hostedTrial.provenance.pricing.source !== 'explicit_hosted_catalogue' || hostedTrial.provenance.historicalSalesUsed) throw new Error('Hosted paid-trial provenance failed.');
  await request('/commercial/generate', { method: 'POST', body: json({ studioId: 1, kind: 'free_trial', format: 'strength', year: 2027, month: 1, saveDraft: false }) }, 422);
  pass('Hosted paid-trial provenance and server rejection of unsupported Mumbai Strength free trial');
  const renewals = (await request('/renewals/report?studio=3&month=2026-11&conversionRate=0.6')).body;
  if (!renewals.summary.duePackages || renewals.selectedMonthHistoricalRenewal.revenue !== 0 || renewals.projection.status !== 'scenario_not_forecast') throw new Error('Renewal-due boundaries failed.');
  pass('Monthly renewal-due values remain separate from historical revenue and projected conversion');
  const intelligence = (await request('/studios/3?year=2026')).body;
  if (intelligence.historic.through !== '2026-09' || !intelligence.historic.findings.length) throw new Error('Complete-month historic findings failed.');
  pass('Studio Intelligence historic findings use complete months only');
  const scenario = (await request('/targets/scenario-preview?studio=1&year=2027')).body;
  const aggressiveRows = scenario.rows.filter((row: any) => row.scenario === 'aggressive');
  if (scenario.rows.length !== 36 || aggressiveRows.length !== 12 || !scenario.aggressiveHighest || aggressiveRows.some((row: any) => row.proposed_target > 4000000)) throw new Error('Aggressive target scenario failed.');
  pass('Aggressive target preview preserves rent-aware Kemps caps');
  const experiments = (await request('/experiments?studio=3')).body.rows;
  if (!experiments.length || experiments.some((experiment: any) => experiment.results.control || experiment.results.variant)) throw new Error('Experiment seed/outcome provenance failed.');
  pass('Persistent monthly newcomer experiments with no fabricated outcomes');
  const conversation = (await request('/copilot/conversations', { method: 'POST', body: json({ studioId: 3, title: 'Smoke verification' }) }, 201)).body;
  smokeConversationId = conversation.id;
  const copilot = (await request(`/copilot/conversations/${conversation.id}/messages`, { method: 'POST', body: json({ message: 'Simulate a 3-for-2 newcomer offer for January 2027' }) }, 201)).body;
  if (copilot.message.mode !== 'deterministic' || copilot.message.attachments.concept.financials.sellingPrice !== 2700 || copilot.savedOffer) throw new Error('Deterministic Copilot concept or persistence failed.');
  if ((await request(`/copilot/conversations/${conversation.id}`)).body.messages.length !== 2) throw new Error('Copilot message history did not persist.');
  await request(`/copilot/conversations/${conversation.id}`, { method: 'DELETE' });
  pass('Deterministic Copilot parses 3-for-2, builds economics and persists/deletes conversation history');
  const mechanics = { listedPrice: product.list_price, mechanism: 'percentage', discountPercent: 10, targetRevenue: 50000,
    eligibleAudience: 100, redemptionRate: .2, conversionRate: 1, maxDiscountPercent: 20, variableCost: null };
  const unique = Date.now(); smokeRunId = String(unique);
  const generationBase = { studioId: 1, year: 2027, month: 4, objective: 'acquisition', segment: 'new_leads', targetRevenue: 100000, count: 3 };
  const generated = (await request('/offers/generate', { method: 'POST', body: json({ ...generationBase, source: 'engine' }) })).body;
  if (generated.offers.length !== 3 || generated.offers.some((item: any) => !item.financials)) throw new Error('Rules generation did not return three financially calculated concepts.');
  const random = (await request('/offers/random', { method: 'POST', body: json(generationBase) })).body;
  if (!random.fingerprint || !random.financials) throw new Error('Constrained random generation failed.'); smokeFingerprints.push(random.fingerprint);
  const goal = (await request('/goals/solve', { method: 'POST', body: json({ studioId: 1, target: 100000, actual: 20000, month: 4, objective: 'revenue_gap', streams: [{ key: 'renewal', audience: 10, conversionRate: .5, averageSpend: 10000 }] }) })).body;
  if (!goal.primary || goal.uncoveredGap === undefined) throw new Error('Goal-based offer solver failed.');
  if (!boot.aiConfigured) await request('/offers/generate', { method: 'POST', body: json({ ...generationBase, source: 'ai' }) }, 503);
  pass('Rules, constrained-random and goal-based generation; AI fails honestly when unconfigured');
  const offer = (await request('/offers', { method: 'POST', body: json({ name: `Smoke Test Offer ${unique}`, studioId: 1, year: 2099, month: 1,
    objective: 'acquisition', audience: 'new_leads', mechanics, revenueTarget: 50000, customerCopy: 'Smoke test terms.', status: 'draft' }) }, 201)).body;
  const persisted = (await request(`/offers/${offer.id}`)).body;
  if (persisted.name !== offer.name || persisted.version !== 1) throw new Error('Offer persistence failed.');
  await request(`/offers/${offer.id}`, { method: 'PATCH', body: json({ headline: 'Updated and versioned', reason: 'Smoke test edit' }) });
  const versioned = (await request(`/offers/${offer.id}`)).body;
  if (versioned.version !== 2) throw new Error('Offer versioning failed.');
  await request(`/offers/${offer.id}/action`, { method: 'POST', body: json({ action: 'approve' }) });
  pass('Offer create, financial validation, persistence, edit, version and approval');
  const clone = (await request(`/offers/${offer.id}/action`, { method: 'POST', body: json({ action: 'clone', studioId: 2, month: 2, year: 2099 }) }, 201)).body;
  if (!clone.original_offer_id || clone.studio_id !== 2) throw new Error('Cross-studio clone linkage failed.');
  pass('Cross-studio clone recalculation and original-version linkage');
  const campaignBody = { name: `Smoke Campaign ${unique}`, studioId: 1, offerId: offer.id, year: 2099, startDate: '2099-01-01', endDate: '2099-01-10', audience: 'new_leads', objective: 'acquisition', targetRevenue: 50000 };
  const campaign = (await request('/campaigns', { method: 'POST', body: json(campaignBody) }, 201)).body;
  await request('/campaigns', { method: 'POST', body: json({ ...campaignBody, name: `Conflicting ${unique}` }) }, 409);
  await request(`/campaigns/${campaign.id}/performance`, { method: 'POST', body: json({ eligibleAudience: 100, customersReached: 80, responses: 20, redemptions: 10, buyers: 5, transactions: 5, revenue: 45000, effectiveDiscount: 10 }) });
  const performance = (await request('/performance?year=2099&studio=1')).body;
  if (!performance.campaigns.length || performance.campaigns[0].aov !== 9000) throw new Error('Campaign actual performance/AOV failed.');
  await request(`/campaigns/${campaign.id}`, { method: 'PATCH', body: json({ status: 'archived' }) });
  pass('Campaign scheduling, overlap prevention, actuals, AOV and planned-versus-actual learning');
  const csv = await request('/reports/targets?year=2027&format=csv&studio=1');
  if (!String(csv.body).includes('Approved target')) throw new Error('CSV export content missing.');
  const xlsx = await request('/reports/targets?year=2027&format=xlsx&studio=1');
  if (xlsx.body.length < 100) throw new Error('XLSX export empty.');
  pass('CSV and XLSX export generation');
  if (/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base)) {
    const { db } = await import('../server/db.js');
    smokeReportAuditFloor = Number((db.prepare('SELECT COALESCE(MAX(id),0) id FROM audit_logs').get() as any).id);
  }
  const reportQuery = 'report=monthly-performance&from=2026-09&to=2026-09&studio=1&columns=studio,month,revenue,target,attainment_percent&sort=month&direction=asc';
  const advanced = (await request(`/reporting/run?${reportQuery}`)).body;
  const studioDashboard = (await request('/dashboard?year=2026&month=9&studio=1')).body;
  if (advanced.totalRows !== 1 || advanced.rows[0].revenue !== studioDashboard.rows[0].actual.revenue ||
    advanced.rows[0].target !== studioDashboard.rows[0].target_value || advanced.rows[0].attainment_percent !== studioDashboard.rows[0].achievement) throw new Error('Advanced report numerical parity failed.');
  const futureAttainment = (await request('/reporting/run?report=target-attainment&from=2027-01&to=2027-01&studio=1')).body;
  if (futureAttainment.rows[0].revenue !== null || futureAttainment.rows[0].attainment_percent !== null || futureAttainment.summary.find((metric: any) => metric.key === 'attainment').value !== null) throw new Error('Missing actuals were converted into zero attainment.');
  await request('/reporting/run?report=monthly-performance&from=2026-01&to=2026-02&status=draft', {}, 422);
  pass('Advanced report execution, numerical parity, missing-actual handling and filter validation');
  const saved = (await request('/reporting/saved', { method: 'POST', body: json({ name: `Smoke reporting view ${Date.now()}`, report: 'monthly-performance', config: advanced.options }) }, 201)).body;
  smokeSavedReportId = saved.id;
  const savedOptions = { ...saved.config, direction: 'desc', columns: ['studio','month','revenue'] };
  await request('/reporting/saved', { method: 'POST', body: json({ id: saved.id, name: `${saved.name} updated`, report: saved.report_id, config: savedOptions }) });
  const savedRows = (await request('/reporting/saved')).body.rows;
  const reloaded = savedRows.find((row: any) => row.id === saved.id);
  if (!reloaded || reloaded.config.direction !== 'desc' || reloaded.config.columns.join(',') !== 'studio,month,revenue' || !reloaded.name.endsWith('updated')) throw new Error('Saved report configuration did not persist/update.');
  pass('Persistent saved-report create, update and reload workflow');
  const advancedCsv = await request(`/reporting/export?${reportQuery}&format=csv`);
  const parsedCsv = parseCsv(String(advancedCsv.body).replace(/^\uFEFF/, ''), { columns: true, skip_empty_lines: true }) as any[];
  const revenueLabel = advanced.columns.find((column: any) => column.key === 'revenue').label;
  const attainmentLabel = advanced.columns.find((column: any) => column.key === 'attainment_percent').label;
  if (parsedCsv.length !== 1 || Number(parsedCsv[0][revenueLabel]) !== advanced.rows[0].revenue || Number(parsedCsv[0][attainmentLabel]) !== advanced.rows[0].attainment_percent || parsedCsv[0].Studio !== 'Kemps Corner') throw new Error('Advanced CSV does not match preview.');
  const advancedXlsx = await request(`/reporting/export?${reportQuery}&format=xlsx`);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(advancedXlsx.body);
  const dataSheet = workbook.getWorksheet('Report data'), managementSheet = workbook.getWorksheet('Management summary'), readMe = workbook.getWorksheet('Read me');
  if (!dataSheet || !managementSheet || !readMe || dataSheet.rowCount !== 2 || dataSheet.getCell('C2').value !== advanced.rows[0].revenue || dataSheet.getCell('E2').value !== advanced.rows[0].attainment_percent || readMe.getCell('B2').value !== advanced.definition.evidence) throw new Error('Advanced XLSX contents do not match preview/provenance.');
  await request(`/reporting/saved/${saved.id}`, { method: 'DELETE' });
  if ((await request('/reporting/saved')).body.rows.some((row: any) => row.id === saved.id)) throw new Error('Saved report deletion failed.');
  pass('Numerically matching CSV/XLSX exports with summary, definitions and saved-view deletion');
  const importCsv = 'SessionID,Location,Date,Capacity,CheckedIn,Booked,SessionName,Type\nSMOKE2099,Kwality House Kemps Corner,2099-01-01,10,0,0,Smoke Session,Barre 57\nSMOKE2099,Kwality House Kemps Corner,2099-01-01,10,0,0,Smoke Session,Barre 57\nSMOKE2098,Kwality House Kemps Corner,not-a-date,10,0,0,Smoke Session,Barre 57\n';
  const form = new FormData(); form.append('file', new Blob([importCsv], { type: 'text/csv' }), 'smoke-sessions.csv');
  const uploaded = (await request('/imports', { method: 'POST', body: form }, 201)).body; smokeImportId = uploaded.id;
  const inspected = (await request(`/imports/${uploaded.id}?inspect=true`)).body;
  await request(`/imports/${uploaded.id}/validate`, { method: 'POST', body: json({ category: 'sessions', mapping: inspected.inspection.suggestedMapping }) }, 202);
  let importRow: any;
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 150)); importRow = (await request(`/imports/${uploaded.id}`)).body; if (importRow.status === 'validated') break; }
  if (importRow.summary.valid !== 1 || importRow.summary.invalid !== 1 || importRow.summary.duplicates !== 1) throw new Error(`Import validation counts wrong: ${JSON.stringify(importRow.summary)}`);
  await request(`/imports/${uploaded.id}/commit`, { method: 'POST', body: json({}) }, 202);
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 150)); importRow = (await request(`/imports/${uploaded.id}`)).body; if (importRow.status === 'committed') break; }
  if (importRow.imported_rows !== 1) throw new Error('Staged import commit failed.');
  const errors = await request(`/imports/${uploaded.id}/errors.csv`);
  if (!String(errors.body).includes('Duplicate') || !String(errors.body).includes('Invalid')) throw new Error('Error report missing reasons.');
  pass('Upload, detection, mapping, validation, duplicate detection, staged commit and error report');
  const checkinCsv = [
    'Member ID,First Name,Last Name,Email,Session ID,Location,Date (IST),Order At,Checked In,Is Late Cancelled,Complementary,Cleaned Class,Is New',
    'SMOKE-MEMBER-2099,Smoke,Test,smoke-checkin@example.com,SMOKE-SESSION-2099,Kenkere House,2099-01-01 07:00:00,2098-12-31T08:00:00,TRUE,FALSE,FALSE,Studio Barre 57,Repeat Visit',
    'SMOKE-MEMBER-2099,Smoke,Test,smoke-checkin@example.com,SMOKE-SESSION-2099,Kenkere House,2099-01-01 07:00:00,2098-12-31T08:00:00,TRUE,FALSE,FALSE,Studio Barre 57,Repeat Visit',
    'SMOKE-MEMBER-INVALID,Smoke,Invalid,smoke-invalid@example.com,SMOKE-SESSION-2099,Kenkere House,2099-01-01 07:00:00,2098-12-31T08:00:00,MAYBE,FALSE,FALSE,Studio Barre 57,Repeat Visit',
  ].join('\n');
  const checkinForm = new FormData(); checkinForm.append('file', new Blob([checkinCsv], { type: 'text/csv' }), 'smoke-checkins.csv');
  const checkinUpload = (await request('/imports', { method: 'POST', body: checkinForm }, 201)).body; smokeCheckinImportId = checkinUpload.id;
  const checkinInspection = (await request(`/imports/${checkinUpload.id}?inspect=true`)).body.inspection;
  if (checkinInspection.detectedCategory !== 'checkins') throw new Error(`Checkins category detection failed: ${checkinInspection.detectedCategory}`);
  await request(`/imports/${checkinUpload.id}/validate`, { method: 'POST', body: json({ category: 'checkins', mapping: checkinInspection.suggestedMapping }) }, 202);
  let checkinImport: any;
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 150)); checkinImport = (await request(`/imports/${checkinUpload.id}`)).body; if (checkinImport.status === 'validated') break; }
  if (checkinImport.summary.valid !== 1 || checkinImport.summary.invalid !== 1 || checkinImport.summary.duplicates !== 1) throw new Error(`Checkins validation failed: ${JSON.stringify(checkinImport.summary)}`);
  await request(`/imports/${checkinUpload.id}/commit`, { method: 'POST', body: json({}) }, 202);
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 150)); checkinImport = (await request(`/imports/${checkinUpload.id}`)).body; if (checkinImport.status === 'committed') break; }
  if (checkinImport.imported_rows !== 1) throw new Error('Guided Checkins commit failed.');
  const checkinErrors = await request(`/imports/${checkinUpload.id}/errors.csv`);
  if (String(checkinErrors.body).includes('smoke-checkin@example.com') || String(checkinErrors.body).includes('smoke-invalid@example.com')) throw new Error('Checkins error report leaked source email addresses.');
  pass('Guided Checkins detection, validation, commit and privacy-safe error reporting');
  const analystCookie = cookie;
  cookie = '';
  await request('/auth/login', { method: 'POST', body: json({ email: 'studio@p57.demo', password: 'P57demo!' }) });
  const scopedReport = (await request('/reporting/run?report=monthly-performance&from=2026-09&to=2026-09')).body;
  if (scopedReport.options.studio !== 1 || scopedReport.rows.some((row: any) => row.studio !== 'Kemps Corner')) throw new Error('Studio-scoped reporting did not enforce the assigned studio.');
  await request('/reporting/run?report=monthly-performance&from=2026-09&to=2026-09&studio=2', {}, 403);
  await request('/reporting/saved', { method: 'POST', body: json({ name: 'Forbidden scoped report', report: 'monthly-performance', config: { from: '2026-09', to: '2026-09', studio: 2 } }) }, 403);
  cookie = '';
  await request('/auth/login', { method: 'POST', body: json({ email: 'associate@p57.demo', password: 'P57demo!' }) });
  await request('/reporting/catalog', {}, 403);
  cookie = '';
  await request('/auth/login', { method: 'POST', body: json({ email: 'analyst@p57.demo', password: 'P57demo!' }) });
  await request('/offers', { method: 'POST', body: json({ name: 'Forbidden analyst offer', studioId: 1 }) }, 403);
  await request('/targets/1', { method: 'PATCH', body: json({ proposedTarget: 1 }) }, 403);
  if ((await request('/reporting/catalog')).body.reports.some((report: any) => report.id === 'audit-activity')) throw new Error('Audit report leaked to a non-settings role.');
  cookie = analystCookie;
  pass('Server-enforced read-only, financial-permission and studio-scoped reporting access control');
  console.log(`\n${checks.length} smoke checks passed.`);
}
async function cleanupLocalArtifacts() {
  const local = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base);
  if (!local || process.env.SMOKE_CLEANUP === '0') return;
  const { db } = await import('../server/db.js');
  const stagedPaths = [smokeImportId, smokeCheckinImportId].filter((value): value is number => Boolean(value)).map(importId =>
    (db.prepare('SELECT file_path FROM imports WHERE id=?').get(importId) as any)?.file_path).filter(Boolean);
  const clean = db.transaction(() => {
    if (smokeSavedReportId) db.prepare('DELETE FROM saved_reports WHERE id=?').run(smokeSavedReportId);
    if (smokeReportAuditFloor) db.prepare("DELETE FROM audit_logs WHERE id>? AND (action='export_advanced_report' OR entity_type='saved_report')").run(smokeReportAuditFloor);
    if (smokeRunId) {
      const offerIds = (db.prepare('SELECT id FROM offers WHERE name LIKE ?').all(`Smoke Test Offer ${smokeRunId}%`) as any[]).map(row => String(row.id));
      const campaignIds = (db.prepare('SELECT id FROM campaigns WHERE name LIKE ? OR name LIKE ?').all(`Smoke Campaign ${smokeRunId}%`, `Conflicting ${smokeRunId}%`) as any[]).map(row => String(row.id));
      db.prepare('DELETE FROM campaigns WHERE name LIKE ? OR name LIKE ?').run(`Smoke Campaign ${smokeRunId}%`, `Conflicting ${smokeRunId}%`);
      db.prepare('DELETE FROM offers WHERE name LIKE ?').run(`Smoke Test Offer ${smokeRunId}%`);
      const deleteAudit = db.prepare("DELETE FROM audit_logs WHERE entity_type=? AND entity_id IN (SELECT value FROM json_each(?))");
      if (offerIds.length) deleteAudit.run('offer', JSON.stringify(offerIds));
      if (campaignIds.length) { deleteAudit.run('campaign', JSON.stringify(campaignIds)); deleteAudit.run('campaign_performance', JSON.stringify(campaignIds)); }
    }
    for (const fingerprint of smokeFingerprints) db.prepare('DELETE FROM generation_history WHERE fingerprint=?').run(fingerprint);
    if (smokeImportId) {
      db.prepare('DELETE FROM class_sessions WHERE import_id=?').run(smokeImportId);
      db.prepare("DELETE FROM audit_logs WHERE entity_type='import' AND entity_id=?").run(String(smokeImportId));
      db.prepare('DELETE FROM imports WHERE id=?').run(smokeImportId);
    }
    if (smokeCheckinImportId) {
      db.prepare('DELETE FROM checkins WHERE import_id=?').run(smokeCheckinImportId);
      db.prepare("DELETE FROM audit_logs WHERE entity_type='import' AND entity_id=?").run(String(smokeCheckinImportId));
      db.prepare('DELETE FROM imports WHERE id=?').run(smokeCheckinImportId);
    }
    if (smokeConversationId) {
      db.prepare('DELETE FROM copilot_messages WHERE conversation_id=?').run(smokeConversationId);
      db.prepare("DELETE FROM audit_logs WHERE entity_type='copilot_conversation' AND entity_id=?").run(String(smokeConversationId));
      db.prepare('DELETE FROM copilot_conversations WHERE id=?').run(smokeConversationId);
    }
    if (smokeTargetId) {
      db.prepare("DELETE FROM target_versions WHERE target_id=? AND (change_reason LIKE '%smoke test%' OR change_reason LIKE '%Smoke test%')").run(smokeTargetId);
      const version = (db.prepare('SELECT COALESCE(MAX(version),1) version FROM target_versions WHERE target_id=?').get(smokeTargetId) as any).version;
      db.prepare('UPDATE monthly_targets SET version=? WHERE id=?').run(version, smokeTargetId);
      db.prepare("DELETE FROM audit_logs WHERE entity_type IN ('target','monthly_target') AND entity_id=? AND (reason LIKE '%smoke test%' OR reason LIKE '%Smoke test%')").run(String(smokeTargetId));
    }
  });
  clean();
  const uploadRoot = `${path.resolve('p57-data/uploads')}${path.sep}`;
  for (const filePath of stagedPaths) {
    const resolved = path.resolve(filePath);
    if (resolved.startsWith(uploadRoot)) fs.rmSync(resolved, { force: true });
  }
}
run().then(cleanupLocalArtifacts).catch(async error => {
  try { await cleanupLocalArtifacts(); } catch (cleanupError: any) { console.error(`Cleanup failed: ${cleanupError.message}`); }
  console.error(`\nSMOKE FAILED: ${error.message}`); process.exit(1);
});
