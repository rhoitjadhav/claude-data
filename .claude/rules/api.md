---
paths:
  - "app/routers/**"
  - "app/api/**"
---

# API Rules
- Validate all inputs with Pydantic v2 models at the route level -- never trust raw request data
- Return consistent error shapes: `{ "detail": "<message>", "code": "<error_code>" }`
- Always verify authentication and authorization via `Depends()` before processing requests
- Never log sensitive data (tokens, passwords, PII)
- Use HTTP status codes correctly -- 400 for client errors, 422 for validation errors, 500 for server errors
- Keep route handlers thin -- delegate logic to the service layer
- Use `APIRouter` with a prefix and tags for every resource group
