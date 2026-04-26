
import { useQuery } from '@tanstack/react-query'
import { fetchByCategory, fetchByDay, fetchByMonth, fetchMonthSnapshot, fetchSummary, fetchTopMerchants } from '../api/stats'
import CategoryChart from '../components/CategoryChart'
import DailyChart from '../components/DailyChart'
import FilterBar from '../components/FilterBar'
import MonthSnapshotTile from '../components/MonthSnapshotTile'
import MonthlyChart from '../components/MonthlyChart'
import StatsBar from '../components/StatsBar'
import TopMerchants from '../components/TopMerchants'
import { C } from '../lib/theme'
import { useFilterParams } from '../store/filterStore'

export default function Dashboard() {
  const filters = useFilterParams()

  const monthLabel = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' })

  const summary      = useQuery({ queryKey: ['summary', filters],      queryFn: () => fetchSummary(filters) })
  const byCategory   = useQuery({ queryKey: ['byCategory', filters],   queryFn: () => fetchByCategory(filters) })
  const byMonth      = useQuery({ queryKey: ['byMonth', filters],      queryFn: () => fetchByMonth(filters) })
  const byDay        = useQuery({ queryKey: ['byDay', filters],        queryFn: () => fetchByDay(filters) })
  const topMerchants = useQuery({ queryKey: ['topMerchants', filters], queryFn: () => fetchTopMerchants(filters) })
  const snapshot     = useQuery({ queryKey: ['monthSnapshot'],         queryFn: fetchMonthSnapshot })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.t1, margin: 0, letterSpacing: '-0.5px' }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: C.t4, margin: '4px 0 0' }}>Overview of your UPI spending activity</p>
        </div>
        <div style={{ fontSize: 12, padding: '5px 12px', borderRadius: 99, background: C.accentSub, color: C.accentL, fontWeight: 600, border: `1px solid ${C.accentBdr}` }}>
          {monthLabel}
        </div>
      </div>

      <FilterBar />

      <MonthSnapshotTile data={snapshot.data} isLoading={snapshot.isLoading} />

      <StatsBar
        data={summary.data}
        isLoading={summary.isLoading}
        topCategory={byCategory.data?.[0]}
        topMerchant={topMerchants.data?.[0]}
      />

      {/* Charts row: category (fixed) + daily (flex) */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
        <CategoryChart data={byCategory.data} isLoading={byCategory.isLoading} />
        <DailyChart data={byDay.data} isLoading={byDay.isLoading} />
      </div>

      <MonthlyChart data={byMonth.data} isLoading={byMonth.isLoading} />
      <TopMerchants data={topMerchants.data} isLoading={topMerchants.isLoading} />
    </div>
  )
}