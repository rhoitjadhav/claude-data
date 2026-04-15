import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryStat } from '../api/stats'
import { formatCurrency } from '../lib/utils'

const COLORS = ['#0ea5e9','#f59e0b','#10b981','#8b5cf6','#ef4444','#f97316','#06b6d4','#84cc16','#ec4899','#6366f1']

interface Props { data: CategoryStat[] | undefined; isLoading: boolean }

export default function CategoryChart({ data, isLoading }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Spend by Category</h3>
      {isLoading ? <div className="h-64 bg-gray-100 rounded animate-pulse" /> : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category, percent }: { category: string; percent: number }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {data?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: string | number) => formatCurrency(v)} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
