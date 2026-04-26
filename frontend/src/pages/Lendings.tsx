import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLendings, createLending, updateLending, deleteLending, type Lending } from '../api/lendings'
import { C, MONO, inp } from '../lib/theme'
import { formatCurrency } from '../lib/utils'

const AVATAR_COLORS = ['#6366f1','#8b5cf6','#f97316','#14b8a6','#f43f5e','#60a5fa','#a78bfa','#fbbf24']

const STATUS_CONFIG = {
  settled:     { label: 'Settled',     bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.3)',  color: '#4ade80', dot: '#4ade80' },
  partial:     { label: 'Partial',     bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  color: '#fbbf24', dot: '#fbbf24' },
  outstanding: { label: 'Outstanding', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)', color: '#f87171', dot: '#f87171' },
} as const

const FILTERS = [
  { id: 'all',         label: 'All' },
  { id: 'outstanding', label: 'Outstanding' },
  { id: 'partial',     label: 'Partial' },
  { id: 'settled',     label: 'Settled' },
]

const today = () => new Date().toISOString().slice(0, 10)

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--t4)', letterSpacing: '.04em', marginBottom: 4, display: 'block' }

interface CardProps {
  lending: Lending
  idx: number
  onUpdate: (payload: Parameters<typeof updateLending>[1]) => void
  onDelete: () => void
}

