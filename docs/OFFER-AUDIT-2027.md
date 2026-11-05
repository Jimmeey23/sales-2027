# 2027 offer plan — audit

> **The findings below have been acted on.** See
> [OFFER-AUDIT-2027-CLEANUP.md](OFFER-AUDIT-2027-CLEANUP.md) for what changed and why. The audit
> now reports 51 findings, none of them critical. This document is kept as the record of what was
> wrong, and of the reasoning behind each fix.

**Scope:** every offer planned for 2027 in the plan of record
(`server/data/portfolio-2027/v5-portfolio.json` — 4 locations, 172 offer instances from a
50-offer bank, ₹7,97,11,540 against ₹6,44,59,711), plus the Kemps Corner month files they
are supposed to have replaced.

**Method:** `npm run plan:audit` (or `node scripts/audit-2027-offers.mjs --strict`). Every
finding below is provable from the files — no estimates, no inferred intent. Re-run it after
any edit; it exits non-zero on criticals in `--strict`.

**Result: 177 findings — 9 critical, 114 high, 6 medium, 48 low.**

The headline: **the plan adds up, but the offers do not carry it.** Streams add to month
targets, months add to the year, growth recomputes exactly, and the funnel arithmetic is
clean in all 48 studio-months. What fails is the join between the two models — the offers
cover 61% of the year, and they cover the wrong 61%.

---

## What is sound

Worth saying first, because it is most of the plan:

- Streams (new client / renewal / reactivation / other) add to each month's target, and the
  twelve months add to each location's year target, to the rupee, at all four locations.
- Growth percentages recompute exactly at portfolio, studio and month level.
- Funnel arithmetic is internally consistent everywhere: leads × lead→trial = trials,
  trials × trial→member = new buyers, buyers × ticket = the new-client stream, renewals ×
  ticket = the renewal stream, winbacks × ticket = the reactivation stream. Zero exceptions
  in 48 studio-months.
- The trailing rates declared at studio level are the rates actually used in every month
  (trial→member, lead→trial, renewal rate, first-60-day spend, renewal ticket, winback
  ticket). No month quietly uses a friendlier number.
- All 50 bank offers reconcile: `plannedRevenue` = Σ `planByStudio` = Σ scheduled month
  offers, for all 50. Every bank offer sits in the month it is filed under, and no offer
  appears twice in a studio-month.
- Discount caps hold. Every offer above 20% effective falls in an exempt category (spot,
  annual, bulk privates, bulk purchase, credited intro), and all 124 bank rule checks read
  OK. The one non-OK check is `O27-44 Thank U, Next (Year)`, which correctly declares "no
  price discount".
- Prices reconcile with the catalogue: Mumbai 1M ₹20,239, Kenkere ₹14,595, 3M/6M/annual and
  private rates all match `server/data/membership-prices.json`, as do the derived figures
  quoted in the copy (3M at 15% = ₹49,177 / ₹35,879; 6M at 20% = ₹90,972 / ₹65,772; annual
  at 22% = ₹1,71,171 / ₹1,21,867).
- Key dates check out against the 2027 calendar: Mother's Day 9 May, Father's Day 20 June,
  Holi 22 Mar, International Women's Day 8 Mar, Independence Day 15 Aug, Friendship Day
  1 Aug, Diwali 29 Oct, Black Friday 26 Nov → Strong Monday 29 Nov. "57 days to Diwali"
  starting 2 Sep is exactly 57 days. The old Pride-in-February and Women's-Day-in-August
  errors are gone.
- CRM sends are exactly one per offer in every studio-month, matching the stated policy.

---

## Critical

### 1. Two different Kemps Corner plans, both live

`server/data/kc-2027/` (month-01…12 + `year.json` + generated `plan-2027.json`) and the `KH`
block of `v5-portfolio.json` are two versions of the same year, and they disagree on almost
everything except the headline number.

| | `kc-2027` month files | `v5-portfolio` KH block |
|---|---|---|
| Target | ₹4,20,00,000 | ₹4,20,00,000 |
| Prior year | ₹3,34,38,469 | ₹3,22,52,914 |
| Growth | **+25.6%** | **+30.2%** |
| New-client stream | ₹61.92L | ₹1,00,80,000 |
| Renewal stream | ₹2,64,10,544 | ₹2,31,00,000 |
| Reactivation stream | ₹52.87L | ₹50,40,000 |
| Other stream | ₹41.10L | ₹37,80,000 |
| Offers | **55** | **47** |
| Offer revenue | ₹2.98Cr | ₹2.61Cr |

