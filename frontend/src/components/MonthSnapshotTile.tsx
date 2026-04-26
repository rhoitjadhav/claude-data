import { TrendingDown, TrendingUp } from 'lucide-react'
import { type MonthSnapshot } from '../api/stats'
import { MONO } from '../lib/theme'
import { formatCurrency } from '../lib/utils'

interface Props {
  data?: MonthSnapshot
  isLoading: boolean
}

export default function MonthSnapshotTile({ data, isLoading }: Props) {
  if (isLoading) return <div style={{ height: 200, background: 'var(--surface)', borderRadius: 16, marginBottom: 20 }} className="animate-pulse" />
  if (!data) return null

  const pct = parseFloat(data.pct_change)
  const isLess = pct < 0
  const totalDays = data.days_elapsed + data.days_left
  const progressPct = Math.min((data.days_elapsed / totalDays) * 100, 100)
  const projected = data.days_elapsed > 0
    ? Math.round((parseFloat(data.current_total) / data.days_elapsed) * totalDays)
    : 0

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 60%, var(--bg)) 100%)',
      borderRadius: 16,
      padding: '28px 32px',
      position: 'relative',
      overflow: 'hidden',
      marginBottom: 20,
    }}>
      {/* Texture circles */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -80, right: 80, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, position: 'relative' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '.08em', marginBottom: 4 }}>CURRENT MONTH SNAPSHOT</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{data.month_name} {new Date().getFullYear()}</div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 99,
          background: isLess ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)',
          border: `1px solid ${isLess ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
        }}>
          {isLess ? <TrendingDown size={13} color="#4ade80" /> : <TrendingUp size={13} color="#f87171" />}
          <span style={{ fontSize: 13, fontWeight: 700, color: isLess ? '#4ade80' : '#f87171' }}>
            {isLess ? '' : '+'}{pct.toFixed(1)}% vs last month
          </span>
        </div>
      </div>

      {/* Hero spend */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '18px 0 6px', position: 'relative' }}>
        <span style={{ ...MONO, fontSize: 52, fontWeight: 700, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>
          {formatCurrency(parseFloat(data.current_total))}
        </span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500, paddingBottom: 4 }}>
          spent · proj.{' '}
          <span style={{ ...MONO, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{formatCurrency(projected)}</span>
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 6, position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Month progress</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
            Day {data.days_elapsed} of {totalDays} · <span style={{ color: 'rgba(255,255,255,0.9)' }}>{data.days_left} days left</span>
          </span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progressPct}%`,
            background: 'rgba(255,255,255,0.85)',
            borderRadius: 99, transition: 'width .6s ease',
            boxShadow: '0 0 12px rgba(255,255,255,0.4)',
          }} />
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', flex: 1, minWidth: 180 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f472b6', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '.06em', marginBottom: 2 }}>TOP DRAIN</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
              {data.top_category}
              <span style={{ ...MONO, color: 'rgba(255,255,255,0.7)', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
                · {formatCurrency(parseFloat(data.top_category_amount))}
              </span>
            </div>
          </div>
        </div>
        {data.biggest_jump_category && parseFloat(data.biggest_jump_amount) > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', flex: 1, minWidth: 180 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
            </svg>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '.06em', marginBottom: 2 }}>BIGGEST JUMP</div>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>
                {data.biggest_jump_category}
                <span style={{ ...MONO, color: '#f97316', fontWeight: 600, fontSize: 12, marginLeft: 6 }}>
                  +{formatCurrency(parseFloat(data.biggest_jump_amount))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
