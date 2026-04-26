import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, HandCoins, MoreVertical, Pencil, Trash2, X } from 'lucide-react'
import { createLending } from '../api/lendings'
import { bulkDeleteTransactions, deleteTransaction, fetchTransactions, updateTransaction, type Transaction } from '../api/transactions'
import { useFilterParams } from '../store/filterStore'
import { formatCurrency } from '../lib/utils'
import { C, inp, MONO } from '../lib/theme'

const CATEGORIES = ['Food & Dining','Transport','Groceries','Shopping','Entertainment','Subscriptions','Health','Recharge','Bill','Rent','Family','Household','Social Life','Lending','Education','Finance','Uncategorized']

export const CAT_COLORS: Record<string, string> = {
  'Food & Dining':  '#f97316',
  'Transport':      '#60a5fa',
  'Groceries':      '#4ade80',
  'Shopping':       '#f472b6',
  'Entertainment':  '#a78bfa',
  'Subscriptions':  '#818cf8',
  'Health':         '#34d399',
  'Recharge':       '#fbbf24',
  'Bill':           '#fb923c',
  'Rent':           '#e879f9',
  'Family':         '#f9a8d4',
  'Household':      '#86efac',
  'Social Life':    '#c084fc',
  'Lending':        '#f87171',
  'Education':      '#67e8f9',
  'Finance':        '#94a3b8',
  'Uncategorized':  '#6b7280',
}

function CategoryBadge({ cat, onClick }: { cat: string; onClick?: () => void }) {
  const color = CAT_COLORS[cat] ?? '#94a3b8'
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 99,
        background: color + '18', border: `1px solid ${color}40`,
        fontSize: 12, fontWeight: 500, color,
        whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {cat}
    </span>
  )
}

function extractPerson(description: string): string {
  const prefixes = ['payment to ', 'paid to ', 'transfer to ', 'upi payment to ', 'sent to ']
  const lower = description.toLowerCase()
  for (const p of prefixes) {
    if (lower.startsWith(p)) return description.slice(p.length).split(' ').slice(0, 3).join(' ')
  }
  return description.split(' ').slice(0, 3).join(' ')
}

