import { formatCurrency } from '../lib/utils'
import type { SummaryStats, CategoryStat, MerchantStat } from '../api/stats'
import { C, MONO } from '../lib/theme'

interface Props {
  data: SummaryStats | undefined
  isLoading: boolean
  topCategory?: CategoryStat
  topMerchant?: MerchantStat
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#f97316', 'Transport': '#60a5fa', 'Groceries': '#34d399',
  'Shopping': '#f43f5e', 'Entertainment': '#a78bfa', 'Subscriptions': '#fbbf24',
  'Health': '#2dd4bf', 'Recharge': '#818cf8', 'Bill': '#fb923c', 'Rent': '#c084fc',
  'Family': '#f472b6', 'Household': '#4ade80', 'Social Life': '#38bdf8',
  'Lending': '#a3e635', 'Education': '#22d3ee', 'Finance': '#6366f1', 'Uncategorized': '#94a3b8',
}

function StatCard({ label, value, sub, color, iconBg, icon }: {
  label: string; value: React.ReactNode; sub?: string; color: string; iconBg?: string; icon: React.ReactNode
}) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0, flex: 1, marginRight: 10 }}>
          <div style={{ fontSize: 12, color: C.t4, fontWeight: 500, marginBottom: 8, letterSpacing: '0.02em' }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.3, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
          {sub && <div style={{ fontSize: 11.5, color: C.t5, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: iconBg ?? color + '1a', color }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

const RupeeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)
const PulseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)
const TagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
)
const StoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

export default function StatsBar({ data, isLoading, topCategory, topMerchant }: Props) {
  if (isLoading) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      {[...Array(4)].map((_, i) => <div key={i} style={{ height: 88, background: C.surface, borderRadius: 12 }} className="animate-pulse" />)}
    </div>
  )
  if (!data) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      <StatCard
        label="Total Spent"
        value={<span style={MONO}>{formatCurrency(data.total_spend)}</span>}
        sub={`${data.transaction_count} transactions`}
        color={C.accentL}
        iconBg={C.accentSub}
        icon={<RupeeIcon />}
      />
      <StatCard
        label="Total Transactions"
        value={data.transaction_count}
        sub="all time"
        color="#60a5fa"
        icon={<PulseIcon />}
      />
      <StatCard
        label="Top Category"
        value={topCategory?.category ?? '—'}
        sub={topCategory ? formatCurrency(topCategory.total) : undefined}
        color="#f472b6"
        icon={<TagIcon />}
      />
      <StatCard
        label="Top Merchant"
        value={topMerchant?.merchant ?? '—'}
        sub={topMerchant ? `${topMerchant.count} txns · ${formatCurrency(topMerchant.total)}` : undefined}
        color="#f97316"
        icon={<StoreIcon />}
      />
    </div>
  )
}