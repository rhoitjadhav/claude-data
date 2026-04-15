import { formatCurrency } from '../lib/utils'
import type { SummaryStats } from '../api/stats'

interface Props { data: SummaryStats | undefined; isLoading: boolean }

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function StatsBar({ data, isLoading }: Props) {
  if (isLoading) return <div className="grid grid-cols-4 gap-4 mb-5">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
  if (!data) return null
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
      <StatCard label="Total Spend" value={formatCurrency(data.total_spend)} />
      <StatCard label="Transactions" value={data.transaction_count.toString()} />
      <StatCard label="Avg / Month" value={formatCurrency(data.avg_per_month)} />
      <StatCard label="Avg / Day" value={formatCurrency(data.avg_per_day)} />
    </div>
  )
}
