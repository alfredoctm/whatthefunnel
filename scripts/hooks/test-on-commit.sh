#!/usr/bin/env bash
# PreToolUse hook on Bash: if the command is `git commit` and api/** files
# are staged, run `npm run test:fast`. Block the commit on failure.
#
# Skips silently for non-commit commands and for commits that don't touch
# api/** (docs-only, config-only, .claude/-only commits stay fast).
#
# Backstop for scripts/tdd green — most slices already verified through
# the gate, but a commit made without the gate still gets caught here.

set -euo pipefail

INPUT="$(cat)"
COMMAND="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"

[ -z "$COMMAND" ] && exit 0

# Match `git commit` invocations robustly: bounded by start / whitespace /
# pipe / semicolon / EOL on both sides. Won't match `git commit-tree`,
# `echo "git commit"`, etc.
if ! echo "$COMMAND" | grep -qE '(^|[[:space:]&|;()])git[[:space:]]+commit([[:space:]&|;()]|$)'; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
AUDIT="$REPO_ROOT/scripts/audit"

# Are any api/** files staged?
STAGED="$(cd "$REPO_ROOT" && git diff --cached --name-only)"
if ! printf '%s\n' "$STAGED" | grep -qE '^api/'; then
  exit 0
fi

echo "test-on-commit: api/** changes staged — running npm run test:fast..." >&2
if ! (cd "$REPO_ROOT/api" && npm run --silent test:fast); then
  echo "" >&2
  echo "test-on-commit: BLOCKED — test:fast failed. Commit refused." >&2
  echo "Fix tests, or:  scripts/tdd unlock \"<reason>\"  is the wrong tool — use a separate non-api commit, or fix and re-commit." >&2
  "$AUDIT" hook_block '{"hook":"test-on-commit","reason":"test:fast failed"}' || true
  exit 2
fi

"$AUDIT" hook_pass '{"hook":"test-on-commit","staged_api_files":"yes"}' || true
exit 0
