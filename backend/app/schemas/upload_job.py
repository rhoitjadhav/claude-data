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
