import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryStat } from '../api/stats'
import { formatCurrency } from '../lib/utils'

const COLORS = ['#0ea5e9','#f59e0b','#10b981','#8b5cf6','#ef4444','#f97316','#06b6d4','#84cc16','#ec4899','#6366f1']

interface Props { data: CategoryStat[] | undefined; isLoading: boolean }

export default function CategoryChart({ data, isLoading }: Props) {
  const chartData = data?.map(d => ({ ...d, total: Number(d.total) }))
  const total = chartData?.reduce((sum, d) => sum + d.total, 0) ?? 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Spend by Category</h3>
      {isLoading ? <div className="h-64 bg-gray-100 rounded animate-pulse" /> : (
        <div className="flex gap-4 items-start">
          <div className="shrink-0" style={{ width: 180, height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                  {chartData?.map((entry, i) => <Cell key={entry.category} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: string | number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex-1 space-y-1.5 min-w-0 mt-1">
            {chartData?.map((entry, i) => (
              <li key={entry.category} className="flex items-center justify-between gap-2 text-xs min-w-0">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="truncate text-gray-700">{entry.category}</span>
                </span>
                <span className="shrink-0 font-medium text-gray-900">
                  {total > 0 ? `${((entry.total / total) * 100).toFixed(0)}%` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
