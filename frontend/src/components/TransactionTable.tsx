import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HandCoins, MoreVertical, Trash2, X } from 'lucide-react'
import { createLending } from '../api/lendings'
import { bulkDeleteTransactions, deleteTransaction, fetchTransactions, updateTransaction, type Transaction } from '../api/transactions'
import { useFilterParams } from '../store/filterStore'
import { formatCurrency } from '../lib/utils'

const CATEGORIES = ['Food & Dining','Transport','Groceries','Shopping','Entertainment','Subscriptions','Health','Recharge','Bill','Rent','Family','Household','Social Life','Lending','Education','Finance','Uncategorized']

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
  const menuRef = useRef<HTMLTableCellElement>(null)
  const limit = 50

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: () => fetchTransactions({ ...filters, limit, offset: page * limit }),
  })

  useEffect(() => { setPage(0) }, [filters])
  useEffect(() => { setSelectedIds(new Set()) }, [filters, page])

  // Close menu on outside click
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
    mutationFn: ({ id, category }: { id: string; category: string }) => updateTransaction(id, { category }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    onError: () => alert('Failed to update category. Please try again.'),
  })

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

  if (isLoading) return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                    onChange={toggleAll}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                </th>
                {['Date','Description','Note','Merchant','Amount','Category','Account',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.items.map(txn => (
                <tr key={txn.id} className={`hover:bg-gray-50 ${selectedIds.has(txn.id) ? 'bg-brand-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(txn.id)}
                      onChange={() => toggleOne(txn.id)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{txn.date}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{txn.description}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate" title={txn.note ?? ''}>{txn.note ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{txn.merchant}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(txn.amount)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={txn.category}
                      onChange={e => updateMut.mutate({ id: txn.id, category: e.target.value })}
                      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{txn.account}</td>
                  <td className="px-4 py-3 relative" ref={menuOpen === txn.id ? menuRef : undefined}>
                    <button
                      onClick={e => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                        setMenuOpen(menuOpen === txn.id ? null : txn.id)
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {menuOpen === txn.id && (
                      <div style={{ top: menuPos.top, right: menuPos.right }} className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-44 py-1">
                        <button
                          onClick={() => openLendingPanel(txn)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <HandCoins size={13} className="text-brand-600" /> Mark as Lending
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => { if (window.confirm(`Delete "${txn.description}"?`)) { deleteMut.mutate(txn.id); setMenuOpen(null) } }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
            <span className="text-gray-500">Showing {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} of {data.total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= data.total} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-full shadow-xl">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
          <div className="w-px h-4 bg-gray-600" />
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleteMut.isPending}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
            {bulkDeleteMut.isPending ? 'Deleting...' : `Delete ${selectedIds.size}`}
          </button>
        </div>
      )}

      {/* Mark as Lending slide-in panel */}
      {lendingTxn && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setLendingTxn(null)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">Mark as Lending</h3>
              <button onClick={() => setLendingTxn(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <div><span className="text-gray-400">Transaction: </span>{lendingTxn.description}</div>
                <div><span className="text-gray-400">Amount: </span><span className="font-semibold text-gray-800">{formatCurrency(parseFloat(lendingTxn.amount))}</span></div>
                <div><span className="text-gray-400">Date: </span>{lendingTxn.date}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Person name *</label>
                <input
                  value={lendingForm.person_name}
                  onChange={e => setLendingForm(f => ({ ...f, person_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Note <span className="text-gray-400">(optional)</span></label>
                <input
                  value={lendingForm.note}
                  onChange={e => setLendingForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Reason for lending..."
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => markLendingMut.mutate({ txn: lendingTxn, ...lendingForm })}
                disabled={!lendingForm.person_name || markLendingMut.isPending}
                className="flex-1 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
              >
                {markLendingMut.isPending ? 'Saving...' : 'Create Lending'}
              </button>
              <button onClick={() => setLendingTxn(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
