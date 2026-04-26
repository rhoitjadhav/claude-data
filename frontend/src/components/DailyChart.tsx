import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayStat } from '../api/stats'
import { C, MONO } from '../lib/theme'
import { useThemeStore } from '../store/themeStore'

interface Props { data: DayStat[] | undefined; isLoading: boolean }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
      {label && <div style={{ color: C.t4, marginBottom: 4 }}>{label}</div>}
      <div style={{ ...MONO, color: 'var(--accent)', fontWeight: 600 }}>
        ₹{v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}
      </div>
    </div>
  )
}

export default function DailyChart({ data, isLoading }: Props) {
  const isDark = useThemeStore(s => s.isDark)
  const grid  = isDark ? '#1a2428' : '#d8eaee'
  const tick  = isDark ? '#486870' : '#708090'
  const accent = isDark ? '#14b8a6' : '#0891b2'

  const chartData = data?.map(d => ({ day: d.day.slice(5).replace('-', '/'), amount: Number(d.total) }))
  const interval = chartData ? Math.max(0, Math.floor(chartData.length / 8) - 1) : 4

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.t2 }}>Daily Spending</span>
        <span style={{ fontSize: 12, color: C.t5 }}>{chartData?.length ?? 0} days</span>
      </div>
      {isLoading ? <div style={{ height: 180, background: C.hover, borderRadius: 8 }} className="animate-pulse" /> : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={7} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false} interval={interval} />
            <YAxis tick={{ fill: tick, fontSize: 10 }} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.07)' }} />
            <Bar dataKey="amount" fill={accent} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
