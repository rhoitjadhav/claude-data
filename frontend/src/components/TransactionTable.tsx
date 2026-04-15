import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { deleteTransaction, fetchTransactions, updateTransaction } from '../api/transactions'
import { useFilterParams } from '../store/filterStore'
import { formatCurrency } from '../lib/utils'

const CATEGORIES = ['Food & Dining','Transport','Groceries','Shopping','Entertainment','Health','Utilities','Education','Finance','Uncategorized']

export default function TransactionTable() {
  const filters = useFilterParams()
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const limit = 50

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: () => fetchTransactions({ ...filters, limit, offset: page * limit }),
  })

  useEffect(() => { setPage(0) }, [filters])

  const deleteMut = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    onError: () => alert('Failed to delete transaction. Please try again.'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) => updateTransaction(id, { category }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
    onError: () => alert('Failed to update category. Please try again.'),
  })

  if (isLoading) return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date','Description','Merchant','Amount','Category','Account',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.items.map(txn => (
              <tr key={txn.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{txn.date}</td>
                <td className="px-4 py-3 text-gray-900 max-w-xs truncate">{txn.description}</td>
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
                <td className="px-4 py-3">
                  <button
                    onClick={() => { if (window.confirm(`Delete transaction "${txn.description}"?`)) deleteMut.mutate(txn.id) }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
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
  )
}
