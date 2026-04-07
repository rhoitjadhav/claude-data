#!/bin/bash
# After EVERY file edit: auto-format and lint the saved file

FILE="$CLAUDE_TOOL_INPUT_FILE_PATH"
if [ -z "$FILE" ]; then
  FILE="$1"
fi

if [[ "$FILE" =~ \.py$ ]]; then
  command -v ruff &>/dev/null && ruff check "$FILE" --fix --quiet
  command -v ruff &>/dev/null && ruff format "$FILE" --quiet
fi

exit 0
