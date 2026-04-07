---
paths:
  - "app/api/**"
  - "pages/api/**"
---

# API Rules
- Validate all inputs with Zod at the route level
- Return consistent error shapes: { error: string, code: string }
- Always check authentication before processing requests
- Never log sensitive data (tokens, passwords, PII)
- Use HTTP status codes correctly -- 400 for client errors, 500 for server errors
