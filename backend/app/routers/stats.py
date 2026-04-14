from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.transaction import Transaction
from app.routers.transactions import build_filters
from app.schemas.stats import CategoryStat, DayStat, MerchantStat, MonthStat, SummaryStats

router = APIRouter(prefix="/api/v1/stats", tags=["Stats"])


def _common_filters(
    category: str | None = Query(None),
    start: date | None = Query(None),
    end: date | None = Query(None),
    search: str | None = Query(None),
) -> list:
    return build_filters(Transaction, category, start, end, search)


@router.get("/summary", response_model=SummaryStats)
async def summary(
    filters: list = Depends(_common_filters),
    session: AsyncSession = Depends(get_session),
) -> SummaryStats:
    result = await session.execute(
        select(
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
            func.count(Transaction.id).label("count"),
            func.coalesce(func.min(Transaction.date), func.current_date()).label("min_date"),
            func.coalesce(func.max(Transaction.date), func.current_date()).label("max_date"),
        ).where(*filters)
    )
    row = result.one()
    total = Decimal(str(row.total))
    count = int(row.count)
    if count == 0:
        return SummaryStats(
            total_spend=Decimal("0"),
            transaction_count=0,
            avg_per_month=Decimal("0"),
            avg_per_day=Decimal("0"),
        )

    days = max((row.max_date - row.min_date).days, 1)
    months = max(days / 30, 1)

    return SummaryStats(
        total_spend=total,
        transaction_count=count,
        avg_per_month=(total / Decimal(str(months))).quantize(Decimal("0.01")),
        avg_per_day=(total / Decimal(str(days))).quantize(Decimal("0.01")),
    )


@router.get("/by-category", response_model=list[CategoryStat])
async def by_category(
    filters: list = Depends(_common_filters),
    session: AsyncSession = Depends(get_session),
) -> list[CategoryStat]:
    result = await session.execute(
        select(
            Transaction.category,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(*filters)
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    )
    return [
        CategoryStat(category=row.category, total=Decimal(str(row.total)), count=row.count)
        for row in result.all()
    ]


@router.get("/by-month", response_model=list[MonthStat])
async def by_month(
    filters: list = Depends(_common_filters),
    session: AsyncSession = Depends(get_session),
) -> list[MonthStat]:
    result = await session.execute(
        select(
            func.to_char(Transaction.date, "YYYY-MM").label("month"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(*filters)
        .group_by("month")
        .order_by("month")
    )
    return [
        MonthStat(month=row.month, total=Decimal(str(row.total)), count=row.count)
        for row in result.all()
    ]


@router.get("/by-day", response_model=list[DayStat])
async def by_day(
    filters: list = Depends(_common_filters),
    session: AsyncSession = Depends(get_session),
) -> list[DayStat]:
    result = await session.execute(
        select(
            func.to_char(Transaction.date, "YYYY-MM-DD").label("day"),
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(*filters)
        .group_by("day")
        .order_by("day")
    )
    return [
        DayStat(day=row.day, total=Decimal(str(row.total)), count=row.count)
        for row in result.all()
    ]


@router.get("/top-merchants", response_model=list[MerchantStat])
async def top_merchants(
    limit: int = Query(10, ge=1, le=50),
    filters: list = Depends(_common_filters),
    session: AsyncSession = Depends(get_session),
) -> list[MerchantStat]:
    result = await session.execute(
        select(
            Transaction.merchant,
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count"),
        )
        .where(*filters)
        .group_by(Transaction.merchant)
        .order_by(func.sum(Transaction.amount).desc())
        .limit(limit)
    )
    return [
        MerchantStat(merchant=row.merchant, total=Decimal(str(row.total)), count=row.count)
        for row in result.all()
    ]