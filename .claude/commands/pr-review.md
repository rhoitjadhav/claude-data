---
name: pr-review
argument-hint: [pr-number]
---

Review PR #$ARGUMENTS:
1. `gh pr view $ARGUMENTS` -- read the PR description and context
2. `gh pr diff $ARGUMENTS` -- read every changed file
3. Check for bugs, security issues, and performance problems
4. Verify tests cover the changes
5. Leave inline comments via `gh pr review $ARGUMENTS --comment`
6. Approve or request changes with a summary
