import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayStat } from '../api/stats'
import { formatCurrency } from '../lib/utils'

interface Props { data: DayStat[] | undefined; isLoading: boolean }

export default function DailyChart({ data, isLoading }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Breakdown</h3>
      {isLoading ? <div className="h-64 bg-gray-100 rounded animate-pulse" /> : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data?.map(d => ({ ...d, total: Number(d.total) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d: string) => d.slice(5)} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: string | number) => formatCurrency(v)} />
            <Bar dataKey="total" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}