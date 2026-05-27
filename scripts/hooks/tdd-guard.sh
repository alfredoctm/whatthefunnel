#!/usr/bin/env bash
# PreToolUse hook: enforce outside-in TDD on api/src/**.
#
# Allows the Write/Edit if any of these is true:
#   - The target path is not under api/src/.
#   - api/src/ does not exist yet, or is empty (bootstrap).
#   - .claude/tdd-state contains RED (a failing test is currently driving).
#   - .claude/tdd-state contains UNLOCK (explicit override — also audited).
#
# Otherwise: exit 2 to deny, with a message on stderr that surfaces to Claude.
#
# Every block is appended to the audit log so we can review what tripped it.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AUDIT="$REPO_ROOT/scripts/audit"

INPUT="$(cat)"
FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')"
TOOL="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')"

# Not a path we care about → allow.
case "$FILE" in
  "") exit 0 ;;
  */api/src/*) ;;
  *) exit 0 ;;
esac

# Bootstrap: if api/src/ doesn't exist or has no files yet, allow scaffolding.
if [ ! -d "$REPO_ROOT/api/src" ] || [ -z "$(find "$REPO_ROOT/api/src" -type f 2>/dev/null | head -n 1)" ]; then
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
  --arg state "${STATE:-none}" \
  '{hook: $hook, tool: $tool, file: $file, state: $state}')" || true

cat >&2 <<EOF
TDD guard blocked $TOOL on $FILE.

Reason: api/src/** is locked unless TDD state is RED.
Current state: ${STATE:-none}

Outside-in TDD discipline (see CLAUDE.md → Architecture → Outside-in TDD):
  1. Write a failing acceptance/unit test under api/test/ first.
  2. Run it, confirm it fails for the right reason.
  3. Enter RED:    scripts/tdd red <path/to/test.js>
  4. Implement the smallest code to make it pass.
  5. Enter GREEN:  scripts/tdd green   (this re-locks api/src/**)

Explicit override (audited):  scripts/tdd unlock "<reason>"
EOF
exit 2
