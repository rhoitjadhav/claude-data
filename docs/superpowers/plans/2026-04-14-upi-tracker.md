# UPI Expense Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack UPI expense tracker that ingests PDFs from Navi, PhonePe, and Google Pay, categorizes transactions rule-based, and visualizes spending on a React dashboard with filters, search, and CSV export.

**Architecture:** FastAPI backend with async SQLAlchemy + PostgreSQL, Redis + arq for background PDF parsing, React + Vite SPA served via nginx. Upload returns `job_id` immediately; frontend polls until complete.

**Tech Stack:** Python 3.12 · FastAPI · SQLAlchemy 2.0 async · asyncpg · Alembic · pdfplumber · arq · Redis · React 18 · Vite · Tailwind CSS · shadcn/ui · Recharts · Zustand · TanStack Query · Docker Compose

---

## File Map

### Backend
- `backend/main.py` — app factory, router registration, CORS
- `backend/app/db/base.py` — SQLAlchemy DeclarativeBase
- `backend/app/db/session.py` — async engine + session dependency
- `backend/app/models/transaction.py` — Transaction ORM model
- `backend/app/models/upload_job.py` — UploadJob ORM model
- `backend/app/schemas/transaction.py` — TransactionResponse, TransactionUpdate
- `backend/app/schemas/upload_job.py` — UploadJobResponse
- `backend/app/schemas/stats.py` — SummaryStats, CategoryStat, MonthStat, DayStat, MerchantStat
- `backend/app/routers/upload.py` — POST /api/v1/upload
- `backend/app/routers/jobs.py` — GET /api/v1/jobs/{job_id}
- `backend/app/routers/transactions.py` — GET/PATCH/DELETE /api/v1/transactions
- `backend/app/routers/stats.py` — GET /api/v1/stats/*
- `backend/app/routers/export.py` — GET /api/v1/export/csv
- `backend/app/services/categorizer.py` — rule-based keyword matching
- `backend/app/services/filters.py` — debit filter + exclusion rules
- `backend/app/parsers/base.py` — RawTransaction dataclass + BaseParser ABC
- `backend/app/parsers/navi.py` — NaviParser
- `backend/app/parsers/phonepe.py` — PhonePeParser
- `backend/app/parsers/googlepay.py` — GooglePayParser
- `backend/app/parsers/detector.py` — detect_source → returns correct parser
- `backend/app/workers/pdf_worker.py` — arq job: process_pdf + WorkerSettings
- `backend/alembic/env.py` — async Alembic env
- `backend/alembic/versions/001_initial.py` — initial schema migration
- `backend/requirements.txt`
- `backend/Dockerfile`
- `backend/pytest.ini`
- `backend/tests/test_categorizer.py`
- `backend/tests/test_filters.py`
- `backend/tests/test_parsers.py`
- `backend/tests/test_transactions_router.py`
- `backend/tests/test_stats_router.py`

### Frontend
- `frontend/src/main.tsx` — React entry + QueryClientProvider
- `frontend/src/App.tsx` — BrowserRouter + routes
- `frontend/src/api/client.ts` — axios instance
- `frontend/src/api/transactions.ts` — list, patch, delete, export
- `frontend/src/api/stats.ts` — summary, byCategory, byMonth, byDay, topMerchants
- `frontend/src/api/upload.ts` — upload, pollJob
- `frontend/src/store/filterStore.ts` — Zustand: category, startDate, endDate, search
- `frontend/src/components/Layout.tsx` — sidebar + topbar
- `frontend/src/components/FilterBar.tsx` — date pickers + category dropdown + search
- `frontend/src/components/StatsBar.tsx` — 4 KPI cards
- `frontend/src/components/CategoryChart.tsx` — Recharts PieChart
- `frontend/src/components/MonthlyChart.tsx` — Recharts LineChart
- `frontend/src/components/DailyChart.tsx` — Recharts BarChart
- `frontend/src/components/TopMerchants.tsx` — ranked merchant list
- `frontend/src/components/TransactionTable.tsx` — paginated table + inline category edit
- `frontend/src/components/DropZone.tsx` — drag+drop PDF
- `frontend/src/components/UploadProgress.tsx` — polls job, shows result
- `frontend/src/pages/Dashboard.tsx`
- `frontend/src/pages/Transactions.tsx`
- `frontend/src/pages/Upload.tsx`
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/tailwind.config.ts`
- `frontend/components.json` — shadcn config
- `frontend/Dockerfile`
- `frontend/nginx.conf`

### Root
- `docker-compose.yml`
- `.env.example`
- `.gitignore`

---

## Task 1: Project scaffold + Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `backend/requirements.txt`
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

- [ ] **Step 1: Create `.gitignore`**

```
__pycache__/
*.pyc
.env
*.egg-info/
.venv/
node_modules/
dist/
.DS_Store
*.log
uploads/
.superpowers/
```

- [ ] **Step 2: Create `.env.example`**

```env
DATABASE_URL=postgresql+asyncpg://upi:upi_secret@postgres:5432/upi_tracker
REDIS_URL=redis://redis:6379
CORS_ORIGINS=http://localhost:3000
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: upi_tracker
      POSTGRES_USER: upi
      POSTGRES_PASSWORD: upi_secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U upi -d upi_tracker"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  worker:
    build: ./backend
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
    command: python -m arq app.workers.pdf_worker.WorkerSettings

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

- [ ] **Step 4: Create `backend/requirements.txt`**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy[asyncio]==2.0.35
asyncpg==0.29.0
alembic==1.13.3
pydantic==2.9.2
pydantic-settings==2.5.2
python-multipart==0.0.12
aiofiles==24.1.0
pdfplumber==0.11.4
arq==0.26.1
redis==5.1.1
python-dateutil==2.9.0
pytest==8.3.3
pytest-asyncio==0.24.0
httpx==0.27.2
```

- [ ] **Step 5: Create `backend/Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
```

- [ ] **Step 6: Create `frontend/nginx.conf`**

```nginx
server {
    listen 80;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

- [ ] **Step 7: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml .env.example .gitignore backend/requirements.txt backend/Dockerfile frontend/Dockerfile frontend/nginx.conf
git commit -m "chore: project scaffold, Docker Compose, requirements"
```

---

## Task 2: Backend — DB base, models, Alembic

**Files:**
- Create: `backend/app/__init__.py`
- Create: `backend/app/db/__init__.py`
- Create: `backend/app/db/base.py`
- Create: `backend/app/db/session.py`
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/transaction.py`
- Create: `backend/app/models/upload_job.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/001_initial.py`
- Create: `backend/main.py`
- Create: `backend/pytest.ini`

- [ ] **Step 1: Create `backend/app/db/base.py`**

```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

- [ ] **Step 2: Create `backend/app/db/session.py`**

```python
import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 3: Create `backend/app/models/transaction.py`**

```python
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Index, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(20))
    date: Mapped[date] = mapped_column(Date)
    description: Mapped[str] = mapped_column(Text)
    merchant: Mapped[str] = mapped_column(String(200))
    amount: Mapped[float] = mapped_column(Numeric(12, 2))
    category: Mapped[str] = mapped_column(String(50))
    account: Mapped[str] = mapped_column(String(200))
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        Index("ix_transactions_date", "date"),
        Index("ix_transactions_category", "category"),
        Index("ix_transactions_merchant", "merchant"),
        Index("ix_transactions_source", "source"),
    )
```

- [ ] **Step 4: Create `backend/app/models/upload_job.py`**

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UploadJob(Base):
    __tablename__ = "upload_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    filename: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_parsed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_saved: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 5: Create `backend/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="UPI Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 6: Create `backend/pytest.ini`**

```ini
[pytest]
asyncio_mode = auto
```

- [ ] **Step 7: Set up Alembic**

Run inside the backend directory (or inside the container):
```bash
cd backend
pip install -r requirements.txt
alembic init alembic
```

- [ ] **Step 8: Replace `backend/alembic/env.py`**

```python
import asyncio
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.db.base import Base
from app.models.transaction import Transaction  # noqa: F401
from app.models.upload_job import UploadJob  # noqa: F401

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = os.environ["DATABASE_URL"]
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    url = os.environ["DATABASE_URL"]
    connectable = create_async_engine(url)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

- [ ] **Step 9: Create `backend/alembic/versions/001_initial.py`**

```python
"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-14
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "transactions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("merchant", sa.String(200), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("account", sa.String(200), nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("raw_text", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_transactions_date", "transactions", ["date"])
    op.create_index("ix_transactions_category", "transactions", ["category"])
    op.create_index("ix_transactions_merchant", "transactions", ["merchant"])
    op.create_index("ix_transactions_source", "transactions", ["source"])

    op.create_table(
        "upload_jobs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("source", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("total_parsed", sa.Integer, nullable=True),
        sa.Column("total_saved", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("upload_jobs")
```

- [ ] **Step 10: Verify migration runs**

```bash
cd backend
DATABASE_URL=postgresql+asyncpg://upi:upi_secret@localhost:5432/upi_tracker alembic upgrade head
```

Expected output ends with: `Running upgrade  -> 001, initial schema`

- [ ] **Step 11: Commit**

```bash
git add backend/
git commit -m "feat: DB models, Alembic migration, FastAPI skeleton"
```

---

## Task 3: Pydantic schemas

**Files:**
- Create: `backend/app/schemas/__init__.py`
- Create: `backend/app/schemas/transaction.py`
- Create: `backend/app/schemas/upload_job.py`
- Create: `backend/app/schemas/stats.py`

- [ ] **Step 1: Create `backend/app/schemas/transaction.py`**

```python
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TransactionResponse(BaseSchema):
    id: uuid.UUID
    source: str
    date: date
    description: str
    merchant: str
    amount: Decimal
    category: str
    account: str
    note: str | None
    created_at: datetime
    updated_at: datetime


class TransactionUpdate(BaseModel):
    category: str | None = None
    note: str | None = None


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
```

- [ ] **Step 2: Create `backend/app/schemas/upload_job.py`**

```python
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class UploadJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    source: str
    status: str
    error: str | None
    total_parsed: int | None
    total_saved: int | None
    created_at: datetime
```

- [ ] **Step 3: Create `backend/app/schemas/stats.py`**

```python
from decimal import Decimal

from pydantic import BaseModel


class SummaryStats(BaseModel):
    total_spend: Decimal
    transaction_count: int
    avg_per_month: Decimal
    avg_per_day: Decimal


class CategoryStat(BaseModel):
    category: str
    total: Decimal
    count: int


class MonthStat(BaseModel):
    month: str  # "2025-01"
    total: Decimal
    count: int


class DayStat(BaseModel):
    day: str  # "2025-01-15"
    total: Decimal
    count: int


class MerchantStat(BaseModel):
    merchant: str
    total: Decimal
    count: int
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/schemas/
git commit -m "feat: Pydantic response schemas"
```

---

## Task 4: Categorization service

**Files:**
- Create: `backend/app/services/__init__.py`
- Create: `backend/app/services/categorizer.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_categorizer.py`

- [ ] **Step 1: Write failing test — `backend/tests/test_categorizer.py`**

```python
import pytest
from app.services.categorizer import categorize


def test_swiggy_is_food():
    assert categorize("Payment to Swiggy Foods") == "Food & Dining"


def test_zomato_is_food():
    assert categorize("ZOMATO ORDER 12345") == "Food & Dining"


def test_ola_is_transport():
    assert categorize("Ola Cabs ride payment") == "Transport"


def test_amazon_is_shopping():
    assert categorize("Amazon.in purchase") == "Shopping"


def test_netflix_is_entertainment():
    assert categorize("NETFLIX SUBSCRIPTION") == "Entertainment"


def test_jio_is_utilities():
    assert categorize("Jio recharge 299") == "Utilities"


def test_unknown_is_uncategorized():
    assert categorize("Random merchant XYZ") == "Uncategorized"


def test_case_insensitive():
    assert categorize("SWIGGY PAYMENT") == "Food & Dining"


def test_empty_string():
    assert categorize("") == "Uncategorized"
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd backend
pytest tests/test_categorizer.py -v
```

Expected: `ModuleNotFoundError` or `ImportError`

- [ ] **Step 3: Create `backend/app/services/categorizer.py`**

```python
# NOTE: Expand CATEGORY_RULES keywords from user's Excel reference sheet
# before first real upload. Each list is lowercase; matching is case-insensitive.

CATEGORY_RULES: dict[str, list[str]] = {
    "Food & Dining": [
        "swiggy", "zomato", "blinkit", "zepto", "dunzo", "restaurant",
        "café", "cafe", "hotel food", "domino", "mcdonald", "kfc", "subway",
        "pizza", "burger", "biryani", "mess", "tiffin", "diner", "eatery",
    ],
    "Transport": [
        "ola", "uber", "rapido", "irctc", "redbus", "metro", "petrol",
        "fuel", "parking", "toll", "cab", "taxi", "auto rickshaw", "rickshaw",
        "yulu", "bounce", "vogo",
    ],
    "Groceries": [
        "bigbasket", "dmart", "reliance fresh", "nature's basket", "grofers",
        "instamart", "milkbasket", "supermarket", "kirana", "vegetables",
        "fruits stall", "provisions",
    ],
    "Shopping": [
        "amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho",
        "snapdeal", "tatacliq", "reliance digital", "croma", "vijay sales",
        "lifestyle", "westside", "zara", "h&m",
    ],
    "Entertainment": [
        "netflix", "spotify", "prime video", "hotstar", "bookmyshow",
        "youtube premium", "disney", "sony liv", "zee5", "apple music",
        "gaana", "hungama", "pvr", "inox",
    ],
    "Health": [
        "pharmacy", "medplus", "apollo pharmacy", "1mg", "netmeds",
        "doctor", "hospital", "clinic", "dental", "lab test", "healthkart",
        "cult.fit", "gym",
    ],
    "Utilities": [
        "electricity", "water bill", "gas", "broadband", "jio", "airtel",
        "vi ", "vodafone", "idea", "bsnl", "recharge", "dth", "tatasky",
        "dish tv", "internet",
    ],
    "Education": [
        "udemy", "coursera", "byju", "unacademy", "vedantu", "collegedunia",
        "school fees", "college fees", "tuition", "coaching",
    ],
    "Finance": [
        "insurance", "emi payment", "loan repayment", "credit card payment",
        "mutual fund", "zerodha", "groww", "upstox", "angel broking",
        "ppf", "nps",
    ],
}


def categorize(description: str) -> str:
    """Return category for a transaction description using keyword matching.

    First match wins. Falls back to 'Uncategorized'.
    """
    lowered = description.lower()
    for category, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword in lowered:
                return category
    return "Uncategorized"
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd backend
pytest tests/test_categorizer.py -v
```

Expected: all 9 tests PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/categorizer.py backend/tests/
git commit -m "feat: rule-based categorization service with tests"
```

---

## Task 5: Filter service

**Files:**
- Create: `backend/app/services/filters.py`
- Create: `backend/tests/test_filters.py`

- [ ] **Step 1: Write failing test — `backend/tests/test_filters.py`**

```python
import pytest
from decimal import Decimal
from app.services.filters import should_include


def test_debit_included():
    assert should_include("Paid to merchant", Decimal("-200.00")) is True


def test_credit_excluded():
    assert should_include("Received from John", Decimal("500.00")) is False


def test_upi_lite_topup_excluded():
    assert should_include("UPI Lite Auto top-up", Decimal("-100.00")) is False


def test_received_from_excluded():
    assert should_include("Received from Rahul via UPI", Decimal("300.00")) is False


def test_upi_lite_deduction_included():
    assert should_include("UPI Lite deduction - Swiggy", Decimal("-80.00")) is True


def test_case_insensitive_exclusion():
    assert should_include("upi lite auto top-up for wallet", Decimal("-100.00")) is False


def test_zero_amount_excluded():
    assert should_include("Some transaction", Decimal("0.00")) is False
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd backend
pytest tests/test_filters.py -v
```

Expected: `ImportError`

- [ ] **Step 3: Create `backend/app/services/filters.py`**

```python
from decimal import Decimal

EXCLUDE_PHRASES = [
    "upi lite auto top-up",
    "received from",
]


def should_include(description: str, amount: Decimal) -> bool:
    """Return True if transaction should be saved.

    Rules:
    - Amount must be negative (debit) and non-zero.
    - Description must not contain any excluded phrase (case-insensitive).
    - UPI Lite deductions (not top-ups) are included.
    """
    if amount >= 0:
        return False

    lowered = description.lower()
    for phrase in EXCLUDE_PHRASES:
        if phrase in lowered:
            return False

    return True
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd backend
pytest tests/test_filters.py -v
```

Expected: all 7 tests PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/filters.py backend/tests/test_filters.py
git commit -m "feat: transaction filter rules with tests"
```

---

## Task 6: Parser base + Navi parser

**Files:**
- Create: `backend/app/parsers/__init__.py`
- Create: `backend/app/parsers/base.py`
- Create: `backend/app/parsers/navi.py`
- Create: `backend/tests/test_parsers.py`

- [ ] **Step 1: Create `backend/app/parsers/base.py`**

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from decimal import Decimal


@dataclass
class RawTransaction:
    date: date
    description: str
    account: str
    amount: Decimal  # negative = debit, positive = credit
    note: str | None = None
    raw_text: str | None = None


class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_bytes: bytes) -> list[RawTransaction]:
        """Extract raw transactions from PDF bytes."""
        ...

    @staticmethod
    def extract_text(file_bytes: bytes) -> str:
        import io
        import pdfplumber

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
        return "\n".join(pages)

    @staticmethod
    def extract_tables(file_bytes: bytes) -> list[list[list[str | None]]]:
        import io
        import pdfplumber

        all_tables: list[list[list[str | None]]] = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                if tables:
                    all_tables.extend(tables)
        return all_tables
```

- [ ] **Step 2: Write failing test for Navi parser**

In `backend/tests/test_parsers.py`:

```python
import io
from datetime import date
from decimal import Decimal

import pytest
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.parsers.navi import NaviParser


def make_navi_pdf(rows: list[tuple]) -> bytes:
    """Generate a minimal Navi-style PDF for testing."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 800, "Navi UPI Statement")
    c.drawString(50, 780, "Date        Description                    Account          Amount      Note")
    c.setFont("Helvetica", 9)
    y = 760
    for row in rows:
        line = f"{row[0]}  {row[1]:<35} {row[2]:<20} {row[3]:<12} {row[4]}"
        c.drawString(50, y, line)
        y -= 15
    c.save()
    buf.seek(0)
    return buf.read()


def test_navi_parses_debit_row():
    rows = [("14/01/2025", "Payment to Swiggy", "user@upi", "-250.00", "food")]
    pdf_bytes = make_navi_pdf(rows)
    parser = NaviParser()
    txns = parser.parse(pdf_bytes)
    assert len(txns) == 1
    assert txns[0].amount == Decimal("-250.00")
    assert txns[0].description == "Payment to Swiggy"
    assert txns[0].date == date(2025, 1, 14)


def test_navi_parses_multiple_rows():
    rows = [
        ("14/01/2025", "Payment to Swiggy", "user@upi", "-250.00", ""),
        ("15/01/2025", "Ola ride", "user@upi", "-180.00", "cab"),
    ]
    pdf_bytes = make_navi_pdf(rows)
    parser = NaviParser()
    txns = parser.parse(pdf_bytes)
    assert len(txns) == 2
```

Add `reportlab` to `backend/requirements.txt`:
```
reportlab==4.2.5
```

- [ ] **Step 3: Run to confirm failure**

```bash
cd backend && pip install reportlab
pytest tests/test_parsers.py -v
```

Expected: `ImportError: cannot import name 'NaviParser'`

- [ ] **Step 4: Create `backend/app/parsers/navi.py`**

```python
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from app.parsers.base import BaseParser, RawTransaction


class NaviParser(BaseParser):
    """Parse Navi UPI statement PDFs.

    Navi PDFs have a text table with columns:
    Date | Description | Account | Amount | Note

    Date format: DD/MM/YYYY
    Amount: negative for debits (e.g. -250.00), positive for credits
    """

    # Matches lines like: 14/01/2025  Payment to Swiggy  user@upi  -250.00  food
    ROW_PATTERN = re.compile(
        r"(\d{2}/\d{2}/\d{4})\s+"       # date
        r"(.+?)\s{2,}"                   # description (2+ spaces as separator)
        r"([\w@.]+)\s+"                  # account
        r"(-?\d+(?:\.\d{2})?)"           # amount
        r"(?:\s+(.+))?"                  # optional note
    )

    def parse(self, file_bytes: bytes) -> list[RawTransaction]:
        text = self.extract_text(file_bytes)
        transactions: list[RawTransaction] = []

        for line in text.splitlines():
            match = self.ROW_PATTERN.search(line)
            if not match:
                continue
            date_str, description, account, amount_str, note = match.groups()
            try:
                txn_date = datetime.strptime(date_str, "%d/%m/%Y").date()
                amount = Decimal(amount_str)
            except (ValueError, InvalidOperation):
                continue

            transactions.append(
                RawTransaction(
                    date=txn_date,
                    description=description.strip(),
                    account=account.strip(),
                    amount=amount,
                    note=note.strip() if note else None,
                    raw_text=line,
                )
            )

        return transactions
```

- [ ] **Step 5: Run tests**

```bash
cd backend
pytest tests/test_parsers.py -v
```

Expected: all Navi tests PASSED

- [ ] **Step 6: Commit**

```bash
git add backend/app/parsers/ backend/tests/test_parsers.py backend/requirements.txt
git commit -m "feat: BaseParser, NaviParser with tests"
```

---

## Task 7: PhonePe + Google Pay parsers

**Files:**
- Create: `backend/app/parsers/phonepe.py`
- Create: `backend/app/parsers/googlepay.py`
- Create: `backend/app/parsers/detector.py`
- Modify: `backend/tests/test_parsers.py`

- [ ] **Step 1: Add PhonePe + GPay tests to `backend/tests/test_parsers.py`**

Append to the file:

```python
from app.parsers.phonepe import PhonePeParser
from app.parsers.googlepay import GooglePayParser
from app.parsers.detector import detect_parser


def make_phonepe_pdf(rows: list[tuple]) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 800, "PhonePe Transaction History")
    c.drawString(50, 780, "Date & Time           Description                    Amount")
    c.setFont("Helvetica", 9)
    y = 760
    for row in rows:
        line = f"{row[0]}  {row[1]:<35} {row[2]}"
        c.drawString(50, y, line)
        y -= 15
    c.save()
    buf.seek(0)
    return buf.read()


def make_gpay_pdf(rows: list[tuple]) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 800, "Google Pay Transaction Details")
    c.drawString(50, 780, "Date        Description                    Amount")
    c.setFont("Helvetica", 9)
    y = 760
    for row in rows:
        line = f"{row[0]}  {row[1]:<35} {row[2]}"
        c.drawString(50, y, line)
        y -= 15
    c.save()
    buf.seek(0)
    return buf.read()


def test_phonepe_parses_debit():
    rows = [("14 Jan 2025 10:30", "Swiggy payment", "-320.00 Dr")]
    pdf_bytes = make_phonepe_pdf(rows)
    parser = PhonePeParser()
    txns = parser.parse(pdf_bytes)
    assert len(txns) == 1
    assert txns[0].amount == Decimal("-320.00")


def test_gpay_parses_debit():
    rows = [("Jan 14, 2025", "Ola Cabs", "-150.00")]
    pdf_bytes = make_gpay_pdf(rows)
    parser = GooglePayParser()
    txns = parser.parse(pdf_bytes)
    assert len(txns) == 1
    assert txns[0].amount == Decimal("-150.00")


def test_detector_navi(tmp_path):
    rows = [("14/01/2025", "Swiggy", "user@upi", "-200.00", "")]
    pdf_bytes = make_navi_pdf(rows)
    parser = detect_parser(pdf_bytes)
    assert isinstance(parser, NaviParser)


def test_detector_phonepe():
    rows = [("14 Jan 2025 10:30", "Swiggy", "-200.00 Dr")]
    pdf_bytes = make_phonepe_pdf(rows)
    parser = detect_parser(pdf_bytes)
    assert isinstance(parser, PhonePeParser)


def test_detector_gpay():
    rows = [("Jan 14, 2025", "Swiggy", "-200.00")]
    pdf_bytes = make_gpay_pdf(rows)
    parser = detect_parser(pdf_bytes)
    assert isinstance(parser, GooglePayParser)
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_parsers.py -v
```

Expected: `ImportError` for PhonePeParser, GooglePayParser, detect_parser

- [ ] **Step 3: Create `backend/app/parsers/phonepe.py`**

```python
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from app.parsers.base import BaseParser, RawTransaction


class PhonePeParser(BaseParser):
    """Parse PhonePe transaction history PDFs.

    Format: Date & Time | Description | Amount (with Dr/Cr suffix)
    Date format: DD Mon YYYY HH:MM  (e.g. 14 Jan 2025 10:30)
    Amount: e.g. -320.00 Dr or 500.00 Cr
    """

    ROW_PATTERN = re.compile(
        r"(\d{1,2}\s+\w{3}\s+\d{4}\s+\d{2}:\d{2})\s+"  # date+time
        r"(.+?)\s{2,}"                                    # description
        r"(-?\d+(?:\.\d{2})?)\s*(Dr|Cr)?"                # amount + direction
    )

    def parse(self, file_bytes: bytes) -> list[RawTransaction]:
        text = self.extract_text(file_bytes)
        transactions: list[RawTransaction] = []

        for line in text.splitlines():
            match = self.ROW_PATTERN.search(line)
            if not match:
                continue
            date_str, description, amount_str, direction = match.groups()
            try:
                txn_date = datetime.strptime(date_str.strip(), "%d %b %Y %H:%M").date()
                amount = Decimal(amount_str)
                if direction == "Dr" and amount > 0:
                    amount = -amount
                elif direction == "Cr" and amount < 0:
                    amount = -amount
            except (ValueError, InvalidOperation):
                continue

            transactions.append(
                RawTransaction(
                    date=txn_date,
                    description=description.strip(),
                    account="",
                    amount=amount,
                    raw_text=line,
                )
            )

        return transactions
```

- [ ] **Step 4: Create `backend/app/parsers/googlepay.py`**

```python
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation

from app.parsers.base import BaseParser, RawTransaction


class GooglePayParser(BaseParser):
    """Parse Google Pay transaction detail PDFs.

    Format: Date | Description | Amount
    Date format: Mon DD, YYYY  (e.g. Jan 14, 2025)
    Amount: negative for debits
    """

    ROW_PATTERN = re.compile(
        r"(\w{3}\s+\d{1,2},\s+\d{4})\s+"   # date
        r"(.+?)\s{2,}"                        # description
        r"(-?\d+(?:\.\d{2})?)"               # amount
    )

    def parse(self, file_bytes: bytes) -> list[RawTransaction]:
        text = self.extract_text(file_bytes)
        transactions: list[RawTransaction] = []

        for line in text.splitlines():
            match = self.ROW_PATTERN.search(line)
            if not match:
                continue
            date_str, description, amount_str = match.groups()
            try:
                txn_date = datetime.strptime(date_str.strip(), "%b %d, %Y").date()
                amount = Decimal(amount_str)
            except (ValueError, InvalidOperation):
                continue

            transactions.append(
                RawTransaction(
                    date=txn_date,
                    description=description.strip(),
                    account="",
                    amount=amount,
                    raw_text=line,
                )
            )

        return transactions
```

- [ ] **Step 5: Create `backend/app/parsers/detector.py`**

```python
from app.parsers.base import BaseParser
from app.parsers.navi import NaviParser
from app.parsers.phonepe import PhonePeParser
from app.parsers.googlepay import GooglePayParser


def detect_parser(file_bytes: bytes) -> BaseParser:
    """Detect which app generated the PDF and return the appropriate parser.

    Detection is keyword-based on extracted text.
    Defaults to NaviParser if no match found.
    """
    text = NaviParser.extract_text(file_bytes).lower()

    if "phonepe" in text or "phone pe" in text or "phonepetransaction" in text:
        return PhonePeParser()
    if "google pay" in text or "gpay" in text or "google payment" in text:
        return GooglePayParser()
    # Default: Navi
    return NaviParser()
```

- [ ] **Step 6: Run all parser tests**

```bash
pytest tests/test_parsers.py -v
```

Expected: all tests PASSED

- [ ] **Step 7: Commit**

```bash
git add backend/app/parsers/
git commit -m "feat: PhonePeParser, GooglePayParser, source detector"
```

---

## Task 8: arq worker

**Files:**
- Create: `backend/app/workers/__init__.py`
- Create: `backend/app/workers/pdf_worker.py`

- [ ] **Step 1: Create `backend/app/workers/pdf_worker.py`**

```python
import os
import uuid
from decimal import Decimal

from arq.connections import RedisSettings
from sqlalchemy import select

from app.db.base import Base
from app.db.session import AsyncSessionLocal, engine
from app.models.transaction import Transaction
from app.models.upload_job import UploadJob
from app.parsers.detector import detect_parser
from app.services.categorizer import categorize
from app.services.filters import should_include


async def process_pdf(ctx: dict, job_id: str, file_bytes: bytes) -> None:
    """arq job: parse PDF, filter, categorize, persist to DB."""
    async with AsyncSessionLocal() as session:
        # Load job
        result = await session.execute(
            select(UploadJob).where(UploadJob.id == uuid.UUID(job_id))
        )
        job = result.scalar_one_or_none()
        if not job:
            return

        job.status = "processing"
        await session.commit()

        try:
            parser = detect_parser(file_bytes)
            raw_txns = parser.parse(file_bytes)
            job.total_parsed = len(raw_txns)

            saved = 0
            for raw in raw_txns:
                if not should_include(raw.description, raw.amount):
                    continue

                # Merchant = first meaningful word(s) from description
                merchant = _extract_merchant(raw.description)
                category = categorize(raw.description)

                txn = Transaction(
                    source=job.source,
                    date=raw.date,
                    description=raw.description,
                    merchant=merchant,
                    amount=abs(raw.amount),  # store as positive
                    category=category,
                    account=raw.account,
                    note=raw.note,
                    raw_text=raw.raw_text,
                )
                session.add(txn)
                saved += 1

            job.total_saved = saved
            job.status = "completed"
            await session.commit()

        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
            await session.commit()
            raise


def _extract_merchant(description: str) -> str:
    """Extract a short merchant name from the description."""
    # Take first 2-3 words, strip common prefixes like "Payment to", "Paid to"
    prefixes = ["payment to ", "paid to ", "transfer to ", "upi payment to "]
    lowered = description.lower()
    for prefix in prefixes:
        if lowered.startswith(prefix):
            description = description[len(prefix):]
            break
    words = description.split()
    return " ".join(words[:3]) if words else description


class WorkerSettings:
    functions = [process_pdf]
    redis_settings = RedisSettings.from_dsn(
        os.environ.get("REDIS_URL", "redis://localhost:6379")
    )
    max_jobs = 10
```

- [ ] **Step 2: Verify worker imports cleanly**

```bash
cd backend
python -c "from app.workers.pdf_worker import WorkerSettings; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/workers/
git commit -m "feat: arq PDF processing worker"
```

---

## Task 9: Upload + Jobs routers

**Files:**
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/upload.py`
- Create: `backend/app/routers/jobs.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create `backend/app/routers/upload.py`**

```python
import os
import uuid

import arq
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.upload_job import UploadJob
from app.schemas.upload_job import UploadJobResponse

VALID_SOURCES = {"navi", "phonepe", "googlepay"}

router = APIRouter(prefix="/api/v1", tags=["Upload"])


async def get_redis() -> arq.ArqRedis:
    return await arq.create_pool(
        arq.connections.RedisSettings.from_dsn(
            os.environ.get("REDIS_URL", "redis://localhost:6379")
        )
    )


@router.post("/upload", response_model=UploadJobResponse, status_code=201)
async def upload_pdf(
    file: UploadFile = File(...),
    source: str = Form(...),
    session: AsyncSession = Depends(get_session),
    redis: arq.ArqRedis = Depends(get_redis),
) -> UploadJobResponse:
    if source not in VALID_SOURCES:
        raise HTTPException(
            status_code=400,
            detail={"detail": f"Invalid source. Must be one of {VALID_SOURCES}", "code": "INVALID_SOURCE"},
        )
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail={"detail": "Only PDF files are accepted", "code": "INVALID_FILE_TYPE"},
        )

    file_bytes = await file.read()
    job = UploadJob(
        id=uuid.uuid4(),
        filename=file.filename,
        source=source,
        status="pending",
    )
    session.add(job)
    await session.commit()
    await session.refresh(job)

    await redis.enqueue_job("process_pdf", str(job.id), file_bytes)

    return UploadJobResponse.model_validate(job)
```

- [ ] **Step 2: Create `backend/app/routers/jobs.py`**

```python
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.upload_job import UploadJob
from app.schemas.upload_job import UploadJobResponse

router = APIRouter(prefix="/api/v1", tags=["Jobs"])


@router.get("/jobs/{job_id}", response_model=UploadJobResponse)
async def get_job(
    job_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> UploadJobResponse:
    result = await session.execute(select(UploadJob).where(UploadJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Job not found", "code": "JOB_NOT_FOUND"},
        )
    return UploadJobResponse.model_validate(job)
```

- [ ] **Step 3: Register routers in `backend/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.routers.upload import router as upload_router
from app.routers.jobs import router as jobs_router

app = FastAPI(title="UPI Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(jobs_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 4: Verify app starts**

```bash
cd backend
DATABASE_URL=postgresql+asyncpg://upi:upi_secret@localhost:5432/upi_tracker \
REDIS_URL=redis://localhost:6379 \
uvicorn main:app --reload --port 8000
```

Expected: `Application startup complete.` — hit `http://localhost:8000/docs` to see upload + jobs endpoints.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/upload.py backend/app/routers/jobs.py backend/main.py
git commit -m "feat: upload and job polling endpoints"
```

---

## Task 10: Transactions router

**Files:**
- Create: `backend/app/routers/transactions.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create `backend/app/routers/transactions.py`**

```python
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionListResponse, TransactionResponse, TransactionUpdate

router = APIRouter(prefix="/api/v1", tags=["Transactions"])


def build_filters(
    model,
    category: str | None,
    start: date | None,
    end: date | None,
    search: str | None,
):
    conditions = []
    if category:
        conditions.append(model.category == category)
    if start:
        conditions.append(model.date >= start)
    if end:
        conditions.append(model.date <= end)
    if search:
        conditions.append(model.description.ilike(f"%{search}%"))
    return conditions


@router.get("/transactions", response_model=TransactionListResponse)
async def list_transactions(
    category: str | None = Query(None),
    start: date | None = Query(None),
    end: date | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> TransactionListResponse:
    filters = build_filters(Transaction, category, start, end, search)

    total_result = await session.execute(
        select(func.count(Transaction.id)).where(*filters)
    )
    total = total_result.scalar_one()

    result = await session.execute(
        select(Transaction)
        .where(*filters)
        .order_by(Transaction.date.desc())
        .limit(limit)
        .offset(offset)
    )
    items = result.scalars().all()

    return TransactionListResponse(
        items=[TransactionResponse.model_validate(t) for t in items],
        total=total,
    )


@router.patch("/transactions/{txn_id}", response_model=TransactionResponse)
async def update_transaction(
    txn_id: uuid.UUID,
    payload: TransactionUpdate,
    session: AsyncSession = Depends(get_session),
) -> TransactionResponse:
    result = await session.execute(
        select(Transaction).where(Transaction.id == txn_id)
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Transaction not found", "code": "TRANSACTION_NOT_FOUND"},
        )
    if payload.category is not None:
        txn.category = payload.category
    if payload.note is not None:
        txn.note = payload.note
    await session.commit()
    await session.refresh(txn)
    return TransactionResponse.model_validate(txn)


@router.delete("/transactions/{txn_id}", status_code=204)
async def delete_transaction(
    txn_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    result = await session.execute(
        select(Transaction).where(Transaction.id == txn_id)
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Transaction not found", "code": "TRANSACTION_NOT_FOUND"},
        )
    await session.delete(txn)
    await session.commit()
```

- [ ] **Step 2: Register router in `backend/main.py`**

Add to imports and register:
```python
from app.routers.transactions import router as transactions_router
# ...
app.include_router(transactions_router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/transactions.py backend/main.py
git commit -m "feat: transactions CRUD router"
```

---

## Task 11: Stats + Export routers

**Files:**
- Create: `backend/app/routers/stats.py`
- Create: `backend/app/routers/export.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create `backend/app/routers/stats.py`**

```python
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.transaction import Transaction
from app.routers.transactions import build_filters
from app.schemas.stats import CategoryStat, DayStat, MerchantStat, MonthStat, SummaryStats

router = APIRouter(prefix="/api/v1/stats", tags=["Stats"])


def common_filters(
    category: str | None = Query(None),
    start: date | None = Query(None),
    end: date | None = Query(None),
    search: str | None = Query(None),
):
    return build_filters(Transaction, category, start, end, search)


@router.get("/summary", response_model=SummaryStats)
async def summary(
    filters=Depends(common_filters),
    session: AsyncSession = Depends(get_session),
) -> SummaryStats:
    result = await session.execute(
        select(
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            func.count(Transaction.id).label("count"),
            func.coalesce(func.min(Transaction.date), func.current_date()).label("min_date"),
            func.coalesce(func.max(Transaction.date), func.current_date()).label("max_date"),
        ).where(*filters)
    )
    row = result.one()
    total = Decimal(str(row.total))
    count = row.count
    if count == 0:
        return SummaryStats(total_spend=Decimal("0"), transaction_count=0, avg_per_month=Decimal("0"), avg_per_day=Decimal("0"))

    days = max((row.max_date - row.min_date).days, 1)
    months = max(days / 30, 1)

    return SummaryStats(
        total_spend=total,
        transaction_count=count,
        avg_per_month=(total / Decimal(str(months))).quantize(Decimal("0.01")),
        avg_per_day=(total / Decimal(str(days))).quantize(Decimal("0.01")),
    )


@router.get("/by-category", response_model=list[CategoryStat])
async def by_category(
    filters=Depends(common_filters),
    session: AsyncSession = Depends(get_session),
) -> list[CategoryStat]:
    result = await session.execute(
        select(
            Transaction.category,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(*filters)
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    return [
        CategoryStat(category=row.category, total=Decimal(str(row.total)), count=row.count)
        for row in result.all()
    ]


@router.get("/by-month", response_model=list[MonthStat])
async def by_month(
    filters=Depends(common_filters),
    session: AsyncSession = Depends(get_session),
) -> list[MonthStat]:
    result = await session.execute(
        select(
            func.to_char(Transaction.date, "YYYY-MM").label("month"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(*filters)
        .group_by("month")
        .order_by("month")
    )
    return [
        MonthStat(month=row.month, total=Decimal(str(row.total)), count=row.count)
        for row in result.all()
    ]


@router.get("/by-day", response_model=list[DayStat])
async def by_day(
    filters=Depends(common_filters),
    session: AsyncSession = Depends(get_session),
) -> list[DayStat]:
    result = await session.execute(
        select(
            func.to_char(Transaction.date, "YYYY-MM-DD").label("day"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(*filters)
        .group_by("day")
        .order_by("day")
    )
    return [
        DayStat(day=row.day, total=Decimal(str(row.total)), count=row.count)
        for row in result.all()
    ]


@router.get("/top-merchants", response_model=list[MerchantStat])
async def top_merchants(
    limit: int = Query(10, ge=1, le=50),
    filters=Depends(common_filters),
    session: AsyncSession = Depends(get_session),
) -> list[MerchantStat]:
    result = await session.execute(
        select(
            Transaction.merchant,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(*filters)
        .group_by(Transaction.merchant)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(limit)
    )
    return [
        MerchantStat(merchant=row.merchant, total=Decimal(str(row.total)), count=row.count)
        for row in result.all()
    ]
```

- [ ] **Step 2: Create `backend/app/routers/export.py`**

```python
import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.transaction import Transaction
from app.routers.transactions import build_filters

router = APIRouter(prefix="/api/v1/export", tags=["Export"])


@router.get("/csv")
async def export_csv(
    category: str | None = Query(None),
    start: date | None = Query(None),
    end: date | None = Query(None),
    search: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    filters = build_filters(Transaction, category, start, end, search)
    result = await session.execute(
        select(Transaction).where(*filters).order_by(Transaction.date.desc())
    )
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["Date", "Description", "Merchant", "Amount", "Category", "Account", "Note", "Source"],
    )
    writer.writeheader()
    for txn in transactions:
        writer.writerow(
            {
                "Date": txn.date.isoformat(),
                "Description": txn.description,
                "Merchant": txn.merchant,
                "Amount": str(txn.amount),
                "Category": txn.category,
                "Account": txn.account,
                "Note": txn.note or "",
                "Source": txn.source,
            }
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )
```

- [ ] **Step 3: Register routers in `backend/main.py`**

Final `backend/main.py`:

```python
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.export import router as export_router
from app.routers.jobs import router as jobs_router
from app.routers.stats import router as stats_router
from app.routers.transactions import router as transactions_router
from app.routers.upload import router as upload_router

app = FastAPI(title="UPI Tracker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(jobs_router)
app.include_router(transactions_router)
app.include_router(stats_router)
app.include_router(export_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 4: Verify all routes appear in OpenAPI**

```bash
curl http://localhost:8000/openapi.json | python -m json.tool | grep '"path"'
```

Expected: upload, jobs, transactions, stats/*, export/csv all present.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/stats.py backend/app/routers/export.py backend/main.py
git commit -m "feat: stats and CSV export routers"
```

---

## Task 12: Frontend — Vite + React scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/components.json`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/index.css`

- [ ] **Step 1: Create `frontend/package.json`**

```json
{
  "name": "upi-tracker-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "@tanstack/react-query": "^5.56.2",
    "zustand": "^5.0.0",
    "axios": "^1.7.7",
    "recharts": "^2.12.7",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.446.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.3",
    "@radix-ui/react-select": "^2.1.2",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-popover": "^1.1.2",
    "@radix-ui/react-slot": "^1.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.8",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.7",
    "tailwindcss": "^3.4.12",
    "postcss": "^8.4.47",
    "autoprefixer": "^10.4.20"
  }
}
```

- [ ] **Step 2: Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

- [ ] **Step 3: Create `frontend/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `frontend/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>UPI Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
  }
}
```

- [ ] **Step 7: Create `frontend/src/main.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
```

- [ ] **Step 8: Create `frontend/src/App.tsx`**

```typescript
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Upload from './pages/Upload'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="upload" element={<Upload />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 9: Install deps and verify build**

```bash
cd frontend
npm install
npm run build
```

Expected: `dist/` created with no TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/
git commit -m "feat: React + Vite frontend scaffold"
```

---

## Task 13: Frontend — API client + Zustand store

**Files:**
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/transactions.ts`
- Create: `frontend/src/api/stats.ts`
- Create: `frontend/src/api/upload.ts`
- Create: `frontend/src/store/filterStore.ts`

- [ ] **Step 1: Create `frontend/src/api/client.ts`**

```typescript
import axios from 'axios'

const client = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export default client
```

- [ ] **Step 2: Create `frontend/src/api/transactions.ts`**

```typescript
import client from './client'

export interface Transaction {
  id: string
  source: string
  date: string
  description: string
  merchant: string
  amount: string
  category: string
  account: string
  note: string | null
  created_at: string
  updated_at: string
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
}

export interface TransactionFilters {
  category?: string
  start?: string
  end?: string
  search?: string
  limit?: number
  offset?: number
}

export async function fetchTransactions(filters: TransactionFilters): Promise<TransactionListResponse> {
  const { data } = await client.get('/transactions', { params: filters })
  return data
}

export async function updateTransaction(id: string, payload: { category?: string; note?: string }): Promise<Transaction> {
  const { data } = await client.patch(`/transactions/${id}`, payload)
  return data
}

export async function deleteTransaction(id: string): Promise<void> {
  await client.delete(`/transactions/${id}`)
}

export function buildExportUrl(filters: TransactionFilters): string {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.start) params.set('start', filters.start)
  if (filters.end) params.set('end', filters.end)
  if (filters.search) params.set('search', filters.search)
  return `/api/v1/export/csv?${params.toString()}`
}
```

- [ ] **Step 3: Create `frontend/src/api/stats.ts`**

```typescript
import client from './client'

export interface SummaryStats {
  total_spend: string
  transaction_count: number
  avg_per_month: string
  avg_per_day: string
}

export interface CategoryStat { category: string; total: string; count: number }
export interface MonthStat { month: string; total: string; count: number }
export interface DayStat { day: string; total: string; count: number }
export interface MerchantStat { merchant: string; total: string; count: number }

export interface StatFilters {
  category?: string
  start?: string
  end?: string
  search?: string
}

export const fetchSummary = (f: StatFilters) =>
  client.get<SummaryStats>('/stats/summary', { params: f }).then(r => r.data)

export const fetchByCategory = (f: StatFilters) =>
  client.get<CategoryStat[]>('/stats/by-category', { params: f }).then(r => r.data)

export const fetchByMonth = (f: StatFilters) =>
  client.get<MonthStat[]>('/stats/by-month', { params: f }).then(r => r.data)

export const fetchByDay = (f: StatFilters) =>
  client.get<DayStat[]>('/stats/by-day', { params: f }).then(r => r.data)

export const fetchTopMerchants = (f: StatFilters, limit = 10) =>
  client.get<MerchantStat[]>('/stats/top-merchants', { params: { ...f, limit } }).then(r => r.data)
```

- [ ] **Step 4: Create `frontend/src/api/upload.ts`**

```typescript
import client from './client'

export interface UploadJob {
  id: string
  filename: string
  source: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error: string | null
  total_parsed: number | null
  total_saved: number | null
  created_at: string
}

export async function uploadFile(file: File, source: string): Promise<UploadJob> {
  const form = new FormData()
  form.append('file', file)
  form.append('source', source)
  const { data } = await client.post<UploadJob>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function fetchJob(jobId: string): Promise<UploadJob> {
  const { data } = await client.get<UploadJob>(`/jobs/${jobId}`)
  return data
}
```

- [ ] **Step 5: Create `frontend/src/store/filterStore.ts`**

```typescript
import { create } from 'zustand'

interface FilterState {
  category: string
  startDate: string
  endDate: string
  search: string
  setCategory: (v: string) => void
  setStartDate: (v: string) => void
  setEndDate: (v: string) => void
  setSearch: (v: string) => void
  reset: () => void
  toParams: () => Record<string, string>
}

export const useFilterStore = create<FilterState>((set, get) => ({
  category: '',
  startDate: '',
  endDate: '',
  search: '',
  setCategory: (category) => set({ category }),
  setStartDate: (startDate) => set({ startDate }),
  setEndDate: (endDate) => set({ endDate }),
  setSearch: (search) => set({ search }),
  reset: () => set({ category: '', startDate: '', endDate: '', search: '' }),
  toParams: () => {
    const { category, startDate, endDate, search } = get()
    const params: Record<string, string> = {}
    if (category) params.category = category
    if (startDate) params.start = startDate
    if (endDate) params.end = endDate
    if (search) params.search = search
    return params
  },
}))
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd frontend && npm run build
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/ frontend/src/store/
git commit -m "feat: API client, data fetching functions, Zustand filter store"
```

---

## Task 14: Frontend — Layout + FilterBar

**Files:**
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/FilterBar.tsx`
- Create: `frontend/src/lib/utils.ts`

- [ ] **Step 1: Create `frontend/src/lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | number): string {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}
```

- [ ] **Step 2: Create `frontend/src/components/Layout.tsx`**

```typescript
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BarChart2, CreditCard, Upload } from 'lucide-react'
import { cn } from '../lib/utils'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { to: '/transactions', label: 'Transactions', icon: CreditCard },
  { to: '/upload', label: 'Upload', icon: Upload },
]

export default function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-brand-600">UPI Tracker</h1>
          <p className="text-xs text-gray-500 mt-0.5">Expense Manager</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === to
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-800">
            {nav.find(n => n.to === pathname)?.label ?? 'UPI Tracker'}
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/FilterBar.tsx`**

```typescript
import { useFilterStore } from '../store/filterStore'

const CATEGORIES = [
  'Food & Dining', 'Transport', 'Groceries', 'Shopping',
  'Entertainment', 'Health', 'Utilities', 'Education', 'Finance', 'Uncategorized',
]

export default function FilterBar() {
  const { category, startDate, endDate, search, setCategory, setStartDate, setEndDate, setSearch, reset } =
    useFilterStore()

  return (
    <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 mb-5">
      <input
        type="text"
        placeholder="Search transactions..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <select
        value={category}
        onChange={e => setCategory(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">All Categories</option>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        type="date"
        value={startDate}
        onChange={e => setStartDate(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <span className="self-center text-gray-400 text-sm">to</span>
      <input
        type="date"
        value={endDate}
        onChange={e => setEndDate(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button
        onClick={reset}
        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        Reset
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Layout.tsx frontend/src/components/FilterBar.tsx frontend/src/lib/utils.ts
git commit -m "feat: Layout sidebar, FilterBar component"
```

---

## Task 15: Frontend — Dashboard components

**Files:**
- Create: `frontend/src/components/StatsBar.tsx`
- Create: `frontend/src/components/CategoryChart.tsx`
- Create: `frontend/src/components/MonthlyChart.tsx`
- Create: `frontend/src/components/DailyChart.tsx`
- Create: `frontend/src/components/TopMerchants.tsx`
- Create: `frontend/src/pages/Dashboard.tsx`

- [ ] **Step 1: Create `frontend/src/components/StatsBar.tsx`**

```typescript
import { formatCurrency } from '../lib/utils'
import type { SummaryStats } from '../api/stats'

interface Props { data: SummaryStats | undefined; isLoading: boolean }

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function StatsBar({ data, isLoading }: Props) {
  if (isLoading) return <div className="grid grid-cols-4 gap-4 mb-5">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  if (!data) return null
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Total Spend" value={formatCurrency(data.total_spend)} />
      <StatCard label="Transactions" value={data.transaction_count.toString()} />
      <StatCard label="Avg / Month" value={formatCurrency(data.avg_per_month)} />
      <StatCard label="Avg / Day" value={formatCurrency(data.avg_per_day)} />
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/CategoryChart.tsx`**

```typescript
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryStat } from '../api/stats'
import { formatCurrency } from '../lib/utils'

const COLORS = ['#0ea5e9','#f59e0b','#10b981','#8b5cf6','#ef4444','#f97316','#06b6d4','#84cc16','#ec4899','#6366f1']

interface Props { data: CategoryStat[] | undefined; isLoading: boolean }

export default function CategoryChart({ data, isLoading }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Spend by Category</h3>
      {isLoading ? <div className="h-64 bg-gray-100 rounded animate-pulse" /> : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {data?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/MonthlyChart.tsx`**

```typescript
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthStat } from '../api/stats'
import { formatCurrency } from '../lib/utils'

interface Props { data: MonthStat[] | undefined; isLoading: boolean }

export default function MonthlyChart({ data, isLoading }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Spend Trend</h3>
      {isLoading ? <div className="h-64 bg-gray-100 rounded animate-pulse" /> : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/DailyChart.tsx`**

```typescript
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayStat } from '../api/stats'
import { formatCurrency } from '../lib/utils'

interface Props { data: DayStat[] | undefined; isLoading: boolean }

export default function DailyChart({ data, isLoading }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Breakdown</h3>
      {isLoading ? <div className="h-64 bg-gray-100 rounded animate-pulse" /> : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `frontend/src/components/TopMerchants.tsx`**

```typescript
import type { MerchantStat } from '../api/stats'
import { formatCurrency } from '../lib/utils'

interface Props { data: MerchantStat[] | undefined; isLoading: boolean }

export default function TopMerchants({ data, isLoading }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Merchants</h3>
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : (
        <ul className="space-y-2">
          {data?.map((m, i) => (
            <li key={m.merchant} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <span className="text-gray-700">{m.merchant}</span>
              </span>
              <span className="font-semibold text-gray-900">{formatCurrency(m.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create `frontend/src/pages/Dashboard.tsx`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { fetchByCategory, fetchByDay, fetchByMonth, fetchSummary, fetchTopMerchants } from '../api/stats'
import CategoryChart from '../components/CategoryChart'
import DailyChart from '../components/DailyChart'
import FilterBar from '../components/FilterBar'
import MonthlyChart from '../components/MonthlyChart'
import StatsBar from '../components/StatsBar'
import TopMerchants from '../components/TopMerchants'
import { useFilterStore } from '../store/filterStore'

export default function Dashboard() {
  const filters = useFilterStore(s => s.toParams())

  const summary = useQuery({ queryKey: ['summary', filters], queryFn: () => fetchSummary(filters) })
  const byCategory = useQuery({ queryKey: ['byCategory', filters], queryFn: () => fetchByCategory(filters) })
  const byMonth = useQuery({ queryKey: ['byMonth', filters], queryFn: () => fetchByMonth(filters) })
  const byDay = useQuery({ queryKey: ['byDay', filters], queryFn: () => fetchByDay(filters) })
  const topMerchants = useQuery({ queryKey: ['topMerchants', filters], queryFn: () => fetchTopMerchants(filters) })

  return (
    <div>
      <FilterBar />
      <StatsBar data={summary.data} isLoading={summary.isLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <CategoryChart data={byCategory.data} isLoading={byCategory.isLoading} />
        <MonthlyChart data={byMonth.data} isLoading={byMonth.isLoading} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <DailyChart data={byDay.data} isLoading={byDay.isLoading} />
        </div>
        <TopMerchants data={topMerchants.data} isLoading={topMerchants.isLoading} />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ frontend/src/pages/Dashboard.tsx
git commit -m "feat: Dashboard page — StatsBar, charts, TopMerchants"
```

---

## Task 16: Frontend — Transactions page + Upload page

**Files:**
- Create: `frontend/src/components/TransactionTable.tsx`
- Create: `frontend/src/components/DropZone.tsx`
- Create: `frontend/src/components/UploadProgress.tsx`
- Create: `frontend/src/pages/Transactions.tsx`
- Create: `frontend/src/pages/Upload.tsx`

- [ ] **Step 1: Create `frontend/src/components/TransactionTable.tsx`**

```typescript
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { deleteTransaction, fetchTransactions, updateTransaction } from '../api/transactions'
import { useFilterStore } from '../store/filterStore'
import { formatCurrency } from '../lib/utils'

const CATEGORIES = ['Food & Dining','Transport','Groceries','Shopping','Entertainment','Health','Utilities','Education','Finance','Uncategorized']

export default function TransactionTable() {
  const filters = useFilterStore(s => s.toParams())
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const limit = 50

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: () => fetchTransactions({ ...filters, limit, offset: page * limit }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) => updateTransaction(id, { category }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })

  if (isLoading) return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date','Description','Merchant','Amount','Category','Account',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.items.map(txn => (
              <tr key={txn.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{txn.date}</td>
                <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{txn.description}</td>
                <td className="px-4 py-3 text-gray-600">{txn.merchant}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(txn.amount)}</td>
                <td className="px-4 py-3">
                  <select
                    value={txn.category}
                    onChange={e => updateMut.mutate({ id: txn.id, category: e.target.value })}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{txn.account}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteMut.mutate(txn.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.total > limit && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
          <span className="text-gray-500">Showing {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} of {data.total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= data.total} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/pages/Transactions.tsx`**

```typescript
import { Download } from 'lucide-react'
import { buildExportUrl } from '../api/transactions'
import FilterBar from '../components/FilterBar'
import TransactionTable from '../components/TransactionTable'
import { useFilterStore } from '../store/filterStore'

export default function Transactions() {
  const filters = useFilterStore(s => s.toParams())

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-800">All Transactions</h2>
        <a
          href={buildExportUrl(filters)}
          download="transactions.csv"
          className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Download size={14} /> Export CSV
        </a>
      </div>
      <FilterBar />
      <TransactionTable />
    </div>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/DropZone.tsx`**

```typescript
import { useCallback, useState } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '../lib/utils'

interface Props {
  onFile: (file: File) => void
}

export default function DropZone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') onFile(file)
  }, [onFile])

  return (
    <label
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 cursor-pointer transition-colors',
        dragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
      )}
    >
      <Upload size={32} className="text-gray-400 mb-3" />
      <p className="text-sm font-medium text-gray-700">Drop your PDF here</p>
      <p className="text-xs text-gray-400 mt-1">or click to browse</p>
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
    </label>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/UploadProgress.tsx`**

```typescript
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Loader } from 'lucide-react'
import { fetchJob, type UploadJob } from '../api/upload'

interface Props { jobId: string; onComplete: (job: UploadJob) => void }

export default function UploadProgress({ jobId, onComplete }: Props) {
  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => fetchJob(jobId),
    refetchInterval: (q) => {
      const status = q.state.data?.status
      return status === 'completed' || status === 'failed' ? false : 1500
    },
  })

  useEffect(() => {
    if (job?.status === 'completed' || job?.status === 'failed') onComplete(job)
  }, [job, onComplete])

  if (!job) return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader size={14} className="animate-spin" /> Starting...</div>

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center gap-2">
        {job.status === 'completed' && <CheckCircle size={18} className="text-green-500" />}
        {job.status === 'failed' && <XCircle size={18} className="text-red-500" />}
        {(job.status === 'pending' || job.status === 'processing') && <Loader size={18} className="animate-spin text-brand-500" />}
        <span className="text-sm font-medium capitalize">{job.status}</span>
      </div>
      {job.status === 'completed' && (
        <div className="text-sm text-gray-600 space-y-1">
          <p>Parsed: <strong>{job.total_parsed}</strong> rows</p>
          <p>Saved: <strong>{job.total_saved}</strong> transactions</p>
          <p>Skipped: <strong>{(job.total_parsed ?? 0) - (job.total_saved ?? 0)}</strong> (filtered out)</p>
        </div>
      )}
      {job.status === 'failed' && (
        <p className="text-sm text-red-600">{job.error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create `frontend/src/pages/Upload.tsx`**

```typescript
import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import DropZone from '../components/DropZone'
import UploadProgress from '../components/UploadProgress'
import { uploadFile, type UploadJob } from '../api/upload'

const SOURCES = [
  { value: 'navi', label: 'Navi' },
  { value: 'phonepe', label: 'PhonePe' },
  { value: 'googlepay', label: 'Google Pay' },
]

export default function Upload() {
  const qc = useQueryClient()
  const [source, setSource] = useState('navi')
  const [jobId, setJobId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setJobId(null)
    setUploading(true)
    try {
      const job = await uploadFile(file, source)
      setJobId(job.id)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [source])

  const handleComplete = useCallback((job: UploadJob) => {
    if (job.status === 'completed') {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['summary'] })
      qc.invalidateQueries({ queryKey: ['byCategory'] })
      qc.invalidateQueries({ queryKey: ['byMonth'] })
      qc.invalidateQueries({ queryKey: ['byDay'] })
      qc.invalidateQueries({ queryKey: ['topMerchants'] })
    }
  }, [qc])

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Select App</h3>
        <div className="flex gap-2">
          {SOURCES.map(s => (
            <button
              key={s.value}
              onClick={() => setSource(s.value)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                source === s.value
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {!jobId && !uploading && <DropZone onFile={handleFile} />}
      {uploading && <p className="text-sm text-gray-500 text-center">Uploading...</p>}
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      {jobId && <UploadProgress jobId={jobId} onComplete={handleComplete} />}

      {jobId && (
        <button
          onClick={() => { setJobId(null); setError(null) }}
          className="w-full py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Upload Another File
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Build and verify no TypeScript errors**

```bash
cd frontend && npm run build
```

Expected: clean build, `dist/` generated.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/
git commit -m "feat: Transactions page, Upload page with job polling"
```

---

## Task 17: End-to-end wiring + smoke test

**Files:**
- Create: `.env` (from `.env.example`, not committed)

- [ ] **Step 1: Create local `.env`**

```bash
cp .env.example .env
```

- [ ] **Step 2: Start all services**

```bash
docker compose up --build
```

Wait for all services healthy. Expected output:
```
backend-1   | Application startup complete.
worker-1    | Starting worker for functions: process_pdf
frontend-1  | ready
```

- [ ] **Step 3: Run Alembic migration inside container**

```bash
docker compose exec backend alembic upgrade head
```

Expected: `Running upgrade  -> 001, initial schema`

- [ ] **Step 4: Smoke test backend**

```bash
curl http://localhost:8000/health
# {"status":"ok"}

curl http://localhost:8000/api/v1/transactions
# {"items":[],"total":0}

curl http://localhost:8000/api/v1/stats/summary
# {"total_spend":"0","transaction_count":0,"avg_per_month":"0","avg_per_day":"0"}
```

- [ ] **Step 5: Smoke test frontend**

Open `http://localhost:3000` in browser.
- Dashboard loads with empty charts (no errors in console)
- Transactions page loads empty table
- Upload page shows source selector + drop zone
- Sidebar navigation works

- [ ] **Step 6: Test full upload flow**

1. Get any Navi/PhonePe/GPay statement PDF
2. Go to Upload page → select source → drop PDF
3. Verify progress spinner appears
4. Verify job completes with parsed/saved counts
5. Go to Dashboard → verify charts populated
6. Go to Transactions → verify rows visible
7. Change a category via dropdown → verify it saves
8. Click Export CSV → verify file downloads

- [ ] **Step 7: Run backend tests**

```bash
docker compose exec backend pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 8: Final commit**

```bash
git add .
git commit -m "feat: end-to-end integration verified, full MVP complete"
```

---

## Post-Launch: Expand Keywords from Excel

When the user shares their Excel categorization sheet:

1. Open `backend/app/services/categorizer.py`
2. For each row in the sheet, identify the keyword and target category
3. Add keywords to the matching list in `CATEGORY_RULES`
4. Run `pytest tests/test_categorizer.py -v` after each category block updated
5. Commit: `git commit -m "feat: expand categorization keywords from reference data"`

**Parser tuning:** Real Navi/PhonePe/GPay PDFs will likely need regex adjustments in `backend/app/parsers/`. The pattern in each parser file is the first thing to tune when a PDF fails to parse — check `job.error` in the DB or worker logs for the raw exception.