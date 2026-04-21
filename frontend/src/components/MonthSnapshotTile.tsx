import { TrendingDown, TrendingUp } from 'lucide-react'
import { type MonthSnapshot } from '../api/stats'
import { formatCurrency } from '../lib/utils'

interface Props {
  data?: MonthSnapshot
  isLoading: boolean
}

export default function MonthSnapshotTile({ data, isLoading }: Props) {
  if (isLoading) return <div className="h-32 bg-gray-100 rounded-xl animate-pulse mb-5" />
  if (!data) return null

  const pct = parseFloat(data.pct_change)
  const isLess = pct < 0
  const progressPct = Math.min((data.days_elapsed / (data.days_elapsed + data.days_left)) * 100, 100)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{data.month_name} so far</span>
            <span className="text-xs text-gray-400">{data.days_left} days left</span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(parseFloat(data.current_total))}</span>
            <span className="text-sm text-gray-400">vs {formatCurrency(parseFloat(data.last_month_total))} last month</span>
          </div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold ${isLess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {isLess ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
          {isLess ? '' : '+'}{pct.toFixed(1)}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4">
        <div
          className="bg-brand-500 h-1.5 rounded-full transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Bottom row */}
      <div className="flex gap-6 text-xs">
        <div>
          <span className="text-gray-400">Top drain </span>
          <span className="font-medium text-gray-700">{data.top_category}</span>
          <span className="text-gray-400"> · {formatCurrency(parseFloat(data.top_category_amount))} ({data.top_category_pct}%)</span>
        </div>
        {data.biggest_jump_category && parseFloat(data.biggest_jump_amount) > 0 && (
          <div>
            <span className="text-gray-400">Biggest jump </span>
            <span className="font-medium text-red-600">{data.biggest_jump_category}</span>
            <span className="text-gray-400"> · ↑{formatCurrency(parseFloat(data.biggest_jump_amount))}</span>
          </div>
        )}
      </div>
    </div>
  )
}
