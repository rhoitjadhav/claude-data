#!/bin/bash
# After EVERY file edit: auto-format the saved file

FILE="$1"

if [[ "$FILE" =~ \.(ts|tsx)$ ]]; then
  npx eslint "$FILE" --fix --quiet
  npx prettier "$FILE" --write --log-level silent
fi

exit 0
