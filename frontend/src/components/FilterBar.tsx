import { useState } from 'react'
import { C, inp } from '../lib/theme'
import { useFilterStore } from '../store/filterStore'

const CATEGORIES = [
  'Food & Dining', 'Transport', 'Groceries', 'Shopping',
  'Entertainment', 'Subscriptions', 'Health', 'Recharge', 'Bill', 'Rent', 'Family', 'Household', 'Social Life', 'Lending', 'Education', 'Finance', 'Uncategorized',
]

const PRESETS = [
  { id: 'this-month', label: 'This Month' },
  { id: 'last-3',     label: '3 Months' },
  { id: 'last-6',     label: '6 Months' },
  { id: 'this-year',  label: 'This Year' },
  { id: 'all',        label: 'All Time' },
  { id: 'custom',     label: 'Custom', chevron: true },
]

function computeStart(id: string): string {
  const d = new Date()
  if (id === 'this-month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  if (id === 'last-3') { d.setMonth(d.getMonth() - 3); return d.toISOString().slice(0, 10) }
  if (id === 'last-6') { d.setMonth(d.getMonth() - 6); return d.toISOString().slice(0, 10) }
  if (id === 'this-year') return `${d.getFullYear()}-01-01`
  return ''
}

export default function FilterBar() {
  const { category, startDate, endDate, search, preset, setCategory, setStartDate, setEndDate, setSearch, setPreset, reset } =
    useFilterStore()
  const [showCustom, setShowCustom] = useState(preset === 'custom')

  const handlePreset = (id: string) => {
    if (id === 'custom') { setShowCustom(s => !s); return }
    setShowCustom(false)
    setPreset(id, computeStart(id), '')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {/* Scrollable pill row */}
      <div style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
        <div style={{ display: 'flex', gap: 7, minWidth: 'max-content' }}>
          {PRESETS.map(p => {
            const isActive = preset === p.id
            return (
              <button
                key={p.id}
                onClick={() => handlePreset(p.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '7px 16px', borderRadius: 99, border: 'none',
                  background: isActive ? C.accent : 'transparent',
                  color: isActive ? '#fff' : C.t3,
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 2px 10px rgba(99,102,241,0.35)' : 'none',
                  outline: isActive ? 'none' : `1px solid ${C.border}`,
                  transition: 'all .18s',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.outline = `1px solid var(--accent)`
                    ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-l)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.outline = `1px solid var(--border)`
                    ;(e.currentTarget as HTMLButtonElement).style.color = C.t3
                  }
                }}
              >
                {p.label}
                {p.chevron && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: showCustom ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom date pickers */}
      {showCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.surface, border: `1px solid ${C.accentBdr}`, borderRadius: 10, flexWrap: 'wrap' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.t4} strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span style={{ fontSize: 12, color: C.t4, fontWeight: 500 }}>From</span>
          <input type="date" style={{ ...inp, width: 'auto', padding: '6px 10px', fontSize: 12 }}
            value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span style={{ fontSize: 13, color: C.t5 }}>→</span>
          <span style={{ fontSize: 12, color: C.t4, fontWeight: 500 }}>To</span>
          <input type="date" style={{ ...inp, width: 'auto', padding: '6px 10px', fontSize: 12 }}
            value={endDate} onChange={e => setEndDate(e.target.value)} />
          {(startDate || endDate) && (
            <button
              style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.t4, fontSize: 12, cursor: 'pointer' }}
              onClick={() => { setStartDate(''); setEndDate(''); setShowCustom(false); setPreset('all', '', '') }}
            >Clear</button>
          )}
        </div>
      )}

      {/* Search + category + reset */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px' }}>
        {/* Search */}
        <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.t4} strokeWidth="2"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            style={{ ...inp, paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9 }}
            placeholder="Search merchant, note…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Divider */}
        <div style={{ width: 1, height: 28, background: C.border, flexShrink: 0 }} />
        {/* Category dropdown */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.t4} strokeWidth="2"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
          </svg>
          <select
            style={{ ...inp, paddingLeft: 28, paddingRight: 26, paddingTop: 7, paddingBottom: 7, fontSize: 12, cursor: 'pointer', appearance: 'none', minWidth: 140,
              borderColor: category ? 'var(--accent)' : C.border, color: category ? C.accentL : C.t2 }}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.t4} strokeWidth="2"
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        {/* Reset */}
        {(search || category || startDate || endDate) && (
          <button
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.t4, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-l)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.t4 }}
            onClick={() => { reset(); setShowCustom(false) }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
