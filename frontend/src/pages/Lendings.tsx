import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Plus } from 'lucide-react'
import { fetchLendings, createLending, updateLending, deleteLending, type Lending } from '../api/lendings'
import { formatCurrency } from '../lib/utils'

const STATUS_BADGE: Record<string, string> = {
  outstanding: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  settled: 'bg-green-100 text-green-700',
}

const today = () => new Date().toISOString().slice(0, 10)

export default function Lendings() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ person_name: '', amount: '', date: today(), note: '' })
  const [repaidInputs, setRepaidInputs] = useState<Record<string, string>>({})

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
  const settledCount = lendings.filter(l => l.status === 'settled').length

  const handleRepaidBlur = (lending: Lending) => {
    const val = repaidInputs[lending.id]
    if (val === undefined) return
    const num = parseFloat(val)
    if (!isNaN(num) && num !== parseFloat(lending.amount_repaid)) {
      updateMut.mutate({ id: lending.id, payload: { amount_repaid: num } })
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-base font-semibold text-gray-800">Lendings</h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus size={14} /> Add Lending
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Lent', value: formatCurrency(totalLent) },
          { label: 'Outstanding', value: formatCurrency(totalOutstanding), highlight: totalOutstanding > 0 },
          { label: 'Settled', value: `${settledCount} of ${lendings.length}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-lg font-semibold ${s.highlight ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">New Lending</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Person</label>
              <input
                value={form.person_name}
                onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))}
                placeholder="Friend's name"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Amount (₹)</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Note (optional)</label>
              <input
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Reason..."
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => createMut.mutate({ person_name: form.person_name, amount: parseFloat(form.amount), date: form.date, note: form.note || undefined })}
              disabled={!form.person_name || !form.amount || createMut.isPending}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
            >
              Save
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      ) : lendings.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No lendings yet. Add one above.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Person', 'Lent On', 'Amount', 'Note', 'Repaid (₹)', 'Outstanding', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lendings.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{l.person_name}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{l.date}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(parseFloat(l.amount))}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">{l.note ?? '—'}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={repaidInputs[l.id] ?? l.amount_repaid}
                      onChange={e => setRepaidInputs(r => ({ ...r, [l.id]: e.target.value }))}
                      onBlur={() => handleRepaidBlur(l)}
                      disabled={l.status === 'settled'}
                      className="w-24 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{formatCurrency(parseFloat(l.amount_outstanding))}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[l.status]}`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { if (window.confirm(`Delete lending for ${l.person_name}?`)) deleteMut.mutate(l.id) }}
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
      )}
    </div>
  )
}
