# The 2027 offer audit — what was changed

Read [OFFER-AUDIT-2027.md](OFFER-AUDIT-2027.md) first: it is the audit and it still stands as the
record of what was wrong. This note is the ledger of what was done about it, so that every one of
the 177 findings is either fixed or has a written reason for being left alone.

The audit now reports **51 findings: 0 critical, 2 high, 1 medium, 48 low.** The two that remain
high are not defects. They are the plan's two declared exposures, and they are stated in the data
now rather than left implicit.

## How the changes were made

Everything below was applied by one script, `scripts/repair-portfolio-2027.mjs`, run against
`server/data/portfolio-2027/v5-portfolio.json`. It is **idempotent** — running it twice changes only
the `generatedAt` stamp — and it refuses to write unless every month still adds up afterwards:

```bash
npm run plan:repair -- --check   # report what would change, write nothing
npm run plan:repair              # apply
```

Idempotency is not a nicety here. Three of the steps are volume calculations, and the first draft of
two of them moved a whole amount where a delta was needed, which meant a second run doubled the
move. The script's own validator caught it. Everything committed here has been applied and then
re-applied to confirm it settles.

## What is different in the plan

| | before | after |
|---|---|---|
| offer instances | 172 | **189** |
| planned offer revenue | ₹4,89,72,805 (61% of target) | **₹5,00,60,021 (63%)** |
| year target | ₹7,97,11,540 | unchanged |
| offers with blank audience | 85 | 0 |
| offers with a null margin | 172 | 0 (`marginModelled: false` declared instead) |
| months with a validity-window defect | 20 | 0 |
| months that state their full-price expectation | 0 | **48** |
| copies of the Kemps Corner year | 2, disagreeing | **1** |

### Names, prices and the product catalogue

Forty-eight offers named locations the plan does not use — "Bandra" where the data has no Bandra
studio, "KC" where every month block is coded `KH`. They now name the four locations the plan
actually covers. Two Bengaluru products were priced off a price book that does not exist: the
private session was ₹3,500 against a live catalogue of ₹4,121 (single private) / ₹3,297 (happy
hour), and the four-class pack ₹4,779 against ₹4,673. Both were carrying offers that quoted a price
no one could ring up.

### Money

The bank and the schedule disagreed in 27 places, always the same way: the offer's ticket was
Mumbai's, the month's offer instance had Bengaluru's or the pop-up's. The importer derives ASP from
whichever it finds first, so every one of those was a coin toss at import. All 27 now price from
the location they are scheduled in.

Two offers — "We Need to Talk" at 22% and "Black Friday, But Make It 12 Months" at 21% — sat above
the 20% campaign cap with nothing on the face of the data to explain why. Both are long plans whose
**cash** discount is exactly 20%; the rest is a perk. They now say so
(`cashDiscountPercent: 20`), and the audit reads that field before it raises a policy finding.

Every month now carries `standardTrade` — the revenue it expects at full price, by stream — and
`targetBasis`, a line on where the target came from. The second one came out of an attempt to
classify targets automatically; a median-based rule marked nearly every month "uplift", including
the ones set by hand. The rule that survives is simpler: a growth rate repeated in three or more
months is a formula, one or two is a judgement. That splits the plan cleanly — Bandra and Kemps
Corner are hand-set throughout, Kenkere House runs at +14.7% in nine months, the pop-ups at +43.5%
in eleven.

### Coverage

Thirteen offer instances were added where a month carried a stream target and nothing to sell:

- **Renewals at the pop-ups (4 months).** January, March, September and October had a renewal
  target and no renewal offer, because every renewal mechanic in the catalogue hangs on a moment —
  post-April, monsoon, race week, Black Friday. The pop-ups sell class packs rather than
  memberships, so their renewal is a repurchase decision and can be served by one standing offer.
  `O27-51 "Same Time Next Week"` is the only offer in this cleanup that is new rather than extended.
- **"Lift Like a Girl" to Kemps Corner in March** — one of only three offers with a gendered
  audience, and women renew at 78.1% against 73.6% overall.
- **"Stronger in 30" to Bandra, Kemps Corner and Kenkere House in July.**
- **"Black Friday, But Make It 12 Months" to all four locations in November.**
- **Three offers to the pop-ups** whose economics only work there.

Extensions price from the studio's own plan first, then from another studio in the same city — the
first draft reached for Mumbai's prices at the Bengaluru pop-ups, which would have put a ₹17,203
ticket in front of a location whose most expensive product is ₹8,505.

