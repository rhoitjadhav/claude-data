import { useState } from 'react'
import type { CategoryStat } from '../api/stats'
import { C, MONO } from '../lib/theme'
import { CATEGORY_COLORS } from './StatsBar'

interface Props { data: CategoryStat[] | undefined; isLoading: boolean }

const fmtK = (v: number) => v >= 1000 ? '₹' + (v / 1000).toFixed(1) + 'k' : '₹' + v

interface ArcDatum { name: string; value: number; color: string; path: string }

function DonutChart({ data, hov, setHov, size = 152, thickness = 21 }: {
  data: { name: string; value: number; color: string }[]
  hov: number | null
  setHov: (i: number | null) => void
  size?: number
  thickness?: number
}) {
  const cx = size / 2, cy = size / 2
  const r = (size / 2) - thickness / 2 - 4
  const total = data.reduce((s, d) => s + d.value, 0)
  let angle = -Math.PI / 2

  const arcs: ArcDatum[] = data.map(d => {
    const sweep = (d.value / total) * Math.PI * 2
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    const a2 = angle + sweep
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
    const path = `M${x1},${y1} A${r},${r} 0 ${sweep > Math.PI ? 1 : 0},1 ${x2},${y2}`
    angle = a2
    return { ...d, path }
  })

  const hd = hov !== null ? data[hov] : null

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {arcs.map((a, i) => (
        <path
          key={i} d={a.path} fill="none" stroke={a.color}
          strokeWidth={hov === i ? thickness + 4 : thickness}
          strokeLinecap="round"
          opacity={hov === null || hov === i ? 1 : 0.3}
          style={{ transition: 'all .2s', cursor: 'default' }}
          onMouseEnter={() => setHov(i)}
          onMouseLeave={() => setHov(null)}
        />
      ))}
      {hd ? (
        <>
          <text x={cx} y={cy - 5} textAnchor="middle" fill="var(--t1)"
            fontSize="11" fontFamily="Inter,sans-serif" fontWeight="600">
            {hd.name.split(' ')[0]}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--accent-l)"
            fontSize="11" fontFamily="JetBrains Mono,monospace" fontWeight="700">
            {fmtK(hd.value)}
          </text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--t4)"
            fontSize="10" fontFamily="Inter,sans-serif">Total</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--t2)"
            fontSize="11" fontFamily="JetBrains Mono,monospace" fontWeight="700">
            {fmtK(total)}
          </text>
        </>
      )}
    </svg>
  )
}

export default function CategoryChart({ data, isLoading }: Props) {
  const [hov, setHov] = useState<number | null>(null)

  const chartData = data
    ?.map(d => ({ name: d.category, value: Number(d.total), color: CATEGORY_COLORS[d.category] ?? '#818cf8' }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10) ?? []

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', flexShrink: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.t2, marginBottom: 16 }}>Spending by Category</div>
      {isLoading ? (
        <div style={{ width: 340, height: 152, background: C.hover, borderRadius: 8 }} className="animate-pulse" />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DonutChart data={chartData} hov={hov} setHov={setHov} size={152} thickness={21} />
          <div style={{ flex: 1 }}>
            {chartData.map((c, i) => (
              <div
                key={c.name}
                style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, cursor: 'default', opacity: hov === null || hov === i ? 1 : 0.3, transition: 'opacity .2s' }}
                onMouseEnter={() => setHov(i)}
                onMouseLeave={() => setHov(null)}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.t3, flex: 1 }}>{c.name}</span>
                <span style={{ ...MONO, fontSize: 12, color: C.t2 }}>{fmtK(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