Eleven of the twelve monthly targets differ — October by ₹10.7L (₹39.5L vs ₹50.2L),
November by ₹5.1L, April by ₹5L. The two offer sets share almost nothing: January has
"Week Zero, Hero / Resolution Insurance / Kickstart 21" against "The 57-Hour Hangover Sale /
Third Time's the Charm / The Baker's Dozen"; April has "Nine Days on Cloud Nine / Pull &
Renew / The Long Game" against "Cloud Nine Limited Edition / Spin Class / Party Crasher
Pass".

The README documents the month-file version ("For the year the studio signed the figures are
₹4,20,00,000 against ₹3,34,38,469 (+25.6%), 55 offers") while calling `v5-portfolio.json`
the plan of record. Both cannot be true.

**Which numbers are right?** The prior year is, in the portfolio's favour — see below. The
*offers* are, in the month files' favour:

| Stream | month-file version | v5 KH block |
|---|---|---|
| New client | **77%** covered | 43% |
| Renewal | 78% | 80% |
| Reactivation | **86%** | 53% |
| Other | 0% | **14%** |

The v5 rewrite made Kemps Corner's offer plan *weaker* on the one stream the growth depends
on. If the goal was a 50-offer shared bank, it cost Kemps Corner ₹37L of planned offer
revenue and 8 offers.

**Fix:** pick one. Either fold the month files into the bank (add the 8 missing KC offers as
bank entries so other locations can use them too) or retire `kc-2027/month-*.json` and
`year.json` to an `archive/` folder and correct the README. Do not ship both.

### 2. The Kemps Corner month files use the wrong prior-year figures

Four months carry a prior year that is not the observed actual:

| Month | month file | observed | error |
|---|---|---|---|
| August | ₹29,96,981 | ₹30,00,656 | −₹3,675 |
| October | ₹30,71,247 | ₹26,34,376 | **+₹4,36,871** |
| November | ₹21,58,021 | ₹18,51,052 | **+₹3,06,969** |
| December | ₹31,31,133 | ₹26,85,743 | **+₹4,45,390** |

The observed figures are the portfolio's own `studioIntelligence.KC.history.monthly` and are
corroborated by `server/data/actuals-2026-by-studio.json` (STU_KH Aug ₹30,00,656.47). The
month files inflate the base by ₹11.86L, which is why the "signed" prior year is
₹3,34,38,469 instead of ₹3,22,52,914 and why the studio is being told +25.6% when the real
ask is **+30.2%**.

`scripts/build-kc-plan.ts` checks the months against `year.json`, so this never fails the
build — it only checks the months against the contract, not against the actuals.

**Fix:** correct the four `priorYear` values in `month-08/10/11/12.json`, update
`year.json` to ₹3,22,52,914 / +30.2%, and re-derive the stream split. Add the actuals to
the build's assertions so a stale base fails loudly.

### 3. Offers cover 41% of the new-client target — and 80% of renewals

| Stream | Target | Offer revenue | Cover |
|---|---|---|---|
| New client | ₹2,17,88,703 | ₹90,00,000 (₹90L) | **41%** |
| Renewal | ₹4,24,23,213 | ₹3,37,47,819 | **80%** |
| Reactivation | ₹99,02,755 | ₹52,13,497 | **53%** |
| Other | ₹55,96,869 | ₹10,11,500 | **18%** |
| **Total** | **₹7,97,11,540** | **₹4,89,72,805** | **61%** |

The year is a growth plan: new-client revenue is budgeted at ₹2.18Cr, +63% on the
month-file version. But the offer set is built for retention — renewals are 80% covered
while acquisition is 41%. The plan's own diagnosis (KC "Retention-led", BA
"Reactivation-led", KK "Conversion-led", POP "Reach-led") got baked into the offers at the
expense of the arithmetic.

**Fix:** treat the new-client line as the binding constraint. Either add newcomer offers
where the gap is widest, or restate the targets honestly.

### 4. Months where the new-client line has no offer at all