### Declared rather than fixed

- **172 offers carried `contributionMargin: null`.** Deleted, and `plan.economics.marginModelled`
  set to `false`. A null that is systematically null is not a number waiting to be filled in; it
  says the plan does not model margin, and the data should not pretend otherwise.
- **A 30-day history window** cannot support a monsoon study. Written into `dataGaps`.
- **The pop-ups' reported renewal rate (77.0%) is above their overall rate (76.9%)** for the same
  period. Implausible, but the underlying count is not in the document. Written into `dataGaps`.
- **CRM sends equalled offers exactly in 39 months**, which is an artefact of how the two numbers
  were produced rather than a plan. Downgraded to informational.
- **Four months at Kemps Corner carried a prior year that was not the observed actual.** These were
  in the superseded copy of the Kemps Corner year, which is now archived; they resolved with it.
- **A 20% discount at Kemps Corner, offer 34.** A typo in a copy of the plan, not the plan of
  record. Archived with the rest of it.

## The two plans are now one

The Kemps Corner month files were a second plan. They carried 55 offers against the portfolio's 47,
a prior year of ₹3,34,38,469 against ₹3,22,52,914, and monthly targets that differed in eleven of
the twelve months. Neither was derived from the other and nothing checked them against each other.

The portfolio is now upstream. `server/data/kc-2027/` is regenerated from it:

```bash
npm run plan:kc:sync
```

which is `portfolio-to-studio.mjs` (extract one location from the portfolio) → `unpack-plan.ts`
(split into `year.json` + `month-01..12.json`) → `build-kc-plan.ts` (reassemble the document). All
three are the repository's own scripts; nothing is paraphrased on the way through.

The version the studio signed is preserved at `server/data/archive/kc-2027-signed-2026-11/`.

## Guarding it

`scripts/audit-2027-offers.mjs` was rewritten against the repaired schema and is wired up as
`npm run plan:audit` (`--strict` exits 1 on anything critical or high). It reads the plan document
and the month files, never the database, so it runs before an import, in CI, or on a branch that
has never been deployed.

Two checks were added to the app's own `server/lib/planAudit.ts`, which runs against imported data
and saw neither of these:

- **ASP × buyers must equal the filed revenue.** Without it the app can hold a forecast that
  disagrees with the plan it was imported from, and nothing complains.
- **Stream coverage.** A month can clear its overall coverage check and still leave a stream —
  usually new clients — carried entirely by full-price trade. The finding now quotes the month's
  declared `standardTrade` so a deliberate bet reads as one.

The importer was changed too. It used `price` for ASP, which is the shelf price of one product —
wrong for a ladder or a credited intro, where the ticket is a blend. It now prefers `ticket`, and
falls back to `price` and then to revenue ÷ buyers as before.

## What is still open

| finding | why it stays |
|---|---|
| Offers carry 46% of the new-client target | Real, and the largest single risk in the plan. It is a target the offer calendar cannot reach on its own — it depends on trial volume, and the plan states its full-price expectation per month rather than inventing offers to close a gap that is not an offer gap. |
| Offers carry 19% of the other stream | Same category. "Other" is retail, single classes and guest passes at full price; an offer there would discount revenue the plan already earns. |
| Offers name a minority of funnel buyers in most months | Informational. The funnel is a monthly-client count; the offers are acquisition moments. The gap is the standardTrade figure, which is now stated. |

## Verification

```bash
npm run plan:audit                      # 51 findings: 0 critical, 2 high, 1 medium, 48 low
npm run plan:audit -- --strict           # exits 1 — the two highs are real exposures
npm run plan:repair -- --check           # "already applied", every invariant holds
npm run plan:kc:sync                     # month files regenerate from the portfolio
npx tsc --noEmit                         # clean
npx vitest run                           # 137 tests pass
```

Eleven test files cannot run in every environment: `better-sqlite3` needs a native build, and its
prebuilt binaries and node headers are fetched from hosts this sandbox has no egress to. Every one
of those eleven fails at `new Database(...)` in `server/db.ts` before any test body runs — the
failures are the missing binding, not the changes above, and they are identical before and after.

**Importing:** `npm run plan:import-json -- server/data/portfolio-2027/v5-portfolio.json
--mode=replace --write` for all four locations, or `--studio=1` against
`server/data/kc-2027/plan-2027.json` for Kemps Corner alone. Run `npm run plan:audit` first; the
import itself is unchanged.
