---
name: api-design
description: Apply consistent FastAPI endpoint design standards
user-invocable: true
---

Router structure: `APIRouter(prefix="/resource", tags=["Resource"])`
Response models: always define a Pydantic response schema -- never return raw ORM objects
Error shape: `{"detail": "<human message>", "code": "<SCREAMING_SNAKE_CASE>"}`
Auth: inject via `current_user: User = Depends(get_current_user)` on protected routes
Pagination: use `limit`/`offset` query params, return `{"items": [...], "total": int}`
Versioning: prefix all routers with `/api/v1/`
Status codes: 200 GET, 201 POST (created), 204 DELETE (no content), 422 validation error
