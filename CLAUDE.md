# Project Brain

## Stack
Python 3.12, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Alembic, Pydantic v2, Docker, Railway/Render

## Commands
uvicorn main:app --reload | pytest | ruff check . | mypy .

## Conventions
- Python 3.12+, strict typing enforced by mypy -- no `type: ignore` without a comment explaining why
- Pydantic v2 for all request/response schemas and validation
- SQLAlchemy 2.0 ORM style with async sessions
- Dependency injection via FastAPI `Depends()` for shared logic (auth, db sessions)
- Auto-commit after every change