| Location / month | New-client target | Newcomer offers |
|---|---|---|
| **Kemps Corner March** | ₹6.17L | **none** (both offers are renewals) |
| Kemps Corner July | ₹8.1L | none |
| Kemps Corner November | ₹5.1L | none |
| Bandra July | ₹5.8L | none |
| Bandra November | ₹3.7L | none |
| Kenkere July | ₹4.2L | none |
| Kenkere November | ₹3.8L | none |
| Pop-ups June | ₹1.25L | **no offers at all** |

Kemps Corner March is the clearest: the funnel says 55 new buyers and the plan schedules
"Monogamy Is Overrated" and "Bura Na Mano, Renewal Hai" — both renewals. The Women's Day
newcomer offer, `O27-10 Lift Like a Girl`, runs at **Bandra only**, so the biggest studio
and Kenkere get no acquisition mechanic in the month their own key date flags as an
acquisition moment.

Pop-ups June has a ₹2.25L target, a funnel needing 59 new buyers and 14 renewals, and zero
offers — no slots, no CRM sends, nothing.

November is structurally thin: Black Friday (renewal) plus Thank U, Next (goodwill) and
nothing else at Bandra, Kemps Corner and Kenkere, against a full month of targets. Only the
pop-ups get a third offer.

### 5. Pop-ups: reactivation offers against a ₹0 reactivation target

The pop-up year budget is `{newClient: 12,68,089, renewal: 10,14,473, reactivation: 0,
other: 23,055}`. Eight months still run reactivation offers worth ₹1,36,552 — "U Up? It's
2027", "Galentine's Gone Ghost", "Where Are They Now?", "Gone With the Wind", "New Phone,
Who Dis?", "Diwali Cleaning", "Last Seen: 2026".

Either the target is missing or the offers are misfiled. Given the pop-ups have no lapsed
base worth speaking of (514 buyers in 12 months, 76.9% renewal rate, ₹0 private revenue,
₹100 retail revenue), the reactivation line is probably genuinely zero — in which case
seven offers are doing work the plan says does not exist, and their revenue is landing in a
stream with nothing to hold it.

### 6. Pop-ups October prior year is exactly double the actual

Plan says ₹1,30,000; the observed Oct-2025 actual is ₹65,205. Exactly 2×. Every other
pop-up month ties to history.

Correcting it moves the pop-up prior year from ₹16,06,624 to ₹15,35,829 and the true ask
from the stated +43.5% to **+50.1%** for the year — and October alone from +43.5% to
**+186%**.

---

## High

### 7. The offer bank and the studios use different location codes

The bank's `planByStudio` and `studios` arrays are keyed **BA / KC / KK / POP**. The
`studios[]` array that carries the months is keyed **SHQ / KH / KK / POP**. Bandra and
Kemps Corner disagree in both positions.

Any join on studio code silently returns nothing. `O27-28 Team Building Without the Trust
Falls` declares `['BA','KC','KK']` but is planned and scheduled at SHQ and KH only — Kenkere
is named in the catalogue, given no buyers or revenue, and dropped without a note.

**Fix:** one enum, used by both. Add the code mapping as a hard assertion in
`scripts/unpack-plan.ts` and `build-kc-plan.ts`.

### 8. 27 of 172 offers: price × buyers ≠ planned revenue

The month offer carries `price` (one product's price) but `expectedRevenue` (buyers × a
blended ticket). The bank keeps the blended ticket; the month offer does not.

| Offer | Price | Buyers | Price × buyers | Planned revenue |
|---|---|---|---|---|
| KH Aug Medal Detector | ₹90,972 | 37 | ₹3,36,59,964 | ₹15,54,000 |
| KH Aug (bank ticket) | ₹42,000 | 37 | — | ₹15,54,000 ✓ |
| KH Aug Medal Detector | ₹90,972 | 24 | ₹2,18,32,728 | ₹10,08,000 |
| KH Jan Third Time's the Charm | ₹3,885 | 30 | ₹1,16,550 | ₹5,16,090 |
| KH Jun Happy Hour | ₹4,200 | 40 | ₹1,68,000 | ₹3,36,000 |

The direction flips: for intro products the price is the *entry* ₹3,885 and the revenue is
the ₹17,203 first membership behind it; for ladders the price is the *top* tier ₹90,972 and
the revenue is the ₹42,000 blend. `O27-44 Thank U, Next (Year)` has `price: null` at all
four locations while still carrying buyers and revenue.

