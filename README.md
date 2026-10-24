# P57 Sales Intelligence Studio

A working full-stack commercial planning application for Physique 57 India. It turns the uploaded historical files into studio analytics, editable targets, funnel requirements, financially evaluated offers, campaign plans, and measured campaign results.

The UI is a responsive React application. The API, relational database, calculations, RBAC, imports, sessions, and audit history run server-side. The browser is not the source of truth for important records.

## Implemented workspaces

1. Executive Dashboard
2. Studio Intelligence, including trainer delivery performance
3. Annual Sales Planner with target reconciliation and version history
4. Monthly Campaign Calendar with annual, monthly, and weekly views
5. April Anniversary Studio with portfolio planning and post-April retention
6. Revenue & Funnel Simulator
7. Retention & Reactivation
8. AI Offer Generator with a genuine optional provider integration
9. Goal-Based Offer Builder
10. Random Offer Generator with variation controls
11. Offer Bank with search, filters, cloning, versions, and approval
12. Offer Builder & Editor with live server-recalculated economics
13. Campaign Performance and the learning loop
14. Data Import & Management
15. Advanced Reporting Studio with 21 configurable reports, saved views, CSV/XLSX and print
16. Settings & Permissions

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
FORCE_SEED=true npm run seed       # destructive rebuild; first initialisation only
npm run import:checkins            # authorised Checkins export; uses a temporary file
npm run targets:regenerate         # apply refreshed funnel evidence; proposed values are rewritten/versioned
npm run dev
```

For an existing populated workspace, use `npm install && npm run dev` without rebuilding. If the Google Sheet is not publicly exportable in another environment, download the authorised Checkins CSV and run `npm run import:checkins -- /secure/path/Checkins.csv` instead. Do not rerun an unchanged import into the live workspace; duplicate rows are preserved in the error report by design.

- Web application: `http://localhost:5173`
- API: `http://localhost:3001/api`
- The Vite development server proxies `/api` to the API.
- **The seed command rebuilds the database. Do not use `FORCE_SEED=true` against data you need to keep.**

### Direct workspace access

Sign-in is required by default. Set `DIRECT_WORKSPACE=true` only on a local or trusted network: it opens directly into an administrator session for every visitor. Set passwords with `npm run user -- password you@example.com "long-password"`.

The seeded API accounts remain available for automated role/RBAC verification. Rotate or disable their shared demonstration passwords before any real deployment, and protect the login-free workspace with trusted network or identity-aware access control. See [Deployment](docs/DEPLOYMENT.md).

Production startup now refuses `DIRECT_WORKSPACE=true` and refuses to start while an active account still uses the shared seeded demonstration password.

## Current imported data

The rebuilt database contains:

- 11 dynamically managed studio/location records
- 25,412 valid transaction rows
- 25,556 current-state lead rows
- 13,485 member/first-visit records
- 26,048 class-session records
- 152,828 privacy-safe Checkins booking/attendance records from 152,875 source rows, with 47 reported duplicates
- 1,121 trainer-performance rows
- 29,203 customer-package lifecycle rows
- 115 reconstructed historical promotion offers; 166 offers in total including clearly separated policy and experiment drafts
- 132 proposed studio-month targets for each of 2026 and 2027

Sales coverage runs from 4 July 2023 through 22 October 2026. October 2026 is incomplete; November and December 2026 have no sales actuals. Checkins coverage runs from 2 January 2024 through future sessions dated 29 October 2026; current-day and future sessions are excluded from behavioural actuals. The seven original files in `uploads/` plus the supplied **Day End Report - Part 4 / Checkins** Google Sheet have import-provenance records.

Kemps Corner’s 2027 proposed plan accounts for the user-directed Kwality House rent increase beginning January 2027 while retaining comparable-month seasonality. Monthly proposals vary within a **₹30–40L guardrail**—₹32L, ₹30L, ₹30L, ₹40L, ₹30L, ₹30L, ₹31L, ₹35L, ₹38L, ₹31L, ₹30L and ₹32L—totalling **₹3.89Cr**. The earlier ₹35–40L wording was a rough range, not a flat monthly floor. Original baseline forecasts remain stored separately—including the April anniversary baseline—and no approved target was created or changed. No rent amount or expense saving has been invented.

