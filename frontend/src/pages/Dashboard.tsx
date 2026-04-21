import { useQuery } from '@tanstack/react-query'
import { fetchByCategory, fetchByDay, fetchByMonth, fetchMonthSnapshot, fetchSummary, fetchTopMerchants } from '../api/stats'
import CategoryChart from '../components/CategoryChart'
import DailyChart from '../components/DailyChart'
import FilterBar from '../components/FilterBar'
import MonthSnapshotTile from '../components/MonthSnapshotTile'
import MonthlyChart from '../components/MonthlyChart'
import StatsBar from '../components/StatsBar'
import TopMerchants from '../components/TopMerchants'
import { useFilterParams } from "../store/filterStore"

export default function Dashboard() {
  const filters = useFilterParams()

  const summary = useQuery({ queryKey: ['summary', filters], queryFn: () => fetchSummary(filters) })
  const byCategory = useQuery({ queryKey: ['byCategory', filters], queryFn: () => fetchByCategory(filters) })
  const byMonth = useQuery({ queryKey: ['byMonth', filters], queryFn: () => fetchByMonth(filters) })
  const byDay = useQuery({ queryKey: ['byDay', filters], queryFn: () => fetchByDay(filters) })
  const topMerchants = useQuery({ queryKey: ['topMerchants', filters], queryFn: () => fetchTopMerchants(filters) })
  const snapshot = useQuery({ queryKey: ['monthSnapshot'], queryFn: fetchMonthSnapshot })

  return (
    <div>
      <FilterBar />
      <StatsBar data={summary.data} isLoading={summary.isLoading} />
      <MonthSnapshotTile data={snapshot.data} isLoading={snapshot.isLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <CategoryChart data={byCategory.data} isLoading={byCategory.isLoading} />
        <MonthlyChart data={byMonth.data} isLoading={byMonth.isLoading} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <DailyChart data={byDay.data} isLoading={byDay.isLoading} />
        </div>
        <TopMerchants data={topMerchants.data} isLoading={topMerchants.isLoading} />
      </div>
    </div>
  )
}
