import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthStat } from '../api/stats'
import { formatCurrency } from '../lib/utils'

interface Props { data: MonthStat[] | undefined; isLoading: boolean }

export default function MonthlyChart({ data, isLoading }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Spend Trend</h3>
      {isLoading ? <div className="h-64 bg-gray-100 rounded animate-pulse" /> : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data?.map(d => ({ ...d, total: Number(d.total) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: string | number) => formatCurrency(v)} />
            <Line type="monotone" dataKey="total" stroke="#0ea5e9" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