The twelve additional 2027 campaign plans are clearly labelled demonstrations. They contain no fabricated campaign actuals and are not included as historical performance.

## Core workflows

### Targets and reconciliation

Generate or edit studio-specific monthly targets under nominal, standard or aggressive planning postures (with legacy conservative/base/stretch scenarios retained for compatibility). Proposed and approved targets remain separate. Annual totals reconcile to the monthly stream; any shortfall or overallocation is shown. Every change creates a version with actor, reason, before/after values, and timestamp. Regeneration is an explicit overwrite of proposed recommendations, optionally scoped to the selected studio; approved targets are preserved. For Kemps Corner in 2027, regeneration also reapplies the documented ₹30–40L rent-aware guardrail while retaining seasonal monthly values and leaving the baseline forecast unadjusted.

### Funnel simulation

The calculation path is explicit:

1. Remaining revenue = max(target − achieved, 0)
2. New-client revenue = max(remaining − existing-client − renewal − reactivation contribution, 0)
3. New buyers = round up(new-client revenue / average first purchase)
4. Completed trials = round up(new buyers / trial-to-purchase rate)
5. Trial bookings = round up(completed trials / booking-to-attendance rate)
6. Leads = round up(trial bookings / lead-to-booking rate)

Where Checkins history exists, booking-to-attendance uses the observed trailing-12-month **all-booking** rate with its sample size and scope. It is not represented as a trial-specific rate. Lead-to-booking remains an explicit planning assumption because the lead source is not a dated booking-event log.

Invalid or zero rates produce a warning and `null` downstream counts—never `Infinity` or a fabricated result. An available-leads forecast is a separate sensitivity calculation, not a guarantee.

### Member attendance and cancellation intelligence

Each studio profile includes monthly check-ins, late cancellations, other non-check-ins, active-member visit frequency, mature next-month attendance return, day/time patterns, class-level review queues, booking lead time, and a seasonal-naive operational attendance outlook. The outlook uses a capped six-month trend and a recent-volatility planning range; it is not a confidence interval or revenue forecast.

Checkins stores compact salted member hashes and operational fields only. Source names, email addresses, and `Paid` values are not persisted in the new dataset. Attendance is operational context, not attributed revenue or proof of incremental lift. Because every unattended source row is labelled `Not Attended`, trial-specific cancellation behaviour cannot be recovered and is not inferred. The Google Sheet is an imported snapshot, not a claimed live sync.

### Offers and approvals

Manual, goal-based, constrained-random, and provider-backed AI routes all use the same deterministic financial engine. Selling price, redemptions, buyers, revenue, discount cost, contribution margin, break-even, target gap, capacity, and policy violations are recalculated on the server.

Offers can be drafted, edited, cloned across studios, versioned, approved, rejected, and archived. Clones retain their original-offer link and are recalculated for the destination studio. An offer with a guardrail error cannot be approved.

The advanced commercial policy module supports cash discounts, 2-for-1 and 3-for-2 packs, complimentary classes, freeze attempts, validity extensions, guest passes, hosted classes, 30-minute or virtual privates, trainer check-ins, retail/custom benefits, stacks and eligibility conditions. Product options and MRP come from explicit product-master IDs. Pricing and fulfilment products may differ, with hosted-catalogue provenance shown separately. Missing benefit costs leave contribution economics incomplete rather than treating cost as zero.

Eleven studio policies encode the configured journeys and standard membership/pack/lapsed discounts. Bengaluru is Barre-only; Kenkere uses the ₹675 intro pack against a ₹1,350 single-class MRP plus once-lifetime Newcomers 2-for-1; Copper + Cloves and Plash Pilates use paid trials; Mumbai Strength and PowerCycle trials require Newcomers 2-for-1. Annual perks are valued separately from the 20% cash discount. Policy-generated concepts remain drafts until explicitly reviewed.

