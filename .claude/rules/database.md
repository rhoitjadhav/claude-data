---
paths:
  - "app/db/**"
  - "alembic/**"
  - "app/models/**"
---

# Database Rules
- Use SQLAlchemy 2.0 ORM with async sessions -- never write raw SQL
- Always use transactions for multi-step writes; roll back on any error
- Add indexes for every column used in WHERE, JOIN, or ORDER BY clauses
- Never expose database errors or tracebacks directly to the client
- Run migrations with Alembic -- never auto-migrate in production
- Use `select()` style queries (not legacy `session.query()`)