This matters because `server/lib/salesPlanImport.ts` stores `offer.price` as `expected_asp`
and the app's economics engine recomputes revenue from ASP × purchases. Kemps Corner August
would report ₹3.37Cr of offer revenue against a ₹38.1L target instead of ₹15.54L against it.

**Fix:** carry `ticket` on the month offer (the importer already accepts it — line ~229 of
`salesPlanImport.ts` reads `price`, `expectedAsp`, `sellingPrice`, `asp`), keep `price` as
the headline shelf price, and assert `expectedRevenue === ticket × buyers` at import.

### 9. Twenty offer instances run outside the month they are planned in

| Offer | Window | Planned in | Revenue at Kemps | Revenue at Bandra |
|---|---|---|---|---|
| Proof of Work | 15 Feb → 10 Mar | February | ₹12,00,000 | ₹7,80,000 |
| Medal Detector | 15 Aug → 5 Sep | August | ₹15,54,000 | ₹10,08,000 |
| Mom Said Get Off the Couch | 1 May → 30 Jun | May | ₹1,89,000 | ₹1,26,000 |
| Group Project | 1 May → 30 Jun | May | ₹1,18,128 | ₹78,752 |
| Diwali Gifting, Minus the Dry-Fruit Box | 1 Oct → 15 Nov | October | ₹1,16,550 | ₹62,160 |

×4 locations. Some of this is deliberate — the Stronger in 30 finishers' night is 2 March,
so the renewal ladder has to straddle. But the revenue is booked entirely in the month the
offer is filed under, not the month the window closes in. The two large ones matter: Kemps
Corner's February carries ₹12L from a ladder that runs to 10 March, and its August carries
₹15.54L from a race-finisher ladder that runs to 5 September. If either slips, the shortfall
shows up in the *following* month, where no one is looking for it.

**Fix:** either split the revenue across the two months by window overlap, or book the
revenue to the month the window predominantly falls in and say so.

### 10. Bengaluru private price is wrong, and the plan knows it

`policy.perkValues` says *"Private Mumbai ₹5,250 (Bengaluru ₹3,500 — confirm)"*. It was
never confirmed. The catalogue (`membership-prices.json`) says Bengaluru Studio Private
Class is **₹4,121.25**. The plan uses ₹3,500 throughout.

That understates Kenkere's Happy Hour price (₹2,800 vs ₹3,297), the 10-private bulk pack
(₹26,250 vs ₹30,907), and the value of the two privates in every annual perk stack.

Related: Kenkere `fourClass` is ₹4,779 in the price book but ₹4,672.50 in the catalogue.

### 11. Bandra privates: 52 sessions in June against 6 in the trailing year

Bandra's trailing-12-month private revenue is **₹31,295** — roughly six sessions. June
alone plans 26 Happy Hour buyers at ₹8,400 (52 sessions) plus 3 bulk 10-packs at ₹39,375:
₹3,36,525 of privates in one month.

The "other" stream the plan sets for Bandra is ₹9,12,800 for the year against trailing
privates + retail of ₹6,10,305 — a 50% lift on a line that did ₹31k in privates. Kenkere's
June privates ask (80 sessions) is 2.5× its monthly run rate, which is ambitious but
arguable; Bandra's is 10×.

The same check across the portfolio: KH other ₹37.8L vs ₹27.2L trailing, KK ₹8.81L vs
₹7.12L, POP ₹23,055 vs **₹100**.

### 12. Offers with no list price, so no verifiable discount

Four bank offers price products that do not exist in the catalogue, which makes their
`effectiveDiscountPercent` unfalsifiable:

- `O27-27 Kitty Party, But Make It Cardio` — studio bookout ₹24,999 / ₹14,999 / ₹9,999,
  recorded as **0%**.
- `O27-49 Secret Santa Squats` — voucher ₹1,999 / ₹1,499 / ₹999, recorded as **20%**; the
  implied list (₹2,499) matches nothing.
- `O27-13 Cloud Nine Limited Edition` — a 9+1 month SKU at ₹1,64,999 / ₹1,19,999.
- `O27-47 12 Days of Shakemas` — ₹30,000 blended across twelve different daily deals.

These are legitimate new SKUs; they just need a list price or an explicit "bespoke, no list
price" marker so the cap check can say something true.

