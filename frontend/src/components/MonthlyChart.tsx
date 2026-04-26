import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthStat } from '../api/stats'
import { C, MONO } from '../lib/theme'
import { useThemeStore } from '../store/themeStore'

interface Props { data: MonthStat[] | undefined; isLoading: boolean }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
      {label && <div style={{ color: C.t4, marginBottom: 4 }}>{label}</div>}
      <div style={{ ...MONO, color: 'var(--accent-l)', fontWeight: 600 }}>
        ₹{v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}
      </div>
    </div>
  )
}

export default function MonthlyChart({ data, isLoading }: Props) {
  const isDark = useThemeStore(s => s.isDark)
  const grid = isDark ? '#1a2428' : '#d8eaee'
  const tick = isDark ? '#486870' : '#708090'
  const accent = isDark ? '#2dd4bf' : '#0891b2'
  const accentDot = isDark ? '#5eead4' : '#22d3ee'

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.t2 }}>Monthly Trend</span>
        <span style={{ fontSize: 12, color: C.t5 }}>{data?.length ?? 0} months</span>
      </div>
      {isLoading ? <div style={{ height: 160, background: C.hover, borderRadius: 8 }} className="animate-pulse" /> : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data?.map(d => ({ ...d, total: Number(d.total) }))} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: tick, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: tick, fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone" dataKey="total" stroke={accent} strokeWidth={2.5}
              dot={{ fill: accent, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: accentDot }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}