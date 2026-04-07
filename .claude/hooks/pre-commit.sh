#!/bin/bash
# Runs before Bash tool calls. Only enforces checks on git commit.
# If anything fails, the commit is BLOCKED.

# Only run checks for git commit commands
if [[ "$CLAUDE_TOOL_INPUT" != *"git commit"* ]]; then
  exit 0
fi

STAGED_PY=$(git diff --cached --name-only | grep -E "\.py$")

if command -v mypy &>/dev/null; then
  mypy . --ignore-missing-imports --quiet || exit 2
fi

if [ -n "$STAGED_PY" ] && command -v ruff &>/dev/null; then
  ruff check $STAGED_PY || exit 2
fi

if command -v pytest &>/dev/null; then
  pytest --quiet || exit 2
fi

echo "All checks passed!"
exit 0
