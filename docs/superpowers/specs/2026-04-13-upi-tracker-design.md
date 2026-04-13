# UPI Expense Tracker — Design Spec
**Date:** 2026-04-13  
**Status:** Approved  
**Scope:** Single-user MVP

---

## 1. Overview

A personal expense tracker that ingests UPI payment PDFs (Navi, PhonePe, Google Pay), extracts and categorizes transactions, stores them in PostgreSQL, and visualizes them on a React dashboard. Users can filter, search, and export data as CSV.

---

## 2. System Architecture

**Stack:** React + Vite (frontend) · FastAPI (backend) · PostgreSQL · Redis · arq (job queue) · Docker Compose

```
┌─────────────────────────────────────────────────┐
│                   Docker Compose                │
│                                                 │
│  ┌──────────┐    ┌──────────┐   ┌───────────┐  │
│  │  React   │───▶│ FastAPI  │──▶│ Postgres  │  │
│  │  (nginx) │    │  :8000   │   │  :5432    │  │
│  │  :3000   │    │          │   └───────────┘  │
│  └──────────┘    │  /upload │                  │
│                  │  /txns   │   ┌───────────┐  │
│                  │  /export │──▶│   Redis   │  │
│                  │  /stats  │   │  :6379    │  │
│                  └──────────┘   └───────────┘  │
│                       │                         │
│              ┌────────▼────────┐                │
│              │  arq Worker     │                │
│              │  (PDF parsing)  │                │
│              └─────────────────┘                │
└─────────────────────────────────────────────────┘
```

**Upload flow:**
1. User uploads PDF → FastAPI enqueues job in Redis → returns `job_id`
2. `arq` worker picks up job → parses PDF → applies filter rules → categorizes → writes to Postgres
3. Frontend polls `GET /jobs/{job_id}` until `completed` → refreshes transaction list

---

## 3. Folder Structure

```
claude-data/
├── backend/
│   ├── app/
│   │   ├── routers/          # upload, transactions, stats, export
│   │   ├── services/         # pdf_parser, categorizer, exporter
│   │   ├── parsers/          # navi.py, phonepe.py, googlepay.py
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── db/               # async session, base
│   │   └── workers/          # arq job definitions
│   ├── alembic/
│   ├── tests/
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/       # Upload, TransactionTable, Charts, Filters
│   │   ├── pages/            # Dashboard, Transactions, Upload
│   │   ├── api/              # axios client, query hooks
│   │   └── store/            # Zustand filterStore
│   ├── public/
│   └── nginx.conf
├── docker-compose.yml
└── docs/
    └── superpowers/specs/
```

---

## 4. Database Schema

### `transactions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| source | VARCHAR | `navi` \| `phonepe` \| `googlepay` |
| date | DATE | indexed |
| description | TEXT | raw transaction detail from PDF |
| merchant | VARCHAR | extracted/cleaned merchant name |
| amount | NUMERIC | always positive (debits only) |
| category | VARCHAR | rule-assigned, user-overridable |
| account | VARCHAR | UPI ID / account ref |
| note | TEXT | optional user note |
| raw_text | TEXT | original row for debug/audit |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Indexes:** `date`, `category`, `merchant`, `source`

### `upload_jobs`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| filename | VARCHAR | |
| source | VARCHAR | detected app type |
| status | VARCHAR | `pending` \| `processing` \| `completed` \| `failed` |
| error | TEXT | null on success |
| total_parsed | INT | rows found in PDF |
| total_saved | INT | rows written after filters |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

## 5. API Routes

```
POST   /api/v1/upload                    # Upload PDF → returns job_id
GET    /api/v1/jobs/{job_id}             # Poll job status

GET    /api/v1/transactions              # List with filters + pagination
                                         # ?category=&start=&end=&search=&limit=&offset=
DELETE /api/v1/transactions/{id}         # Remove transaction
PATCH  /api/v1/transactions/{id}         # Edit category / note

GET    /api/v1/stats/summary             # Total, avg/month, avg/day, count
GET    /api/v1/stats/by-category         # Spend grouped by category
GET    /api/v1/stats/by-month            # Monthly totals
GET    /api/v1/stats/by-day              # Daily totals
GET    /api/v1/stats/top-merchants       # Top N merchants by spend

GET    /api/v1/export/csv                # Download filtered CSV
                                         # same ?category=&start=&end=&search= params
```

