# Wisdom Studio — Design System

Register: **product** (design serves the task). Audience: adults 50+, accessibility-first.
All tokens live in `frontend/src/index.css` under `:root`. Use tokens, never hard-coded values.

## Typography

| Role | Token / value |
| --- | --- |
| UI (everything) | `--font-ui` — Atkinson Hyperlegible 400/700 (Braille Institute typeface designed for low-vision readers; via `@fontsource/atkinson-hyperlegible`) |
| Display (wordmark, Home headings only) | `--font-display` — Fraunces Variable (via `@fontsource-variable/fraunces`) |
| Scale | `--text-sm` 14px (labels/meta only) · `--text-base` 16px floor · `--text-md` 18 · `--text-lg` 20.8 · `--text-xl` 25.6 · `--text-2xl` 33.6 |

Rules: nothing under 14px anywhere; body/prose 16px+; one UI family, hierarchy through weight (400/700), not extra fonts. `text-wrap: balance` on h1–h3.

## Color

Warm cream surfaces, deep navy structure, one crimson accent for primary actions. All pairings WCAG AA-verified.

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#fdf8f0` | App background |
| `--color-surface` | `#ffffff` | Cards, panels, inputs |
| `--color-panel` | `#f8f2e7` | Second neutral: toolbars, sidebars, empty states |
| `--color-canvas-mat` | `#efe6d6` | The "desk" behind the design page |
| `--color-ink` | `#2b2620` | Body text (13.9:1 on bg) |
| `--color-ink-muted` | `#5d564b` | Secondary text (6.3:1 on bg) |
| `--color-primary` (+ `-hover`, `-active`, `-tint`) | `#b23a48` | Primary actions, selection. 5.6:1 with white text |
| `--color-accent` (+ `-hover`, `-tint`) | `#1d3557` | Topbar, headings, focus ring |
| `--color-success` / `--color-danger` (+ tints) | `#1f7a6d` / `#b3261e` | Status only |
| `--color-warm` | `#f4a259` | Decorative brand warmth only — never text |

Rules: accent colors mark actions/selection/state, never decoration. Muted gray never sits on colored backgrounds. Status colors always pair with their tint backgrounds.

## Space, shape, depth

- Spacing: 4px scale — `--space-1..8` (4, 8, 12, 16, 24, 32, 48, 64). No off-scale gaps.
- Radii: `--radius-sm` 6 (inputs) · `--radius-md` 10 (buttons, rows) · `--radius-lg` 16 (cards).
- Shadows: `--shadow-sm/md/lg` — warm-tinted, used for lift (cards, canvas page), not decoration.
- Z-index: semantic only — `--z-sticky` 10, `--z-overlay` 40, `--z-modal` 50, `--z-toast` 60.

## Motion

- `--duration-fast` 150ms / `--duration-base` 200ms, `--ease-out` (cubic-bezier(0.22, 1, 0.36, 1)).
- Motion conveys state (hover, press, selection) — never decoration. No load choreography.
- `prefers-reduced-motion: reduce` collapses all transitions/animations globally.

## Components

**Buttons** — one vocabulary, three variants: default (bordered surface), `.primary` (crimson, white text — one per view), `.quiet` (transparent; toolbars and icon rows). All have default/hover/active/disabled states; 44×44px minimum always.

**Inputs** — 1.5px border, `--radius-sm`, hover darkens border, focus shows the global ring. Labels are 14px/700/muted, above the field.

**Focus** — `--focus-ring` (3px navy, 2px offset) via `:focus-visible` on every interactive element. Never removed.

**Panels** — right sidebar is `--color-surface`; tool/page bars are `--color-panel`. Panel headings: 16px, uppercase, +0.04em tracking, navy.

**Empty states** teach (dashed `--color-panel` box with guidance), **errors** pair `--color-danger` text with `--color-danger-tint` background and a recovery action, **progress** states (AI generation) use `--color-accent-tint` and stay visible until resolved.

## Accessibility floor (non-negotiable)

44×44px targets · AA contrast on every pairing · visible focus everywhere · plain-language labels ("Bring to front") · no time-limited UI · keyboard operability for every feature · reduced-motion respected.