Offer Bank also contains persistent monthly 2-for-1 versus 3-for-2 experiment links. Creating a test commits both offers and the experiment atomically. Aggregate outcomes require a source, buyers cannot exceed eligible assignments, completion enforces the configured minimum sample, and no causal lift is inferred automatically.

### Renewal-due reporting and Studio Intelligence

Retention includes aggregate monthly renewal-due reporting from currently open packages. Known paid value, matched current list MRP and historical renewal-coded revenue are separate. An optional conversion rate produces an explicitly labelled scenario from known values; it is not a forecast and missing package values are not imputed.

Studio Intelligence includes complete-month historic findings across revenue, YoY, discounts, products and attendance. Partial or future months are excluded from those findings.

### Persistent Copilot

The global Copilot builds policy-checked offers, renewal reports and complete sales-plan concepts, with conversations and attachments persisted server-side. It can save an offer draft only through the normal validation and permission path. Deterministic mode is explicitly labelled **not AI**. Optional provider-backed narrative is schema-validated, while all finances and policy checks remain deterministic; no provider key reaches the browser.

### Campaigns and learning

Campaigns require a linked offer. Activation requires that offer to be approved. Overlapping campaigns for the same studio, audience, and objective return a conflict warning; an authorised user must explicitly acknowledge it before forcing the schedule.

Campaign actuals record eligible audience, reach, responses, redemptions, buyers, transactions, revenue, discount, and costs. The app compares planned versus actual revenue and conversion. Attributed revenue is not labelled as causal or incremental lift without a valid experiment.

### Guided imports

CSV, XLSX, and XLSM files follow this path:

`Upload → inspect → choose worksheet/category → map fields → validate → review errors/duplicates → confirm → background commit → summary`

The importer supports eight categories, including Checkins, plus reusable mapping templates, unknown-studio review, row-level error reports, source IDs, duplicate checks, import IDs, and original filenames. Validation and commit are staged; only valid, non-duplicate rows are committed. Existing records are not silently replaced. Checkins error reports exclude source names and email addresses.

### Advanced Reporting Studio and exports

The reporting workspace contains **21 executable reports**: five Executive, six Commercial, three Retention, four Operations and three Governance reports. Coverage includes monthly/annual performance, revenue streams, target attainment and scenarios, products, discount exposure, offer economics, campaigns, experiments, leads, renewal dues, package lifecycle, historical renewal revenue, attendance/cancellations, class and trainer delivery, capacity, import lineage, data quality and aggregate audit activity.

Each report shares period and studio controls, with report-specific status, data-mode or target-scenario filters where valid. Search, sorting, selected columns, row limits, KPI summaries, interactive bar/line charts, inspectable rows, and definitions/provenance all run against the same server result. Summaries and charts use every matching row before the table-preview limit. Missing actuals stay null rather than becoming zero; scenario generation is read-only; historical renewal revenue, current dues and hypothetical conversion remain distinct.

Saved views persist the owner’s configuration in SQLite, not a frozen data snapshot. Loading a view reruns it against current data under the current user’s permissions and studio scope. CSV and styled XLSX exports use the identical selected columns and rows; workbooks include Management summary, Report data and Read me sheets. Exports above 10,000 rows are rejected rather than silently truncated, text is protected against spreadsheet-formula injection, and export actions are audited. Responsive print styling supports browser PDF output. Legacy target, dashboard, offer, campaign-performance and audit exports remain available. No external document service or publishing integration is claimed.

## Metric and data boundaries

