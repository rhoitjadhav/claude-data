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


class TransactionCreate(BaseModel):
    date: date
    description: str
    amount: Decimal
    category: str | None = None
    note: str | None = None
    account: str = "Manual"


class TransactionUpdate(BaseModel):
    category: str | None = None
    note: str | None = None


class TransactionListResponse(BaseModel):
    items: list[TransactionResponse]
    total: int
