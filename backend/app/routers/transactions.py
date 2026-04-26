import asyncio
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete as sql_delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.transaction import Transaction
from app.schemas.transaction import BulkDeleteRequest, TransactionCreate, TransactionListResponse, TransactionResponse, TransactionUpdate
from app.workers.pdf_worker import _extract_merchant
from app.services.categorizer import categorize_batch

_RECATEGORIZE_BATCH = 25

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
        conditions.append(
            model.description.ilike(f"%{search}%") | model.note.ilike(f"%{search}%")
        )
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

    agg_result = await session.execute(
        select(func.count(Transaction.id), func.sum(Transaction.amount)).where(*filters)
    )
    total, total_amount = agg_result.one()

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
        total_amount=float(total_amount or 0),
    )


@router.post("/transactions", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    payload: TransactionCreate,
    session: AsyncSession = Depends(get_session),
) -> TransactionResponse:
    category = payload.category
    if not category:
        results = await categorize_batch([(payload.description, payload.note)])
        category = results[0]

    txn = Transaction(
        source="manual",
        date=payload.date,
        description=payload.description,
        merchant=_extract_merchant(payload.description),
        amount=abs(payload.amount),
        category=category,
        account=payload.account,
        note=payload.note,
    )
    session.add(txn)
    await session.commit()
    await session.refresh(txn)
    return TransactionResponse.model_validate(txn)


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


@router.post("/transactions/bulk-delete")
async def bulk_delete_transactions(
    payload: BulkDeleteRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    result = await session.execute(
        sql_delete(Transaction).where(Transaction.id.in_(payload.ids))
    )
    await session.commit()
    return {"deleted": result.rowcount}


@router.post("/transactions/recategorize")
async def recategorize_transactions(
    only_uncategorized: bool = False,
    session: AsyncSession = Depends(get_session),
) -> dict:
    query = select(Transaction.id, Transaction.description, Transaction.note)
    if only_uncategorized:
        query = query.where(
            (Transaction.category == None) | (Transaction.category == "Uncategorized")  # noqa: E711
        )
    result = await session.execute(query)
    rows = result.all()

    for i in range(0, len(rows), _RECATEGORIZE_BATCH):
        if i > 0:
            await asyncio.sleep(2)  # avoid Groq token-per-minute rate limit
        batch = rows[i : i + _RECATEGORIZE_BATCH]
        categories = await categorize_batch([(r.description, r.note) for r in batch])
        for row, cat in zip(batch, categories):
            await session.execute(
                update(Transaction).where(Transaction.id == row.id).values(category=cat)
            )
        await session.commit()

    return {"updated": len(rows)}
