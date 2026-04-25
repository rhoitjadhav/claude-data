"""add fingerprint dedup + total_skipped

Revision ID: 003
Revises: 002
Create Date: 2026-04-25
"""
import hashlib

import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql import text

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("transactions", sa.Column("fingerprint", sa.String(64), nullable=True))
    op.add_column("upload_jobs", sa.Column("total_skipped", sa.Integer(), nullable=True))

    # Backfill — oldest-first, skip collisions (pre-existing dupes stay NULL)
    conn = op.get_bind()
    rows = conn.execute(
        text("SELECT id, date, description, amount, account FROM transactions ORDER BY created_at ASC")
    ).fetchall()
    seen: set[str] = set()
    for row in rows:
        raw = f"{row.date}|{str(row.description).strip().lower()}|{row.amount}|{str(row.account).strip().lower()}"
        fp = hashlib.sha256(raw.encode()).hexdigest()
        if fp in seen:
            continue
        seen.add(fp)
        conn.execute(
            text("UPDATE transactions SET fingerprint = :fp WHERE id = :id"),
            {"fp": fp, "id": str(row.id)},
        )

    # Partial unique index — NULLs excluded so pre-existing rows are safe
    op.create_index(
        "uq_transactions_fingerprint",
        "transactions",
        ["fingerprint"],
        unique=True,
        postgresql_where=sa.text("fingerprint IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_transactions_fingerprint", table_name="transactions")
    op.drop_column("transactions", "fingerprint")
    op.drop_column("upload_jobs", "total_skipped")
