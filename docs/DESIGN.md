# Atelier — the workspace design language

The interface is styled by a single, deliberate layer: `src/styles/atelier.css`.
It loads last (see `src/styles/index.css`) so it settles colour, type, rhythm and
surface for every screen, including the long-lived plan workspaces that predate it.

## Principles

1. **Warm, quiet luxury.** Ivory canvas (`--canvas`), ink text (`--ink`), hairline
   rules (`--line`). White cards float on warm paper rather than cool grey.
2. **Editorial hierarchy.** `--font-display` (Bodoni Moda) carries page titles,
   hero headlines and hero numbers. `--font-sans` (Inter) carries interface copy.
   Micro labels are 9.5–10px, uppercase, `0.12em` tracked.
3. **One accent for craft, colour for meaning.** Gold (`--gold`, `--champagne`) is
   reserved for emphasis and detail. Data uses jewel tones: emerald (positive),
   terracotta (negative), bronze (caution), petrol (information), plum (AI).
4. **Type is self-hosted and variable.** Bodoni Moda, Inter and Montserrat ship as
   variable woff2 subsets in `public/fonts/`, declared in `src/styles/fonts.css`.
   Nothing is fetched from a font CDN, so the interface sets the same in every
   environment. Figures are always tabular; headings balance their last line.
5. **The location tints the interface.** Each location owns a deep accent that
   arrives as `--a1` on the shell and flows through navigation, charts and CTAs.
6. **Generous rhythm.** A 4px scale, 20–32px between ideas, 22–24px card padding.

## Tokens

| Group | Tokens |
| --- | --- |
| Type | `--font-sans`, `--font-display`, `--text-2xs` … `--text-4xl`, `--tracking-*` |
| Ink | `--ink`, `--ink-soft`, `--muted`, `--subtle`, `--ink-950` … `--ink-700` |
| Surface | `--canvas`, `--canvas-deep`, `--paper`, `--paper-warm`, `--line`, `--line-strong` |
| Accent | `--gold`, `--gold-deep`, `--gold-soft`, `--champagne`, `--champagne-soft` |
| Semantic | `--green`, `--amber`, `--red`, `--blue`, `--purple` (+ `-soft`) |
| Geometry | `--radius-xs` … `--radius-xl`, `--shadow-xs` … `--shadow-lg`, `--ring` |

`--a1` (and its derived `--a1-soft`, `--a1-line`, `--a1-dark`, `--a1-glow`) is the
interactive accent; `--n-50` … `--n-700` remain the neutral ramp used by the plan
workspaces.

## Location accents

| Location | Accent |
| --- | --- |
| Kemps Corner | `#1f6a57` emerald |
| Bandra | `#2b5c85` sapphire |
| Kenkere House | `#7a3b56` plum |
| Pop-up | `#a2712f` bronze |
| All locations | `#3c3830` ink |

Defined once in `src/data/locations.ts`.

## Working on the UI

* Prefer tokens over literal colours; new components should not introduce hexes.
* Sections use `.page-header` (title + gold rule), `.ws-toolbar` (in-page section),
  `.card` / `.ws-card` (surfaces), `.metric` / `.ws-kpi` (figures) and the shared
  primitives in `src/components/ui.tsx`.
* Any new stylesheet should be imported before `atelier.css`, and only where a
  component genuinely needs its own layout.

## Where things live now

| Surface | Component | Notes |
| --- | --- | --- |
| Location switcher | `components/LocationSwitcher.tsx` | A popover off the header bar with five views — vertical timeline (default), cards, list, pills and a single selector. The choice is remembered; each row carries that location's annual target. |
| Offer card | `pages/plan/MonthWorkspace.tsx` (`.oc.is-v3`, `.ocv-*`), `styles/offer-card.css` | Photo-led masthead with the title, category and scope; a high-contrast forecast with quieter supporting metrics; a compact pricing rail; the always-visible commercial record; explicit audience/timing/notes disclosure and an approval/media footer. Named `offer-card` container queries adapt to the actual card width, including the docked library. A lone offer fills its category's row; mobile avoids nested gutters and opens the library only on request. Hover is subtle, focus is visible, touch targets are enlarged, and reduced motion is respected. |
| Target breakdown | `pages/plan/TargetBreakdown.tsx` | The complete 12-month table. It renders in the month plan's **Targets & mix** page (scoped with the `studio` prop) as well as on its own route. |
| WhatsApp proofs | `components/MarketingCollaterals.tsx` (`.wa-pair.is-duo`) | Both sends — launch broadcast and the 48-hour reminder — sit side by side on one proof board. |
| Month plan | `pages/plan/MonthWorkspace.tsx` | Opened per month from Offers › Planned promotions, so the target, the mix and the offers live in one place. Arrow keys and `1`–`5` move between months and pages. |
| Month overview | `pages/plan/MonthOverview.tsx` (`.mo2*`, `atelier.css` §22) | The month's opening page: photograph, the four figures that decide it, the split / funnel / renewal gap as drawn cards, then the prose. |
| Year calendar | `pages/plan/YearCalendar.tsx` (`.yc*`, `yearcal.css`) | A season curve over a filmstrip of twelve month covers; each tile opens its month. |
| Studio intelligence | `components/StudioAi.tsx` (`.ai*`, `atelier.css` §23) + `server/lib/studioAi.ts` | Five deterministic tools over one month: audit, copy, names, actions, goals. Nothing is written back until the reader copies it in. |
| Loaders | `components/ui.tsx` (`Loading`, `Heartbeat`, `LoadingRows`), `atelier.css` §21 | A single heartbeat: a quiet ECG trace with one gold pulse travelling its length. That is the whole loading state — no label, no dots, no mark stacked beside it; the label survives only as the accessible name. Skeleton rows remain for lists still arriving. |
| Keyboard | `components/Layout.tsx` (`ShortcutsSheet`), `atelier.css` §24 | `⌘K` palette, `?` for the key map, `Esc` to close. Shortcuts never fire while a field has focus. |
| Offer studio density | `pages/plan/OffersTab.tsx` (`.os-density`, `atelier.css` §25) | Comfortable or compact rows, remembered per browser. |

