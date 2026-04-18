import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionListResponse, TransactionResponse, TransactionUpdate
from app.services.categorizer import categorize_batch

_RECATEGORIZE_BATCH = 75

router = APIRouter(prefix="/api/v1", tags=["Transactions"])


def build_filters(
    model: type,
    category: str | None,
    start: date | None,
    end: date | None,
    search: str | None,
) -> list:
    conditions: list = []
    if category:
        conditions.append(model.category == category)
    if start:
        conditions.append(model.date >= start)
    if end:
        conditions.append(model.date <= end)
    if search:
        conditions.append(model.description.ilike(f"%{search}%"))
    return conditions


@router.get("/transactions", response_model=TransactionListResponse)
async def list_transactions(
    category: str | None = Query(None),
    start: date | None = Query(None),
    end: date | None = Query(None),
    search: str | None = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> TransactionListResponse:
    filters = build_filters(Transaction, category, start, end, search)

    total_result = await session.execute(
        select(func.count(Transaction.id)).where(*filters)
    )
    total = total_result.scalar_one()

    result = await session.execute(
        select(Transaction)
        .where(*filters)
        .order_by(Transaction.date.desc())
        .limit(limit)
        .offset(offset)
    )
    items = result.scalars().all()

    return TransactionListResponse(
        items=[TransactionResponse.model_validate(t) for t in items],
        total=total,
    )


@router.patch("/transactions/{txn_id}", response_model=TransactionResponse)
async def update_transaction(
    txn_id: uuid.UUID,
    payload: TransactionUpdate,
    session: AsyncSession = Depends(get_session),
) -> TransactionResponse:
    result = await session.execute(
        select(Transaction).where(Transaction.id == txn_id)
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Transaction not found", "code": "TRANSACTION_NOT_FOUND"},
        )
    if payload.category is not None:
        txn.category = payload.category
    if payload.note is not None:
        txn.note = payload.note
    await session.commit()
    await session.refresh(txn)
    return TransactionResponse.model_validate(txn)


@router.delete("/transactions/{txn_id}", status_code=204)
async def delete_transaction(
    txn_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    result = await session.execute(
        select(Transaction).where(Transaction.id == txn_id)
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Transaction not found", "code": "TRANSACTION_NOT_FOUND"},
        )
    await session.delete(txn)
    await session.commit()


@router.post("/transactions/recategorize")
async def recategorize_transactions(
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(select(Transaction))
    txns = result.scalars().all()

    for i in range(0, len(txns), _RECATEGORIZE_BATCH):
        batch = txns[i : i + _RECATEGORIZE_BATCH]
        categories = await categorize_batch([(t.description, t.note) for t in batch])
        for txn, cat in zip(batch, categories):
            txn.category = cat

    await session.commit()
    return {"updated": len(txns)}