### 13. `O27-16 Party Crasher Pass`, pop-up price omits the credit

Mumbai: 1M at 15% (₹17,203) − ₹999 credit = ₹16,204 ✓.
Kenkere: 1M at 15% (₹12,406) − ₹699 credit = ₹11,707 ✓.
Pop-up: ₹5,892 — which is 8-class at 15% (₹5,891) with **no credit applied**. The details
say the pass price (₹999) is credited. Correct figure is ₹4,892, and the true effective
discount is 15%, not the 20% recorded.

Small money (3 buyers, ₹3,000) but it is the same rule applied three ways.

### 14. Three generations of offer plan ship together

| Generation | Files | Offers | January theme |
|---|---|---|---|
| v4 | `approved-plan-2027.json`, `sales-offer-plan-2027.json`, `bengaluru-plan-2027.json` | 432 (144 selected) | "Start Line" |
| v5 | `portfolio-2027/v5-portfolio.json` | 172 | "Resolutions with Receipts" |
| KC | `kc-2027/month-*.json` | 55 | "The Dress Rehearsal" |

Exactly **one** offer name is shared between v4 and v5. `server/lib/planSync2027.ts` still
rebuilds January and February from v4 (`PLAN_SYNC_VERSION = '2027-01-start-line-own-offers'`),
guarded only by `planWasImported` — so a database that has not run the portfolio import gets
v4's January offers, and one that has gets v5's. `server/lib/aprilMechanics2027.ts` describes
a *fourth* April set (Anniversary Wheel, The Golden Ticket, Nine Years Nine Gifts) that
appears in neither.

**Fix:** move v4 to `archive/` and update `planSync2027.ts`, or delete it. Reconcile the
April mechanics with whichever plan wins.

---

## Medium

### 15. Targets are set on two different bases

Kenkere: eight of the twelve months (Feb, Mar, May–Oct) at *exactly* +14.7%, with January
(+6.2%), April (+24.1%) and December (+57.3%) hand-set. Pop-ups: all twelve months at
*exactly* +43.5%, with October's base wrong (finding 6).

Flat uplift is defensible — it preserves each month's own seasonality — but mixing
hand-picked and mechanical months in one plan, with no marker for which is which, means
nobody can tell where a judgement was made.

### 16. Concentration: 30% of planned offer revenue in 12 instances

The top 12 offer instances carry ₹1.47Cr of ₹4.90Cr. Kemps Corner April's
`O27-13 Cloud Nine Limited Edition` alone plans ₹18,15,000 — 30% of the biggest month of
the year — on **11 buyers** of a brand-new ₹1,64,999 SKU that does not exist yet. Across
Mumbai the plan sells 15 of the "99 numbered memberships" and 2 of Kenkere's 39: the
scarcity framing (99 numbered, 47 in Mumbai for 1947) and the forecast (17 of 138 sold)
tell two different stories.

### 17. The 20% cap cannot be machine-checked

Effective discount is cash + perk value blended, and only the blend is stored. Two rule
checks — `O27-35 We Need to Talk` and `O27-43 Black Friday` — assert *"cash ≤20%"* with no
`cashDiscountPercent` field to support it. `O27-03 The Baker's Dozen` records 21.5% for what
is 15% cash plus a 13th month.

Store `cashDiscountPercent` and `perkValue` separately; then the cap is testable.

### 18. Data hygiene

- All 172 offers have `contributionMargin: null` — the plan cannot be judged on margin at
  all, only on revenue.
