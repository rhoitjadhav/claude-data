# UPI Tracker

Personal finance tracker for UPI transactions. Upload bank statements, auto-categorize transactions, view dashboards and analytics.

## Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL, Alembic, arq (Redis workers)
- **Frontend**: React, TypeScript, Vite
- **Infra**: Docker Compose

## Prerequisites

- Docker + Docker Compose
- Git

## Setup

### 1. Clone

```bash
git clone <repo-url>
cd claude-data
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_db
DATABASE_URL=postgresql+asyncpg://your_user:your_password@postgres:5432/your_db
REDIS_URL=redis://redis:6379
```

### 3. Start services

```bash
docker compose up
```

### 4. Run migrations

```bash
docker compose exec backend alembic upgrade head
```

### 5. Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Troubleshooting

### `FATAL: role "..." does not exist`

Stale Postgres volume from a previous run with different credentials. Nuke the volume and restart:

```bash
docker compose down -v && docker compose up
```

Then re-run migrations:

```bash
docker compose exec backend alembic upgrade head
```

> **Warning**: `down -v` deletes all database data. Only do this in dev.

## Development

```bash
# Backend tests
docker compose exec backend pytest

# Lint
docker compose exec backend ruff check .

# Type check
docker compose exec backend mypy .
```

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── routers/      # FastAPI route handlers
│   │   ├── schemas/      # Pydantic v2 schemas
│   │   ├── services/     # Business logic
│   │   └── workers/      # arq background workers
│   ├── alembic/          # DB migrations
│   └── main.py
├── frontend/
│   └── src/
│       ├── components/
│       └── pages/        # Dashboard, Transactions, Lendings, Upload
├── docker-compose.yml
└── .env.example
```
