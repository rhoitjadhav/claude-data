#!/bin/bash
# Before EVERY commit: type check → lint → test
# If anything fails, commit is BLOCKED.

npx tsc --noEmit || exit 2
npx eslint $(git diff --cached --name-only | grep -E "\.(ts|tsx)$") --quiet || exit 2
npm test -- --silent || exit 2

echo "All checks passed!"
exit 0
