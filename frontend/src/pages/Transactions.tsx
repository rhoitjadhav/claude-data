import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, Plus, X } from 'lucide-react'
import { buildExportUrl, createTransaction } from '../api/transactions'
import FilterBar from '../components/FilterBar'
import TransactionTable from '../components/TransactionTable'
import { useFilterParams } from '../store/filterStore'

const CATEGORIES = ['Food & Dining','Transport','Groceries','Shopping','Entertainment','Subscriptions','Health','Recharge','Bill','Rent','Family','Education','Finance','Uncategorized']
const today = () => new Date().toISOString().slice(0, 10)

export default function Transactions() {
  const filters = useFilterParams()
  const qc = useQueryClient()
  const [showPanel, setShowPanel] = useState(false)
  const [form, setForm] = useState({ date: today(), description: '', amount: '', category: '', note: '', account: '' })

  const createMut = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setShowPanel(false)
      setForm({ date: today(), description: '', amount: '', category: '', note: '', account: '' })
    },
  })

  const handleSave = () => {
    if (!form.description || !form.amount) return
    createMut.mutate({
      date: form.date,
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category || undefined,
      note: form.note || undefined,
      account: form.account || undefined,
    })
  }

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-800">All Transactions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} /> Add Transaction
          </button>
          <a
            href={buildExportUrl(filters)}
            download="transactions.csv"
            className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> Export CSV
          </a>
        </div>
      </div>

      <FilterBar />
      <TransactionTable />

      {/* Slide-in panel */}
      {showPanel && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowPanel(false)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-800">Add Transaction</h3>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Date</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description *</label>
                <input value={form.description} placeholder="e.g. Paid to Rahul for lunch"
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount (₹) *</label>
                <input type="number" value={form.amount} placeholder="0"
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Category <span className="text-gray-400">(optional — AI will suggest if blank)</span></label>
                <select value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white">
                  <option value="">Auto-categorize</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Note <span className="text-gray-400">(optional)</span></label>
                <input value={form.note} placeholder="e.g. Birthday dinner"
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account <span className="text-gray-400">(optional)</span></label>
                <input value={form.account} placeholder="e.g. HDFC, Cash"
                  onChange={e => setForm(f => ({ ...f, account: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleSave}
                disabled={!form.description || !form.amount || createMut.isPending}
                className="flex-1 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
              >
                {createMut.isPending ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowPanel(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
