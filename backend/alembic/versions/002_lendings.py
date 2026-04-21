"""add lendings table

Revision ID: 002
Revises: 001
Create Date: 2026-04-21
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lendings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("person_name", sa.String(100), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("amount_repaid", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("note", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="outstanding"),
        sa.Column("linked_transaction_id", UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_lendings_person", "lendings", ["person_name"])
    op.create_index("ix_lendings_status", "lendings", ["status"])


def downgrade() -> None:
    op.drop_index("ix_lendings_status")
    op.drop_index("ix_lendings_person")
    op.drop_table("lendings")