import type { MerchantStat } from '../api/stats'
import { formatCurrency } from '../lib/utils'
import { C, MONO } from '../lib/theme'

interface Props { data: MerchantStat[] | undefined; isLoading: boolean }

export default function TopMerchants({ data, isLoading }: Props) {
  const merchants = data?.slice(0, 8) ?? []
  const maxTotal = merchants[0] ? Number(merchants[0].total) : 1

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.t2 }}>Top Merchants</span>
        <span style={{ fontSize: 12, color: C.t5 }}>By total spend</span>
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => <div key={i} style={{ height: 44, background: C.hover, borderRadius: 6 }} className="animate-pulse" />)}
        </div>
      ) : (
        <div>
          {merchants.map((m, i) => {
            const pct = (Number(m.total) / maxTotal) * 100
            return (
              <div key={m.merchant} style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 10, paddingBottom: 10, borderBottom: i < merchants.length - 1 ? `1px solid ${C.borderFaint}` : 'none' }}>
                <span style={{ ...MONO, fontSize: 12, color: C.t6, fontWeight: 700, width: 24, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13.5, color: C.t2, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 12 }}>{m.merchant}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: C.t4 }}>{m.count} txns</span>
                      <span style={{ ...MONO, fontSize: 13, color: C.t1, fontWeight: 600 }}>{formatCurrency(m.total)}</span>
                    </div>
                  </div>
                  <div style={{ height: 3, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--grad)', borderRadius: 99, transition: 'width .4s ease' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}