All stats endpoints accept `?category=&start=&end=&search=` — filters apply globally.

**Dashboard loads 4 parallel calls:** `summary` + `by-category` + `by-month` + `top-merchants`

---

## 6. Frontend UI Structure

**Tech:** React + Vite · shadcn/ui · Tailwind CSS · Recharts · Zustand · React Query · axios

```
App
├── Layout (sidebar nav + topbar)
│   ├── /dashboard
│   │   ├── StatsBar      (total spend, avg/month, avg/day, tx count)
│   │   ├── FilterBar     (date range picker, category dropdown, search)
│   │   ├── CategoryChart (pie — spend by category)
│   │   ├── MonthlyChart  (line — monthly trend)
│   │   ├── DailyChart    (bar — daily breakdown)
│   │   └── TopMerchants  (ranked list with amounts)
│   │
│   ├── /transactions
│   │   ├── FilterBar     (shared Zustand filterStore)
│   │   ├── TransactionTable (paginated, sortable, inline category edit)
│   │   └── ExportButton  (CSV download with active filters)
│   │
│   └── /upload
│       ├── DropZone      (drag+drop or click to select PDF)
│       ├── SourceSelect  (Navi / PhonePe / Google Pay)
│       ├── UploadProgress (polling job status)
│       └── ResultSummary (parsed N, saved M, skipped K)
```

**State:** Single `filterStore` (Zustand) shared across Dashboard + Transactions pages so filters stay in sync.

---

## 7. PDF Parsing

One parser per source app. Each implements a common interface:

```python
class BaseParser:
    def parse(self, file_bytes: bytes) -> list[RawTransaction]: ...
```

**Filter rules (applied in worker before save):**
- Include only debit transactions
- Exclude rows containing `"upi lite auto top-up"` (case-insensitive)
- Exclude rows containing `"received from"` (case-insensitive)
- Include UPI Lite deductions

---

## 8. Categorization Rules

Rule-based keyword matching on `description` + `merchant` (lowercased). First match wins. Fallback: `"Uncategorized"`.

Seed keywords provided below — full keyword list to be expanded from user's Excel reference data during implementation.

```python
CATEGORY_RULES = {
    "Food & Dining":   ["swiggy", "zomato", "blinkit", "zepto", "dunzo", "restaurant", "café", "hotel", "food"],
    "Transport":       ["ola", "uber", "rapido", "irctc", "redbus", "metro", "petrol", "fuel", "parking"],
    "Groceries":       ["bigbasket", "dmart", "reliance fresh", "nature's basket", "grofers", "instamart"],
    "Shopping":        ["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho"],
    "Entertainment":   ["netflix", "spotify", "prime video", "hotstar", "bookmyshow", "youtube"],
    "Health":          ["pharmacy", "medplus", "apollo", "1mg", "doctor", "hospital", "clinic"],
    "Utilities":       ["electricity", "water", "gas", "broadband", "jio", "airtel", "vi ", "recharge"],
    "Education":       ["udemy", "coursera", "byju", "unacademy", "college", "school", "fees"],
    "Finance":         ["insurance", "emi", "loan", "credit card", "mutual fund", "zerodha"],
    "Uncategorized":   []
}
```

User can override any transaction's category via `PATCH /api/v1/transactions/{id}`.

---

## 9. Export

`GET /api/v1/export/csv` streams a CSV with columns:
`Date, Description, Merchant, Amount, Category, Account, Note, Source`

Respects active filters — exports exactly what user sees in transaction table.

---

## 10. Future Scope (not in MVP)

- Multi-user auth (JWT + per-user data isolation)
- Budget tracking vs actual (DB-backed)
- AI-assisted categorization
- Additional PDF sources (Paytm, BHIM)
- Excel export