## Offer categories

Offer cards, the docked library, planned promotions, the bank rail and the paginated offer bank all use **New → Winback → Renewal → Other**, defined in `src/lib/offerCategory.ts`. A month's assigned primary slot takes precedence over the offer's saved slot; unslotted offers fall back to their objective. Newcomer/acquisition/trial/referral offers are New, lapsed/reactivation offers are Winback, and renewal/retention offers are Renewal. Generic upsells, AOV campaigns, other non-lifecycle slots and unclassified offers stay in Other rather than being assumed to be renewals.

The library filters are exclusive and include Other. Membership remains visible on each library entry, and search, sorting, selection, add/swap actions and forecast values are preserved. Groups have a fixed order while the chosen sort is retained within each group. Counts in the paginated bank describe the current page. This is presentation grouping only: stored offers, monthly allocations and financial calculations are not rewritten.

## Month offer details, projections and the launch brief

Offer cards lead with a highlighted **The offer** block: the exact written price/terms and all included benefits, drawn first from the plan's `You pay` / `You get` fields, then the offer's benefit/mechanics. These are not replaced by the campaign headline or the model's average ticket. Conditions and inclusions are not truncated; the supporting commercial record and existing editing/disclosure controls remain available.

Overview and Offers name the **combined projected revenue** explicitly. The Offers total includes the lifecycle subtotals, month target and target coverage. It sums the selected offers' valid, unrounded forecasts, excluding unselected library offers and invalid/demo projections. A duplicate slot/extra reference counts once, and missing forecasts are disclosed rather than presented as confirmed zero revenue. This is a projection, not actual sales.

`MonthBrief.tsx` and `lib/monthBrief.ts` render both portfolio-style and round-tripped export briefs. The inset sheet contains the focus and studio role, live projection (separate from any filed estimate), the complete collateral list, channel/deadline tags, expandable copy and the full CRM schedule with dates, audiences, offer names and delivery notes. Counts match the detailed lists; differing imported send totals are flagged. Formatted React text is rendered as children, never interpolated into strings. The panels stack on narrow containers and keep their own gutters inside the month-page reset.

## Bulk target actions (Approvals & calculations)

The all-studio target matrix carries a leading selection column. Tick any set of studio-months — across locations and months — and a dark bar rises from the bottom of the screen with three actions: **Approve**, **Withdraw approval**, and **Edit values**. Editing opens one dialog that applies a single rule to the whole selection (`% change`, `+/- amount`, or `set exactly`) on either the proposed or the approved figure; `% change` is the default because it keeps each month's seasonality. Every changed month is versioned and audited separately, and the whole batch recalculates once.

Backed by `POST /api/targets/bulk` (`server/routes/targets.ts`); styling in `src/styles/bulk-targets.css`.

## Year calendar board (`src/pages/plan/YearCalendar.tsx`)

The calendar layout is a wall calendar rather than a chart: twelve month blocks, each with a real Monday-first day grid where festival and observance days carry a dot and a tint, and every offer in the month listed in full with its expected revenue. Location colour runs through the month rule, the offer dots and the scope chips. `src/styles/year-board.css`.

Above it sits the **add-to-calendar card**: a QR code that opens a one-page subscription sheet with a Google Calendar button and an `.ics` download. The feed (`server/routes/calendar.ts`) publishes every offer window, campaign and studio moment as all-day events, signed by a token so a phone can open it without a session; it contains campaign dates only, never member or revenue data.

## Location accents (`src/data/locations.ts`)

Four distinct accents, each dark enough to carry white text: Kemps Corner teal `#0d6b58`, Bandra indigo `#28489b`, Kenkere House raspberry `#9b2c58`, Pop-up ochre `#8d5a12`. Each has a soft partner (`LOCATION_SOFT`) for fills behind dark text. Gold stays reserved for the plan's own signal, so location colour never competes with it.
