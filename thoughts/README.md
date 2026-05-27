# thoughts/

External memory for the RPI (Research → Plan → Implement → Validate → Iterate)
workflow. Persists between Claude sessions and across context clears.

## Why this exists

Claude's context window forgets. Each new session starts blank. Without an
external store of "what we learned" and "what's done," every session re-derives
context — slow, expensive, and error-prone.

`thoughts/` is committed to git so the state travels with the repo.

## Layout

```
thoughts/
  README.md          (this file)
  phase-0/
    findings.md      What we learned during research/setup
    progress.md      What got done, in chronological order
  phase-1/
    findings.md
    progress.md
  ...
```

Per-phase subdirs match `docs/plan.md` phases. Add new phase dirs as we get there.

## How to use during a session

1. **At session start:** read the current phase's `findings.md` and `progress.md` to re-anchor context.
2. **As you learn things:** append to `findings.md`. Capture decisions, dead-ends, surprising behaviors, library quirks.
3. **As you complete steps:** append a dated entry to `progress.md`. One line per step.
4. **Before `/clear`:** make sure both files reflect the session's work — they're your handoff to the next session.

## Style

- Date entries: `## 2026-05-27` headings or `- 2026-05-27:` prefixes.
- Be terse. This is for re-anchoring, not narration.
- If a finding becomes a permanent rule, promote it to `CLAUDE.md` and remove from `findings.md`.
