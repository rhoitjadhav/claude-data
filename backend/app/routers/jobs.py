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
