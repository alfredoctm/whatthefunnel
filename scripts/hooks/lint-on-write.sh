#!/usr/bin/env bash
# PostToolUse hook: run ESLint --fix on api/**/*.ts files after Write/Edit.
#
# Reads the tool-call JSON from stdin, extracts the file path, runs
# eslint --fix on it if it's a .ts file under api/. Auto-fixable issues
# get fixed in place; remaining issues still surface at the TDD-green gate.
# Exits 0 on success or no-op; never blocks the parent tool call.

set -euo pipefail

INPUT="$(cat)"
FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')"

[ -z "$FILE" ] && exit 0

case "$FILE" in
  */api/*) ;;
  *) exit 0 ;;
esac

case "$FILE" in
  */node_modules/*|*/dist/*|*/coverage/*) exit 0 ;;
esac

case "$FILE" in
  *.ts) ;;
  *) exit 0 ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
(cd "$REPO_ROOT/api" && npx --no-install eslint --fix "$FILE" >/dev/null 2>&1) || true

exit 0