function LendingCard({ lending, idx, onUpdate, onDelete }: CardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    person_name: lending.person_name,
    amount: lending.amount,
    amount_repaid: lending.amount_repaid,
    date: lending.date,
    status: lending.status as 'outstanding' | 'partial' | 'settled',
    note: lending.note ?? '',
  })

  const amount = parseFloat(lending.amount)
  const repaid = parseFloat(lending.amount_repaid)
  const outstanding = parseFloat(lending.amount_outstanding)
  const pct = amount > 0 ? Math.round((repaid / amount) * 100) : 100
  const sc = STATUS_CONFIG[lending.status]
  const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length]

  const openEdit = () => {
    setDraft({ person_name: lending.person_name, amount: lending.amount, amount_repaid: lending.amount_repaid, date: lending.date, status: lending.status as 'outstanding' | 'partial' | 'settled', note: lending.note ?? '' })
    setEditing(true)
  }
  const saveEdit = () => {
    onUpdate({
      person_name: draft.person_name,
      amount: parseFloat(draft.amount),
      amount_repaid: parseFloat(draft.amount_repaid),
      date: draft.date,
      status: draft.status,
      note: draft.note,
    })
    setEditing(false)
  }

  // Progress bar color
  const barBg = lending.status === 'settled'
    ? 'linear-gradient(90deg,#4ade80,#22c55e)'
    : lending.status === 'partial'
    ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
    : 'transparent'

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${editing ? 'var(--accent)' : C.border}`,
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      transition: 'background .25s, box-shadow .2s, border-color .2s',
      boxShadow: editing ? '0 0 0 3px var(--accent-sub)' : '0 1px 3px rgba(0,0,0,0.08)',
    }}
      onMouseEnter={e => { if (!editing) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { if (!editing) { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.transform = 'none' } }}
    >
      {editing ? (
        <>
          {/* Edit mode header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.accentL }}>Edit Lending</span>
            <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.t4, display: 'flex', padding: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {/* Edit fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>PERSON NAME</label>
              <input style={inp} value={draft.person_name}
                onChange={e => setDraft(d => ({ ...d, person_name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>TOTAL AMOUNT (₹)</label>
              <input style={inp} type="number" min="0" value={draft.amount}
                onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>REPAID SO FAR (₹)</label>
              <input style={inp} type="number" min="0" value={draft.amount_repaid}
                onChange={e => setDraft(d => ({ ...d, amount_repaid: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>LEND DATE</label>
              <input style={{ ...inp, colorScheme: 'auto' as const }} type="date" value={draft.date}
                onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>STATUS</label>
              <select style={{ ...inp, cursor: 'pointer', appearance: 'none' as const }} value={draft.status}
                onChange={e => setDraft(d => ({ ...d, status: e.target.value as 'outstanding' | 'partial' | 'settled' }))}>
                <option value="outstanding">Outstanding</option>
                <option value="partial">Partial</option>
                <option value="settled">Settled</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>NOTE</label>
              <input style={inp} value={draft.note}
                onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
                placeholder="Add a note…" />
            </div>
          </div>
          {/* Progress preview */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.t4, marginBottom: 5 }}>
              <span>Repaid {parseFloat(draft.amount) > 0 ? Math.round((parseFloat(draft.amount_repaid) / parseFloat(draft.amount)) * 100) : 0}%</span>
              <span style={MONO}>{formatCurrency(parseFloat(draft.amount_repaid) || 0)} of {formatCurrency(parseFloat(draft.amount) || 0)}</span>
            </div>
            <div style={{ height: 6, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${parseFloat(draft.amount) > 0 ? Math.min((parseFloat(draft.amount_repaid) / parseFloat(draft.amount)) * 100, 100) : 0}%`, background: 'var(--grad)', borderRadius: 99, transition: 'width .3s' }} />
            </div>
          </div>
          {/* Edit actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={onDelete}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 7, border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', fontSize: 12, cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              Delete
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(false)}
                style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.t3, fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveEdit}
                style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: 'var(--grad)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 10px rgba(99,102,241,0.3)' }}>
                Save
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* View mode — header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, letterSpacing: 0.5 }}>
              {getInitials(lending.person_name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 2 }}>{lending.person_name}</div>
              <div style={{ fontSize: 11, color: C.t4, display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {new Date(lending.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 99, background: sc.bg, border: `1px solid ${sc.border}`, fontSize: 11, fontWeight: 600, color: sc.color, whiteSpace: 'nowrap' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
              {sc.label}
            </span>
            <button onClick={openEdit}
              style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.t4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-l)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.t4 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>

          {/* Progress bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <span style={{ fontSize: 11, color: C.t4, fontWeight: 500 }}>Repaid {pct}%</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ ...MONO, fontSize: 12, color: C.t3 }}>{formatCurrency(repaid)}</span>
                <span style={{ fontSize: 11, color: C.t5 }}>of</span>
                <span style={{ ...MONO, fontSize: 12, color: C.t2, fontWeight: 600 }}>{formatCurrency(amount)}</span>
              </div>
            </div>
            <div style={{ height: 7, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: barBg, borderRadius: 99, transition: 'width .5s ease' }} />
            </div>
          </div>

          {/* Outstanding */}
          {outstanding > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 9, padding: '9px 14px' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#f87171', letterSpacing: '.06em', marginBottom: 2 }}>OUTSTANDING</div>
                <div style={{ ...MONO, fontSize: 20, fontWeight: 700, color: '#f87171' }}>{formatCurrency(outstanding)}</div>
              </div>
              <button
                onClick={() => onUpdate({ status: 'settled', amount_repaid: parseFloat(lending.amount) })}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)', color: '#4ade80', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,222,128,0.15)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,222,128,0.08)' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Mark Settled
              </button>
            </div>
          )}

          {/* Note */}
          {lending.note && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.t5} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span style={{ fontSize: 12, color: C.t4, lineHeight: 1.45, fontStyle: 'italic' }}>{lending.note}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function Lendings() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ person_name: '', amount: '', date: today(), note: '' })
  const [statusFilter, setStatusFilter] = useState('all')
  const [reminded] = useState<string | null>(null)

  const { data: lendings = [], isLoading } = useQuery({
    queryKey: ['lendings'],
    queryFn: () => fetchLendings(),
  })

  const createMut = useMutation({
    mutationFn: createLending,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lendings'] })
      setShowForm(false)
      setForm({ person_name: '', amount: '', date: today(), note: '' })
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateLending>[1] }) =>
      updateLending(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lendings'] }),
  })

  const deleteMut = useMutation({
    mutationFn: deleteLending,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lendings'] }),
  })

  const totalLent = lendings.reduce((s, l) => s + parseFloat(l.amount), 0)
  const totalOutstanding = lendings.reduce((s, l) => s + parseFloat(l.amount_outstanding), 0)
  const totalSettled = lendings.filter(l => l.status === 'settled').reduce((s, l) => s + parseFloat(l.amount), 0)

  const filtered = statusFilter === 'all' ? lendings : lendings.filter(l => l.status === statusFilter)

  const STAT_TILES = [
    { label: 'Total Lent',   value: formatCurrency(totalLent),        color: C.accentL,  bg: C.accentSub,
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { label: 'Outstanding',  value: formatCurrency(totalOutstanding),  color: '#f87171',  bg: 'rgba(248,113,113,0.1)',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
    { label: 'Settled',      value: formatCurrency(totalSettled),      color: '#4ade80',  bg: 'rgba(74,222,128,0.1)',
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> },
  ]

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.t1, margin: 0, letterSpacing: '-0.5px' }}>Lendings</h1>
          <p style={{ fontSize: 14, color: C.t4, margin: '4px 0 0' }}>{lendings.length} people · track money you've lent</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: 'none', background: 'var(--grad)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Lending
        </button>
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {STAT_TILES.map(t => (
          <div key={t.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 13, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, transition: 'background .25s' }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: t.bg, color: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {t.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.t4, letterSpacing: '.04em', marginBottom: 4 }}>{t.label}</div>
              <div style={{ ...MONO, fontSize: 20, fontWeight: 700, color: t.color }}>{t.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: C.t2, marginBottom: 16 }}>New Lending</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>PERSON</label>
              <input style={inp} value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))} placeholder="Friend's name" />
            </div>
            <div>
              <label style={labelStyle}>AMOUNT (₹)</label>
              <input style={inp} type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>DATE</label>
              <input style={{ ...inp, colorScheme: 'dark' } as React.CSSProperties} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>NOTE (OPTIONAL)</label>
              <input style={inp} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Reason…" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)}
              style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.t3, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={() => createMut.mutate({ person_name: form.person_name, amount: parseFloat(form.amount), date: form.date, note: form.note || undefined })}
              disabled={!form.person_name || !form.amount || createMut.isPending}
              style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: 'var(--grad)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!form.person_name || !form.amount) ? 0.4 : 1 }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 5, width: 'fit-content' }}>
        {FILTERS.map(f => {
          const count = f.id === 'all' ? lendings.length : lendings.filter(l => l.status === f.id).length
          const isActive = statusFilter === f.id
          return (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: isActive ? C.accentSub : 'transparent', color: isActive ? C.accentL : C.t3, fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: 'pointer', transition: 'all .15s' }}>
              {f.label}
              <span style={{ marginLeft: 6, fontSize: 11, color: isActive ? C.accentL : C.t5 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Card grid */}
      {isLoading ? (
        <div style={{ height: 240, background: C.surface, borderRadius: 14 }} className="animate-pulse" />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: C.t5, fontSize: 14 }}>
          {statusFilter === 'all' ? 'No lendings yet. Add one above.' : `No ${statusFilter} lendings.`}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 14 }}>
          {filtered.map((l, i) => (
            <LendingCard
              key={l.id}
              lending={l}
              idx={i}
              onUpdate={payload => updateMut.mutate({ id: l.id, payload })}
              onDelete={() => { if (window.confirm(`Delete lending for ${l.person_name}?`)) deleteMut.mutate(l.id) }}
            />
          ))}
        </div>
      )}

      {/* Toast */}
      {reminded && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: '#1a1a28', border: '1px solid #2a2a3e', borderRadius: 10, padding: '12px 20px', color: '#c8c8e0', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 10000 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          Reminder sent to <strong>{reminded}</strong>
        </div>
      )}
    </div>
  )
}
