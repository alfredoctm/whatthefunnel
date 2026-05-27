# WTF Design System

The design system is the **shared vocabulary** every feature's `prototype.html`
draws from. Tokens (colors, type scale, spacing, radii) and base components
(button, table row, card, chart container) live here. Features compose; they
don't redefine.

## Status

> **Phase 1.5 — not yet built.** This document is the contract for what Phase
> 1.5 will produce. Until then, `ui-designer` cannot run.

## Files (target locations)

```
api/src/adapters/inbound/http/
  styles/
    tokens.css           Design-system tokens — colors, type, spacing, radius
    components.css       Base components (or framework equivalent)
  static/
    htmx.min.js          HTMX interaction layer
```

These files live in the inbound HTTP adapter because, per hexagonal architecture,
styling is a presentation concern — never imported by the core.

## CSS framework choice

To be picked in Phase 1.5. Candidates:

| Framework | Build step | Density | Fit with HTMX | Notes |
|---|---|---|---|---|
| **Pico** (recommended) | None | Semantic, opinionated defaults | Excellent | Classless or class-light; styles raw HTML well |
| **Tailwind + DaisyUI** | Yes (small) | Utility-first + ready components | Excellent | Most flexibility; small build overhead |
| **Shoelace** | None | Web components | Good | Components are heavier; less idiomatic with HTMX |
| **Plain CSS** | None | Whatever you build | N/A | Maximum control, slowest to ship |

Decision goes in `thoughts/phase-1.5/findings.md` with rationale.

## Token taxonomy

`tokens.css` defines (at minimum):

```css
:root {
  /* Color */
  --color-bg, --color-surface, --color-border
  --color-text, --color-text-muted
  --color-primary, --color-primary-hover, --color-primary-text
  --color-success, --color-warning, --color-danger
  --color-chart-1 … --color-chart-6  /* qualitative palette for segments/funnels */

  /* Type */
  --font-sans, --font-mono
  --text-xs, --text-sm, --text-base, --text-lg, --text-xl, --text-2xl
  --leading-tight, --leading-normal

  /* Spacing (4-step scale) */
  --space-1, --space-2, --space-3, --space-4, --space-6, --space-8, --space-12, --space-16

  /* Radius / border / shadow */
  --radius-sm, --radius-md, --radius-lg
  --border-width
  --shadow-sm, --shadow-md
}
```

`ui-designer` may flag missing tokens in its `ui-spec.md` output ("Tokens
flagged as missing"). Treat those as design-system PRs — add to `tokens.css`
deliberately, not feature-by-feature.

## Base components

`components.css` (or the framework's equivalent) defines the visual treatment
for at least:

- **Button** — primary, secondary, danger variants; loading state
- **Table row** — compact and comfortable density
- **Card** — surface container with optional header / footer
- **Chart container** — fixed aspect ratio block where chart libs draw
- **Empty state** — icon-or-illustration + heading + body + optional action
- **Form input** — text input, select, with label and error state

Prototypes compose these — they don't restyle them.

## How `ui-designer` uses this

For every feature, `ui-designer`:

1. Reads `tokens.css` and `components.css` (or this doc if those don't exist yet).
2. Composes the prototype from base components and tokens.
3. Flags any missing token / component in `ui-spec.md` rather than inventing inline.

## Figma (optional, deferred)

The user can populate a Figma file from the prototypes later for stakeholder
sharing. Figma is not a prerequisite, not a source of truth, and not on the
critical path. If introduced, prototypes remain authoritative — Figma frames
are derived.

See the `feedback-design-workflow` memory for why prototype-first.
