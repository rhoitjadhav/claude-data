import client from './client'

export interface SummaryStats {
  total_spend: string
  transaction_count: number
  avg_per_month: string
  avg_per_day: string
}

export interface CategoryStat { category: string; total: string; count: number }
export interface MonthStat { month: string; total: string; count: number }
export interface DayStat { day: string; total: string; count: number }
export interface MerchantStat { merchant: string; total: string; count: number }

export interface StatFilters {
  category?: string
  start?: string
  end?: string
  search?: string
}

export const fetchSummary = (f: StatFilters) =>
  client.get<SummaryStats>('/stats/summary', { params: f }).then(r => r.data)

export const fetchByCategory = (f: StatFilters) =>
  client.get<CategoryStat[]>('/stats/by-category', { params: f }).then(r => r.data)

export const fetchByMonth = (f: StatFilters) =>
  client.get<MonthStat[]>('/stats/by-month', { params: f }).then(r => r.data)

export const fetchByDay = (f: StatFilters) =>
  client.get<DayStat[]>('/stats/by-day', { params: f }).then(r => r.data)

export const fetchTopMerchants = (f: StatFilters, limit = 10) =>
  client.get<MerchantStat[]>('/stats/top-merchants', { params: { ...f, limit } }).then(r => r.data)

export interface MonthSnapshot {
  month_name: string
  days_elapsed: number
  days_left: number
  current_total: string
  last_month_total: string
  pct_change: string
  top_category: string
  top_category_amount: string
  top_category_pct: string
  biggest_jump_category: string | null
  biggest_jump_amount: string
}

export const fetchMonthSnapshot = () =>
  client.get<MonthSnapshot>('/stats/month-snapshot').then(r => r.data)
