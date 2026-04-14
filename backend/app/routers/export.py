import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.transaction import Transaction
from app.routers.transactions import build_filters

router = APIRouter(prefix="/api/v1/export", tags=["Export"])


@router.get("/csv")
async def export_csv(
    category: str | None = Query(None),
    start: date | None = Query(None),
    end: date | None = Query(None),
    search: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    filters = build_filters(Transaction, category, start, end, search)
    result = await session.execute(
        select(Transaction).where(*filters).order_by(Transaction.date.desc())
    )
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["Date", "Description", "Merchant", "Amount", "Category", "Account", "Note", "Source"],
    )
    writer.writeheader()
    for txn in transactions:
        writer.writerow(
            {
                "Date": txn.date.isoformat(),
                "Description": txn.description,
                "Merchant": txn.merchant,
                "Amount": str(txn.amount),
                "Category": txn.category,
                "Account": txn.account,
                "Note": txn.note or "",
                "Source": txn.source,
            }
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )