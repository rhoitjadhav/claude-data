from decimal import Decimal

from pydantic import BaseModel


class SummaryStats(BaseModel):
    total_spend: Decimal
    transaction_count: int
    avg_per_month: Decimal
    avg_per_day: Decimal


class CategoryStat(BaseModel):
    category: str
    total: Decimal
    count: int


class MonthStat(BaseModel):
    month: str  # "2025-01"
    total: Decimal
    count: int


class DayStat(BaseModel):
    day: str  # "2025-01-15"
    total: Decimal
    count: int


class MerchantStat(BaseModel):
    merchant: str
    total: Decimal
    count: int