export default function TransactionTable() {
  const filters = useFilterParams()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const [lendingTxn, setLendingTxn] = useState<Transaction | null>(null)
  const [lendingForm, setLendingForm] = useState({ person_name: '', note: '' })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ note: string; category: string }>({ note: '', category: '' })
  const menuRef = useRef<HTMLTableCellElement>(null)
  const limit = 50

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: () => fetchTransactions({ ...filters, limit, offset: page * limit }),
  })

  useEffect(() => { setPage(0) }, [filters])
  useEffect(() => { setSelectedIds(new Set()) }, [filters, page])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const deleteMut = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    onError: () => alert('Failed to delete transaction. Please try again.'),
  })

  const bulkDeleteMut = useMutation({
    mutationFn: bulkDeleteTransactions,
    onSuccess: () => {
      setSelectedIds(new Set())
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: () => alert('Failed to delete transactions. Please try again.'),
  })

  const pageIds = data?.items.map(t => t.id) ?? []
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))
  const somePageSelected = pageIds.some(id => selectedIds.has(id))

  const toggleAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const next = new Set(prev); pageIds.forEach(id => next.delete(id)); return next })
    } else {
      setSelectedIds(prev => new Set([...prev, ...pageIds]))
    }
  }

  const toggleOne = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  const handleBulkDelete = () => {
    const count = selectedIds.size
    if (window.confirm(`Delete ${count} transaction${count !== 1 ? 's' : ''}? This cannot be undone.`)) {
      bulkDeleteMut.mutate([...selectedIds])
    }
  }

  const updateMut = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; category?: string; note?: string }) => updateTransaction(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    onError: () => alert('Failed to update. Please try again.'),
  })

  const startEdit = (txn: Transaction) => {
    setEditingRowId(txn.id)
    setEditForm({ note: txn.note ?? '', category: txn.category })
    setMenuOpen(null)
  }

  const saveEdit = () => {
    if (!editingRowId) return
    updateMut.mutate({ id: editingRowId, note: editForm.note, category: editForm.category })
    setEditingRowId(null)
  }

  const cancelEdit = () => setEditingRowId(null)

  const markLendingMut = useMutation({
    mutationFn: async ({ txn, person_name, note }: { txn: Transaction; person_name: string; note: string }) => {
      await createLending({
        person_name,
        amount: parseFloat(txn.amount),
        date: txn.date,
        note: note || undefined,
        linked_transaction_id: txn.id,
      })
      await updateTransaction(txn.id, { category: 'Lending' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['lendings'] })
      setLendingTxn(null)
    },
    onError: () => alert('Failed to mark as lending. Please try again.'),
  })

  const openLendingPanel = (txn: Transaction) => {
    setLendingTxn(txn)
    setLendingForm({ person_name: extractPerson(txn.description), note: txn.note ?? '' })
    setMenuOpen(null)
  }

  if (isLoading) return <div style={{ height: 384, background: C.surface, borderRadius: 12 }} className="animate-pulse" />

  const TH = ({ children }: { children?: React.ReactNode }) => (
    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.t4, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{children}</th>
  )

  return (
    <>
      <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.hover, borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '10px 16px', width: 32 }}>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                    onChange={toggleAll}
                    style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </th>
                {['Date','Description','Note','Merchant','Amount','Category','Account',''].map(h => <TH key={h}>{h}</TH>)}
              </tr>
            </thead>
            <tbody>
              {data?.items.map(txn => {
                const selected = selectedIds.has(txn.id)
                return (
                  <tr
                    key={txn.id}
                    style={{ borderBottom: `1px solid ${C.borderFaint}`, background: selected ? C.accentSub : 'transparent', transition: 'background .1s' }}
                    onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLTableRowElement).style.background = C.hover }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = selected ? C.accentSub : 'transparent' }}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleOne(txn.id)}
                        style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '10px 16px', whiteSpace: 'nowrap', color: C.t4, fontSize: 12, ...MONO }}>{txn.date}</td>
                    <td style={{ padding: '10px 16px', color: C.t1, fontWeight: 500, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{txn.description}</td>
                    <td style={{ padding: '10px 16px', maxWidth: 160 }}>
                      {editingRowId === txn.id ? (
                        <input
                          autoFocus
                          value={editForm.note}
                          onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                          placeholder="Add note…"
                          style={{ background: C.inputBg, border: `1px solid var(--accent)`, borderRadius: 6, padding: '4px 8px', color: C.t1, fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
                        />
                      ) : (
                        <span style={{ color: C.t4, fontSize: 12, fontStyle: txn.note ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }} title={txn.note ?? ''}>
                          {txn.note ?? 'No note'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', color: C.t3 }}>{txn.merchant}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 600, color: C.t1, ...MONO }}>{formatCurrency(txn.amount)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {editingRowId === txn.id ? (
                        <select
                          value={editForm.category}
                          onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                          style={{ background: C.inputBg, border: `1px solid var(--accent)`, borderRadius: 6, padding: '4px 8px', color: C.t1, fontSize: 12, outline: 'none', cursor: 'pointer', appearance: 'none' as const }}
                        >
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      ) : editingCatId === txn.id ? (
                        <select
                          autoFocus
                          value={txn.category}
                          onChange={e => { updateMut.mutate({ id: txn.id, category: e.target.value }); setEditingCatId(null) }}
                          onBlur={() => setEditingCatId(null)}
                          style={{ background: C.inputBg, border: `1px solid var(--accent)`, borderRadius: 6, padding: '4px 8px', color: C.t1, fontSize: 12, outline: 'none', cursor: 'pointer', appearance: 'none' as const }}
                        >
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      ) : (
                        <CategoryBadge cat={txn.category} onClick={() => setEditingCatId(txn.id)} />
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', color: C.t4, fontSize: 12 }}>{txn.account}</td>
                    <td style={{ padding: '10px 16px', position: 'relative' }} ref={menuOpen === txn.id ? menuRef : undefined}>
                      {editingRowId === txn.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={saveEdit}
                            disabled={updateMut.isPending}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, fontWeight: 600, background: C.grad, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: updateMut.isPending ? 0.6 : 1 }}
                          >
                            <Check size={12} /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{ padding: '4px 10px', fontSize: 12, border: `1px solid ${C.border}`, borderRadius: 6, background: 'transparent', color: C.t3, cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={e => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                              setMenuOpen(menuOpen === txn.id ? null : txn.id)
                            }}
                            style={{ color: C.t4, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = C.t2}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = C.t4}
                          >
                            <MoreVertical size={14} />
                          </button>
                          {menuOpen === txn.id && (
                            <div style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50, width: 176, padding: '4px 0' }}>
                              <button
                                onClick={() => startEdit(txn)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', fontSize: 12, color: C.t2, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = C.hover}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                              >
                                <Pencil size={13} color="var(--accent)" /> Edit
                              </button>
                              <div style={{ height: 1, background: C.border, margin: '3px 0' }} />
                              <button
                                onClick={() => openLendingPanel(txn)}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', fontSize: 12, color: C.t2, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = C.hover}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                              >
                                <HandCoins size={13} color="var(--accent)" /> Mark as Lending
                              </button>
                              <div style={{ height: 1, background: C.border, margin: '3px 0' }} />
                              <button
                                onClick={() => { if (window.confirm(`Delete "${txn.description}"?`)) { deleteMut.mutate(txn.id); setMenuOpen(null) } }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(248,113,113,0.08)'}
                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'none'}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {data && data.total > limit && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${C.border}`, fontSize: 13 }}>
            <span style={{ color: C.t4 }}>Showing {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} of {data.total}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                style={{ padding: '5px 14px', border: `1px solid ${C.border}`, borderRadius: 7, background: 'transparent', color: C.t3, cursor: 'pointer', fontSize: 13, opacity: page === 0 ? 0.4 : 1 }}>Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= data.total}
                style={{ padding: '5px 14px', border: `1px solid ${C.border}`, borderRadius: 7, background: 'transparent', color: C.t3, cursor: 'pointer', fontSize: 13, opacity: (page + 1) * limit >= data.total ? 0.4 : 1 }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 12, background: C.surface, border: `1px solid ${C.border}`, color: C.t1, padding: '12px 20px', borderRadius: 99, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{selectedIds.size} selected</span>
          <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: 12, color: C.t4, background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleteMut.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', opacity: bulkDeleteMut.isPending ? 0.5 : 1 }}
          >
            <Trash2 size={14} />
            {bulkDeleteMut.isPending ? 'Deleting...' : `Delete ${selectedIds.size}`}
          </button>
        </div>
      )}

      {/* Mark as Lending slide-in panel */}
      {lendingTxn && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }} onClick={() => setLendingTxn(null)} />
          <div style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 384, background: C.surface, boxShadow: '-4px 0 32px rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${C.border}` }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.t1, margin: 0 }}>Mark as Lending</h3>
              <button onClick={() => setLendingTxn(null)} style={{ color: C.t4, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              <div style={{ background: C.hover, borderRadius: 8, padding: 12, fontSize: 12, color: C.t3, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><span style={{ color: C.t5 }}>Transaction: </span>{lendingTxn.description}</div>
                <div><span style={{ color: C.t5 }}>Amount: </span><span style={{ fontWeight: 600, color: C.t1, ...MONO }}>{formatCurrency(parseFloat(lendingTxn.amount))}</span></div>
                <div><span style={{ color: C.t5 }}>Date: </span>{lendingTxn.date}</div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.t4, fontWeight: 500, display: 'block', marginBottom: 6 }}>Person name *</label>
                <input
                  value={lendingForm.person_name}
                  onChange={e => setLendingForm(f => ({ ...f, person_name: e.target.value }))}
                  style={inp}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.t4, fontWeight: 500, display: 'block', marginBottom: 6 }}>Note <span style={{ color: C.t5 }}>(optional)</span></label>
                <input
                  value={lendingForm.note}
                  onChange={e => setLendingForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Reason for lending..."
                  style={inp}
                />
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
              <button
                onClick={() => markLendingMut.mutate({ txn: lendingTxn, ...lendingForm })}
                disabled={!lendingForm.person_name || markLendingMut.isPending}
                style={{ flex: 1, padding: '10px 0', fontSize: 13, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: (!lendingForm.person_name || markLendingMut.isPending) ? 0.5 : 1 }}
              >
                {markLendingMut.isPending ? 'Saving...' : 'Create Lending'}
              </button>
              <button onClick={() => setLendingTxn(null)}
                style={{ padding: '10px 16px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 8, background: 'transparent', color: C.t3, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
