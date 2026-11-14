# 2027 Sales Plan — Commercial Audit

Audited: `server/data/portfolio-2027/v5-portfolio.json` (v5-portfolio-offers50, ₹797.1L vs ₹643.9L prior year, +23.8%).
Evidence: transactions, leads and first-purchase records from the pre-wipe backup (`backups/2026-11-05-pre-wipe/studio.db`, 25,412 sales rows, Jul 2023 – 22 Oct 2026), plus `npm run plan:audit`.
Note: the plan's studio codes differ from the database's — plan `KH` = Kemps Corner (DB `KC`), `SHQ` = Bandra (DB `BA`), `KK` = Kenkere House (DB `KH`).

> **Housekeeping first:** the live `p57-data/studio.db` currently holds **0 transactions, 0 leads, 0 check-ins**. Every historical screen in the app is empty until the backup is restored or the imports are re-run.

The plan's arithmetic is clean. The built-in audit finds no critical issues. The risk is in the assumptions: **the renewal book is realistic, but the growth depends on new-client and lead volumes the studios have never reached.**

---

## 1. Where the growth comes from vs. what history supports

| Stream (KC + Bandra + Kenkere) | 2025 actual | 2026 run-rate* | 2027 plan | Plan vs run-rate |
|---|---|---|---|---|
| Renewal | ₹348L | ₹407L | ₹414L | **+2%** ✅ |
| Reactivation | ₹51L | ₹65L | ₹99L | **+53%** ⚠️ |
| New client | ₹115L | ₹93L | ₹216L | **+132%** 🔴 |

*Jan–Sep 2026 annualised.

Renewal is close to flat, which is a defensible plan. Almost all of the +₹150L growth sits in new-client revenue (more than double) and win-backs (+53%). New-client revenue actually **fell** in 2026 (₹115L → ₹93L run-rate).

## 2. The funnel needs about 3–4× the leads you've ever had

| Location | Avg leads/mo (2025–26) | Peak month | 2027 plan leads/mo | Multiple |
|---|---|---|---|---|
| Kemps Corner | 126 | 213 | 548 | **4.3×** |
| Bandra | 200 | 351 | 544 | **2.7×** |
| Kenkere House | 324 | 514 | 784 | **2.4×** |

Kemps Corner's April needs 941 leads and 129 new buyers. Its best month ever had 106 new buyers, and its average is 53/month. Caveat: the lead file is a current-state snapshot, so it may undercount history. Even so, nothing in the plan's marketing budget or channel section explains a 3–4× jump.

**Recommendation:** either (a) fund the lead gap explicitly, by adding a lead budget per month and cost-per-lead to the Marketing tab and holding performance marketing accountable for it, or (b) re-base new-client targets to around +25–35% on the 2026 run-rate and move the difference into a separate **Stretch** layer instead of the Standard plan.

## 3. Deeper discounting in 2026 did not buy acquisition

| Kemps Corner | 2025 | 2026 |
|---|---|---|
| Discount depth (discount ÷ list) | 8.9% | **19.2%** |
| New-client revenue (Jan–Sep) | ₹37.5L | ₹33.3L |
| Avg first purchase | ₹8,434 | ₹6,775 |

Discount depth roughly doubled while new-client revenue and first ticket both fell. The 2027 plan puts **63% of revenue (₹500.6L) through offers**.

**Recommendation:** cap planned offer revenue at around 45–50% per month. Use the ≤20% effective cap as a hard ceiling, not the default. Shift Kemps Corner acquisition offers toward non-cash perks (guest passes, privates, freezes), which keep the list price intact.

## 4. Kenkere House: intro pack is diluting first-purchase value

Kenkere's average first purchase fell from **₹5,397 to ₹2,545** in 2026, and new-client revenue nearly halved (₹21.0L → ₹10.7L, Jan–Sep), while buyer counts held. The ₹675 intro pack is working as a trial, but it isn't converting into memberships. The plan's trial→member rate is 18.7%, the lowest in the portfolio.

**Recommendation:** add a dated 14-day intro→membership conversion offer (for example, the intro price is credited against a first membership bought within 14 days). Track **intro-to-membership %** as a Kenkere KPI.

## 5. Calendar targets that history doesn't support

- **Kemps Corner October ₹50.2L (+91% vs Oct 2025)**, **Bandra October ₹16.6L (+63%)**. Q4 prior-year figures fall back to 2025 because 2026 Oct–Dec isn't in yet. Diwali was already in October 2025 (20 Oct), so the date shift doesn't explain the jump. Re-base October to around +25–30% and recheck once Oct–Dec 2026 actuals land.
- **August is under-targeted.** August 2025 (Amazing Race) was the best non-April month: KC ₹44.8L, Bandra ₹30.6L. 2026 fell to ₹30.0L / ₹22.8L. The 2027 targets (₹38.1L / ₹25.5L) sit between the two. Run a post-mortem on what made August 2025 work (format, price, team vs individual) before finalising The Amazing Race 2.0, which has changed to an individual race.
- **April stays the tent-pole** (KC ₹50L in 2026). The ₹60L target (+20%) is reasonable *if* the anniversary pre-sale opens in March.
- **January Kemps Corner +20% on an already strong Jan 2026 (+33% YoY)**: flagged as "balanced", but this is closer to stretch.

## 6. Reactivation is a hypothesis, not a measured rate

The plan books ₹99L of win-backs (+53%), yet `dataGaps` admits lapsed-outreach response rates have no send or response logs. **Recommendation:** run a January lapsed-cohort test with a holdout (10–20% get no outreach) so the remaining 11 months use a measured response rate.

## 7. Measurement enhancements (do these in January)

1. **Tag every redemption with its O27-xx ID** (already flagged in dataGaps). Without it no offer can be judged, and 2028 planning repeats this guesswork.
2. **Log trial attendance** (booked vs showed) so booking→attendance stops being unknown.
3. **Monthly re-forecast:** compare actual leads, trials and new buyers to the plan's funnel each month. Trigger a target review if leads run <70% of plan for two consecutive months.
4. **Restore the live database** and add a guard so destructive seeds can't run against the workspace without a backup.

---

## Priority summary

| # | Action | Impact |
|---|---|---|
| 1 | Re-base new-client targets, or fund the lead gap explicitly | Removes the biggest miss risk (~₹100L+) |
| 2 | Cap offer revenue share; prefer perks over cash at Kemps Corner | Protects margin; 2026 shows depth ≠ volume |
| 3 | Re-base October (KC/Bandra) | Avoids a ~₹15L+ Q4 shortfall |
| 4 | August 2025 post-mortem before Amazing Race 2.0 | Recover the ₹15L dip from 2025 to 2026 |
| 5 | Kenkere intro→membership bridge | Restores first-ticket value |
| 6 | Offer tagging, trial attendance, win-back holdout | Turns 2027 into measured learning |
| 7 | Restore the live DB | App analytics currently empty |
