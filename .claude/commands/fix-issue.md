---
name: fix-issue
argument-hint: [issue-number]
---

Fix GitHub issue #$ARGUMENTS:
1. `gh issue view $ARGUMENTS` -- read the issue
2. Find relevant source files
3. Implement the minimal fix
4. Write a regression test with pytest
5. `pytest` -- all green
6. Commit: "fix: description (closes #$ARGUMENTS)"
