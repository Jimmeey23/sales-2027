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
4. **The location tints the interface.** Each location owns a deep accent that
   arrives as `--a1` on the shell and flows through navigation, charts and CTAs.
5. **Generous rhythm.** A 4px scale, 20–32px between ideas, 22–24px card padding.

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
