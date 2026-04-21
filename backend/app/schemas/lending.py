import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, model_validator


class LendingCreate(BaseModel):
    person_name: str
    amount: Decimal
    date: date
    note: str | None = None
    linked_transaction_id: uuid.UUID | None = None


class LendingUpdate(BaseModel):
    person_name: str | None = None
    amount_repaid: Decimal | None = None
    note: str | None = None


class LendingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    person_name: str
    amount: Decimal
    amount_repaid: Decimal
    amount_outstanding: Decimal = Decimal("0")
    date: date
    note: str | None
    status: str
    linked_transaction_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    @model_validator(mode="after")
    def compute_outstanding(self) -> "LendingResponse":
        self.amount_outstanding = self.amount - self.amount_repaid
        return self
