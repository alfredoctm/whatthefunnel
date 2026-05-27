# WTF Design System

The design system is the **shared vocabulary** every feature's React component
draws from. Tailwind utility classes + a small set of reusable React
components live here. Features compose; they don't redefine.

## Stack (settled in Phase 1.5)

- **Framework:** Tailwind v3 (standalone CLI, no PostCSS dance).
- **Build:** `tailwindcss -i src/index.css -o dist/index.css` — runs as part of `ui/`'s `npm run build`.
- **Theme:** Tailwind defaults. Project tokens (if/when needed) extend `ui/tailwind.config.ts` `theme.extend`.
- **No separate `tokens.css` or `components.css`** — Tailwind utilities + small shared React components are the system.

## Files

```
ui/
  src/
    index.css              Tailwind directives (@tailwind base/components/utilities)
    components/            Shared base components (Button, Card, EmptyState, …)
                           — populated as features need them.
    features/<feature>/    Feature-specific components
  tailwind.config.ts       Theme extensions (currently empty — Tailwind defaults)
```

## Tailwind discipline

- **Compose, don't restyle.** A feature uses `<Button variant="primary">` (when it exists) rather than reapplying primary-button utilities inline.
- **Don't introduce new color shades inline.** Tailwind's slate / blue / red / green palettes are the system. New tokens go in `tailwind.config.ts` theme extensions, deliberately.
- **No CSS-in-JS, no custom stylesheets per component.** The point of Tailwind is "the markup is the style." Going back to component CSS files defeats it.
- **Class lists getting long?** Extract a `components/<Name>.tsx` wrapper, not a `.css` class.

## Base components (grow as needed)

Lives under `ui/src/components/`. Build only when at least two features need the same thing — premature shared components are worse than duplication. Likely candidates as Phase 2 lands:

- **Button** — primary, secondary, danger variants; `loading` prop
- **Card** — surface container with optional header / footer
- **Table** — compact + comfortable density, sortable
- **EmptyState** — heading + body + optional action
- **Chart container** — fixed aspect ratio block where chart libs draw
- **Form input** — text input, select, with label and error state

## How `ui-designer` uses this

For every feature, `ui-designer`:

1. Reads `ui/tailwind.config.ts` (theme tokens) and `ui/src/components/` (existing shared components).
2. Composes `<Feature>.tsx` from Tailwind utilities + existing shared components.
3. Promotes a pattern to `ui/src/components/` only when the prototype needs something already used by another feature. Single-use patterns stay inline.
4. Flags any missing token / component need in `ui-spec.md` under "Design questions" rather than inventing inline.

## Why no token files

Tailwind's design philosophy is that utilities ARE the design tokens — `bg-slate-50`, `text-slate-900`, `space-y-4` are the spelling of "background, color, spacing-step 4." Re-creating a CSS-variable layer on top is double-bookkeeping. Stay in the Tailwind idiom unless we hit a real reason to leave it (e.g., theming, where CSS variables would matter).

## Figma (optional, deferred)

The user can populate a Figma file from the React previews later for
stakeholder sharing. Figma is not a prerequisite, not a source of truth, and
not on the critical path. If introduced, the React component is still
authoritative — Figma frames are derived from it.

See the `feedback-design-workflow` memory for why React-component-first.