- 85 of 172 offers have an empty `audience`; the CRM cadence ("one send per offer to its own
  audience") cannot be built from an offer with no audience.
- `O27-44 Thank U, Next (Year)` has no `effectiveDiscountPercent` at any of the four
  locations.

### 19. Kemps Corner `renewalCoverage` cannot be reproduced

The month files carry `renewalCoverage` values from 0.552 to 1.092 that reconcile with no
pair of other fields in the same funnel. April reads **0.552** while the funnel requires 290
renewals from 229 expiring memberships — 127%. Four months (Apr, Oct, Nov, Dec) require more
renewals than memberships expiring, which is only possible by drawing on adjacent months,
and the plan never says so.

### 20. The 39% nobody describes

Offer revenue covers 61% of the year. The remaining ₹3.07Cr — and in the funnel's terms,
45–96% of the buyers each month needs — is assumed to arrive at full price with no
mechanic, no owner and no line in any month brief. For the pop-ups it is 75–100% every
single month. That assumption is the largest single item in the plan and the only one
nobody wrote down.

---

## Recommended improvements

### A. Settle the plan of record (before anything else)

1. Pick one Kemps Corner version. My recommendation: keep the month files as the source for
   Kemps Corner's **targets and streams** (they are better covered), promote their 8 extra
   offers into the shared bank so Bandra, Kenkere and the pop-ups can use them, and correct
   the four prior-year figures. Everything downstream is noise until this is settled.
2. Retire v4 to `archive/` and repoint `planSync2027.ts`, or the app will keep serving two
   different Januaries depending on import history.
3. Reconcile `aprilMechanics2027.ts` with the winning April.

### B. Make the offers earn the mix

4. **Rebalance toward acquisition.** New-client is 41% covered against renewals at 80%.
   Concretely: extend `O27-10 Lift Like a Girl` to Kemps Corner and Kenkere for March (it is
   currently Bandra-only and it is the month's only acquisition moment); add a newcomer
   offer to November at all four locations (currently renewal + goodwill only); give
   Kemps Corner and Kenkere a July acquisition mechanic.
5. **Fill the zero-offer and zero-slot months.** Pop-ups June first (no offers at all
   against a ₹2.25L target), then the ten other studio-months that carry a new-client target
   with no newcomer slot: Bandra Jul/Nov, Kemps Mar/Jul/Nov, Kenkere Jul/Nov, Pop-ups
   Jan/Jul/Sep.
6. **Resolve pop-up reactivation.** Either set a reactivation target for the pop-ups or
   re-file those seven offers to another stream. Do not leave ₹1.37L of offers in a ₹0
   bucket.
7. **De-risk the Cloud Nine concentration.** Either raise the forecast or drop the "99
   numbered" scarcity copy — 17 of 138 sold undercuts it. Add a named fallback for Kemps
   Corner April if a ₹1.65L new SKU underperforms in its first month.
8. **Write down the full-price assumption.** Add a "standard trade" line to each month
   brief: how much is expected at list, from which stream, and who owns it. Right now 39% of
   the year is a silent assumption.

### C. Fix the money fields

9. Carry `ticket` on every month offer alongside `price`, and assert
   `expectedRevenue === ticket × buyers` at import. This is the single change that makes the
   plan's economics auditable inside the app instead of only in this document.
10. Store `cashDiscountPercent` and `perkValue` separately from
    `effectiveDiscountPercent`, so the 20%/25% caps are testable rather than asserted in
    prose.
11. Confirm and correct the Bengaluru private price (₹4,121, not ₹3,500) and Kenkere
    `fourClass` (₹4,673, not ₹4,779), then re-run anything that values an annual perk.
12. Fix `O27-16`'s pop-up price (₹4,892, 15%) and give the four bespoke SKUs either a list
    price or an explicit "no list price" marker.
13. Split or re-book the revenue for the five offers whose windows cross a month boundary.

### D. Tighten the mechanics

14. One location-code enum shared by the bank and the studios; assert it in
    `unpack-plan.ts` and `build-kc-plan.ts`.
15. Extend `build-kc-plan.ts` to check the months against the **actuals**, not just against
    `year.json`. That is the check that would have caught finding 2.
16. Populate `audience` on all 85 empty offers — the CRM cadence depends on it.
17. Give every offer a contribution margin, or stop displaying the column.
18. Mark hand-set targets as hand-set and mechanical ones as mechanical, so a reviewer can
    see where judgement was applied.

### E. Guard it

19. Run `npm run plan:audit --strict` in CI. It has no dependencies and runs in under a
    second.
20. Add the two checks that matter most to the existing DB-side audit
    (`server/lib/planAudit.ts`), which already flags coverage, dates and policy: stream
    coverage (does each stream's offer revenue approach its target?) and the price/ticket
    mismatch (does `expected_asp × target_purchases` equal `expected_revenue`?). Both are
    currently invisible to it.

---

## Reproducing

```bash
npm run plan:audit                        # full report
node scripts/audit-2027-offers.mjs --strict   # exit 1 on criticals
```

The script reads `v5-portfolio.json` and the `kc-2027` month files only — it does not touch
the database and has no dependencies beyond Node.
