import os
import uuid
from decimal import Decimal

from arq.connections import RedisSettings
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
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

                merchant = _extract_merchant(raw.description)
                category = categorize(raw.description, raw.note)

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
