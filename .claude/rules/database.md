---
paths:
  - "lib/db/**"
  - "prisma/**"
  - "supabase/**"
---

# Database Rules
- Never write raw SQL -- use the ORM or query builder
- Always use transactions for multi-step writes
- Add indexes for any column used in WHERE or JOIN
- Never expose database errors directly to the client
- Run migrations in a separate step, never auto-migrate in production