- **Historical actuals:** imported paid transactions and operational records.
- **Proposed targets:** editable planning inputs, not actuals or approved forecasts.
- **Approved targets:** explicit management decisions, stored separately from proposed values.
- **Inferred renewal/reactivation:** transaction classifications based on observed membership timing, not perfect customer-lifetime cohorts.
- **Trial bookings:** unavailable as a dated trial-specific event series and therefore shown as unavailable on actual dashboards. Checkins supplies all-booking attendance, not a substitute trial-booking event log.
- **Checkins:** observed check-ins, late cancellations, and other non-check-ins are separate. Current-day/future sessions are excluded; next-month attendance return is not membership renewal or churn.
- **Lead conversion:** the lead file is a current-state snapshot, not a dated booking-event log. Lead-to-booking requires an explicit assumption or another source.
- **Trial-to-purchase:** observed from matured first-visit cohorts with a 90-day purchase window.
- **Promotion performance:** revenue attributed to imported discount codes. This does not prove incremental lift.
- **Capacity:** average monthly scheduled capacity across observed months, not a lifetime sum. Planning utilisation is an approximation, not a reservation-system guarantee.
- **Trainer performance:** aggregated from the uploaded payroll/trainer file; it is not a fabricated ranking.
- **Customer privacy:** imported member identifiers are pseudonymised. Aggregate analytics are the default; customer-level permission is separate.
- **Demonstrations:** labelled separately and never used as historical actuals.

Detailed definitions and provenance are also available inside the application.

## AI and external integrations

Set `OPENAI_API_KEY` on the server to enable the real OpenAI Responses API offer and Copilot workflows. Optional `AI_PROVIDER_BASE_URL` and `OPENAI_MODEL` configure a compatible Responses API endpoint and model. Provider concepts/narratives are validated against Zod schemas. The server then calculates all economics and enforces all commercial rules. API keys are never sent to the browser.

Without credentials, the UI states that AI is not configured. The deterministic rules and random workflows remain available, but they are never presented as AI.

Momence, WhatsApp, CRM, and advertising-platform publishing are **not implemented**. The application does not claim that an internal schedule or exported file has been published externally.

## RBAC and auditability

- Administrator: full administration, approval, settings, and customer-level permission.
- Senior management: broad planning, approval, import, export, and customer-level access; no settings administration.
- Sales manager: cross-studio planning and editing without final approval or settings.
- Studio manager: editing restricted to the assigned studio.
- Sales associate: limited offer creation/editing within the assigned studio.
- Read-only analyst: read and export only.

Permissions and studio scope are enforced by the API, not just hidden in the UI. Sessions are random, hashed at rest, persistent, HTTP-only, and revocable. Login attempts are throttled. Changes to important records include audit events.

## Verification

```bash
npm test                 # 68 calculation, reporting, commercial-policy, Copilot, Checkins and edge-case tests
npm run smoke            # 26 API/RBAC/import/offer/campaign/report/export/saved-view checks
npx playwright install chromium
npm run test:e2e         # 4 Chromium suites: all modules/mobile + advanced commercial + reporting journeys
npm run build            # TypeScript and production frontend build
npm audit                # dependency vulnerability check
```

For local URLs, the smoke test cleans its isolated future-year offers, campaigns, imports, saved views, reporting audit events, and target-version changes after the run. Set `SMOKE_CLEANUP=0` only when deliberately retaining those test artifacts. Use `SMOKE_BASE_URL` to target another local port.

## Project structure

- `src/` — React shell, pages, shared components, types, and responsive/print styles
- `server/index.ts` — Express API and workflow endpoints
- `server/db.ts` — SQLite schema, indexes, and audit helper
- `server/lib/` — calculations, intelligence, imports, segments, offers, reporting engine/export workbooks, formatting, and authentication
- `server/seed.ts` — reproducible import and demonstration-plan builder
- `tests/` — deterministic unit tests
- `e2e/` — Chromium browser tests
- `scripts/smoke.ts` — self-cleaning end-to-end API smoke test
- `scripts/import-checkins.ts` — authorised Google Sheet/local CSV import with temporary-file cleanup
- `scripts/regenerate-targets.ts` — explicit proposed-target regeneration after a source refresh
- `scripts/user.ts` — production password rotation/account deactivation CLI
- `uploads/` — original source files
- `p57-data/` — runtime database and private staged uploads; excluded from source control

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production setup, security, backup, and smoke-testing instructions.
