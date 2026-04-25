import hashlib
import hashlib
import os
import uuid
from decimal import Decimal

from arq.connections import RedisSettings
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.transaction import Transaction
from app.models.upload_job import UploadJob
from app.parsers.detector import detect_parser
from app.services.categorizer import categorize_batch
from app.services.filters import should_include


def _compute_fingerprint(date: object, description: str, amount: Decimal, account: str) -> str:
    raw = f"{date}|{description.strip().lower()}|{amount}|{account.strip().lower()}"
    return hashlib.sha256(raw.encode()).hexdigest()


async def process_pdf(ctx: dict, job_id: str, file_bytes: bytes) -> None:
    """arq job: parse PDF, filter, categorize, persist to DB."""
    async with AsyncSessionLocal() as session:
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

            # Filter first
            filtered = [
                raw for raw in raw_txns
                if should_include(raw.description, raw.amount)
            ]

            # Batch categorize in one API call
            categories = await categorize_batch(
                [(raw.description, raw.note) for raw in filtered]
            )

            saved = 0
            skipped = 0
            for raw, category in zip(filtered, categories):
                amount = abs(raw.amount)
                fingerprint = _compute_fingerprint(raw.date, raw.description, amount, raw.account)
                existing = await session.execute(
                    select(Transaction.id).where(Transaction.fingerprint == fingerprint)
                )
                if existing.scalar_one_or_none():
                    skipped += 1
                    continue
                merchant = _extract_merchant(raw.description)
                txn = Transaction(
                    source=job.source,
                    date=raw.date,
                    description=raw.description,
                    merchant=merchant,
                    amount=amount,
                    category=category,
                    account=raw.account,
                    note=raw.note,
                    raw_text=raw.raw_text,
                    fingerprint=fingerprint,
                )
                session.add(txn)
                saved += 1

            job.total_saved = saved
            job.total_skipped = skipped
            job.status = "completed"
            await session.commit()

        except Exception as exc:
            job.status = "failed"
            job.error = str(exc)
            await session.commit()
            raise


def _extract_merchant(description: str) -> str:
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
