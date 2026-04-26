import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.lending import Lending
from app.schemas.lending import LendingCreate, LendingResponse, LendingUpdate

router = APIRouter(prefix="/api/v1/lendings", tags=["Lendings"])


def _compute_status(amount: Decimal, amount_repaid: Decimal) -> str:
    if amount_repaid <= 0:
        return "outstanding"
    if amount_repaid >= amount:
        return "settled"
    return "partial"


@router.get("", response_model=list[LendingResponse])
async def list_lendings(
    status: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> list[LendingResponse]:
    q = select(Lending).order_by(Lending.date.desc())
    if status:
        q = q.where(Lending.status == status)
    result = await session.execute(q)
    return [LendingResponse.model_validate(r) for r in result.scalars().all()]


@router.post("", response_model=LendingResponse, status_code=201)
async def create_lending(
    payload: LendingCreate,
    session: AsyncSession = Depends(get_session),
) -> LendingResponse:
    lending = Lending(
        person_name=payload.person_name,
        amount=payload.amount,
        amount_repaid=Decimal("0"),
        date=payload.date,
        note=payload.note,
        status="outstanding",
        linked_transaction_id=payload.linked_transaction_id,
    )
    session.add(lending)
    await session.commit()
    await session.refresh(lending)
    return LendingResponse.model_validate(lending)


@router.patch("/{lending_id}", response_model=LendingResponse)
async def update_lending(
    lending_id: uuid.UUID,
    payload: LendingUpdate,
    session: AsyncSession = Depends(get_session),
) -> LendingResponse:
    result = await session.execute(select(Lending).where(Lending.id == lending_id))
    lending = result.scalar_one_or_none()
    if not lending:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Lending not found", "code": "LENDING_NOT_FOUND"},
        )
    if payload.person_name is not None:
        lending.person_name = payload.person_name
    if payload.amount is not None:
        lending.amount = payload.amount
    if payload.date is not None:
        lending.date = payload.date
    if payload.note is not None:
        lending.note = payload.note
    if payload.amount_repaid is not None:
        lending.amount_repaid = min(payload.amount_repaid, lending.amount)
    if payload.status is not None:
        lending.status = payload.status
    else:
        lending.status = _compute_status(lending.amount, lending.amount_repaid)
    await session.commit()
    await session.refresh(lending)
    return LendingResponse.model_validate(lending)


@router.delete("/{lending_id}", status_code=204)
async def delete_lending(
    lending_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    result = await session.execute(select(Lending).where(Lending.id == lending_id))
    lending = result.scalar_one_or_none()
    if not lending:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Lending not found", "code": "LENDING_NOT_FOUND"},
        )
    await session.delete(lending)
    await session.commit()