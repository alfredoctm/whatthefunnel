#!/usr/bin/env bash
# PreToolUse hook: enforce outside-in TDD on api/src/** AND ui/src/**.
#
# Allows the Write/Edit if any of these is true:
#   - The target path is not under api/src/ or ui/src/.
#   - The corresponding src/ dir doesn't exist yet, or has no files (bootstrap).
#   - .claude/tdd-state contains RED (a failing test is currently driving).
#   - .claude/tdd-state contains UNLOCK (explicit override — also audited).
#
# Otherwise: exit 2 to deny, with a message on stderr that surfaces to Claude.
# Every block is appended to the audit log so we can review what tripped it.
#
# Note: TDD state is *global*, not per-workspace. RED unlocks both api/src/**
# and ui/src/**. Acceptable for solo work; revisit if a feature crosses both
# workspaces and the discipline starts feeling fuzzy.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AUDIT="$REPO_ROOT/scripts/audit"

INPUT="$(cat)"
FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')"
TOOL="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')"

# Determine which workspace owns this file. Allow if neither.
WORKSPACE=""
case "$FILE" in
  "") exit 0 ;;
  */api/src/*) WORKSPACE="api" ;;
  */ui/src/*)  WORKSPACE="ui"  ;;
  *) exit 0 ;;
esac

SRC_DIR="$REPO_ROOT/$WORKSPACE/src"

# Bootstrap: if that workspace's src/ doesn't exist or has no files yet, allow.
if [ ! -d "$SRC_DIR" ] || [ -z "$(find "$SRC_DIR" -type f 2>/dev/null | head -n 1)" ]; then
  exit 0
fi

STATE="$(cat "$REPO_ROOT/.claude/tdd-state" 2>/dev/null || true)"
case "$STATE" in
  RED|UNLOCK)
    exit 0
    ;;
esac

# Deny path. Log to audit and write a clear message to Claude.
"$AUDIT" hook_block "$(jq -nc \
  --arg hook "tdd-guard" \
  --arg tool "$TOOL" \
  --arg file "$FILE" \
  --arg workspace "$WORKSPACE" \
  --arg state "${STATE:-none}" \
  '{hook: $hook, tool: $tool, file: $file, workspace: $workspace, state: $state}')" || true

if [ "$WORKSPACE" = "ui" ]; then
  TEST_HINT="ui/test/<Component>.test.tsx (Jest + RTL) OR e2e/test/<feature>.spec.ts (Playwright)"
else
  TEST_HINT="api/test/acceptance/<scenario>.test.ts (fastify.inject) OR a domain unit test"
fi

cat >&2 <<EOF
TDD guard blocked $TOOL on $FILE.

Reason: $WORKSPACE/src/** is locked unless TDD state is RED.
Current state: ${STATE:-none}

Outside-in TDD discipline (see CLAUDE.md → Architecture → Outside-in TDD):
  1. Write a failing test under $TEST_HINT
  2. Run it, confirm it fails for the right reason.
  3. Enter RED:    scripts/tdd red <path/to/test>
  4. Implement the smallest code to make it pass.
  5. Enter GREEN:  scripts/tdd green   (this re-locks api/src/** AND ui/src/**)

Explicit override (audited):  scripts/tdd unlock "<reason>"
EOF
exit 2
