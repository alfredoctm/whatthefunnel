#!/usr/bin/env bash
# PostToolUse hook: run Prettier on api/** files after Write/Edit.
#
# Reads the tool-call JSON from stdin, extracts the file path, runs
# prettier --write on it if it's an api/** file with a Prettier-supported
# extension. Exits 0 on success or no-op; never blocks the parent tool call.

set -euo pipefail

INPUT="$(cat)"
FILE="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')"

[ -z "$FILE" ] && exit 0

# Only act on api/** paths
case "$FILE" in
  */api/*) ;;
  *) exit 0 ;;
esac

# Skip generated / vendored dirs
case "$FILE" in
  */node_modules/*|*/dist/*|*/coverage/*) exit 0 ;;
esac

# Only Prettier-handled extensions
case "$FILE" in
  *.ts|*.js|*.json|*.md|*.yml|*.yaml) ;;
  *) exit 0 ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
# --no-install: never trigger an unprompted install. If prettier isn't there,
# silently skip rather than block the parent tool.
(cd "$REPO_ROOT/api" && npx --no-install prettier --write "$FILE" >/dev/null 2>&1) || true

exit 0
