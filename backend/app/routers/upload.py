import os
import uuid

import arq
import arq.connections
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
