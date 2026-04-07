---
name: deploy
argument-hint: [environment]
---

Deploy to $ARGUMENTS:
1. `pytest` -- all tests green
2. `ruff check .` -- no lint errors
3. `mypy .` -- no type errors
4. `alembic upgrade head` -- migrations applied (on staging first)
5. Push to the target branch / trigger deployment pipeline
6. Verify deployment -- check health endpoint (`/health`) and recent logs
7. Report deployment status
