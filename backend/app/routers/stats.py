import calendar
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.transaction import Transaction
from app.routers.transactions import build_filters
from app.schemas.stats import CategoryStat, DayStat, MerchantStat, MonthSnapshot, MonthStat, SummaryStats

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


@router.get("/month-snapshot", response_model=MonthSnapshot)
async def month_snapshot(
    session: AsyncSession = Depends(get_session),
) -> MonthSnapshot:
    today = date.today()
    curr_start = today.replace(day=1)

    # Same period last month
    last_month = today.month - 1 or 12
    last_year = today.year if today.month > 1 else today.year - 1
    last_day = min(today.day, calendar.monthrange(last_year, last_month)[1])
    last_start = date(last_year, last_month, 1)
    last_end = date(last_year, last_month, last_day)

    days_in_month = calendar.monthrange(today.year, today.month)[1]

    async def _total(start: date, end: date) -> Decimal:
        r = await session.execute(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(Transaction.date >= start, Transaction.date <= end)
        )
        return Decimal(str(r.scalar_one()))

    async def _by_cat(start: date, end: date) -> dict[str, Decimal]:
        r = await session.execute(
            select(Transaction.category, func.sum(Transaction.amount).label("total"))
            .where(Transaction.date >= start, Transaction.date <= end)
            .group_by(Transaction.category)
        )
        return {row.category: Decimal(str(row.total)) for row in r.all()}

    curr_total = await _total(curr_start, today)
    last_total = await _total(last_start, last_end)
    curr_cats = await _by_cat(curr_start, today)
    last_cats = await _by_cat(last_start, last_end)

    pct_change = (
        ((curr_total - last_total) / last_total * 100).quantize(Decimal("0.1"))
        if last_total > 0 else Decimal("0")
    )

    top_cat = max(curr_cats, key=lambda k: curr_cats[k]) if curr_cats else "—"
    top_amt = curr_cats.get(top_cat, Decimal("0"))
    top_pct = (top_amt / curr_total * 100).quantize(Decimal("0.1")) if curr_total > 0 else Decimal("0")

    # Biggest jump: category with largest absolute increase vs last month
    jump_cat = None
    jump_amt = Decimal("0")
    for cat, amt in curr_cats.items():
        diff = amt - last_cats.get(cat, Decimal("0"))
        if diff > jump_amt:
            jump_amt = diff
            jump_cat = cat

    return MonthSnapshot(
        month_name=today.strftime("%B"),
        days_elapsed=today.day,
        days_left=days_in_month - today.day,
        current_total=curr_total,
        last_month_total=last_total,
        pct_change=pct_change,
        top_category=top_cat,
        top_category_amount=top_amt,
        top_category_pct=top_pct,
        biggest_jump_category=jump_cat,
        biggest_jump_amount=jump_amt.quantize(Decimal("0.01")),
    )


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