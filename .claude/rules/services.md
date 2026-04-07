---
paths:
  - "app/services/**"
  - "app/core/**"
---

# Service Layer Rules
- Keep business logic in service classes/functions, never inside route handlers
- Services must not import from routers -- dependency flows inward only
- Functions should do one thing; keep them under 50 lines
- Raise domain-specific exceptions (e.g. `NotFoundException`) and let middleware map them to HTTP responses
- Never call external APIs directly inside a route -- wrap in a service with proper error handling
