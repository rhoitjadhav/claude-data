import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, X } from 'lucide-react'
import { buildExportUrl, createTransaction, fetchTransactions } from '../api/transactions'
import FilterBar from '../components/FilterBar'
import TransactionTable from '../components/TransactionTable'
import { CAT_COLORS } from '../components/TransactionTable'
import { useFilterParams } from '../store/filterStore'
import { formatCurrency } from '../lib/utils'
import { C, inp, MONO } from '../lib/theme'

const CATEGORIES = ['Food & Dining','Transport','Groceries','Shopping','Entertainment','Subscriptions','Health','Recharge','Bill','Rent','Family','Household','Social Life','Lending','Education','Finance','Uncategorized']
const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({ date: today(), description: '', amount: '', category: 'Food & Dining', note: '' })

export default function Transactions() {
  const filters = useFilterParams()
  const qc = useQueryClient()
  const { data: summary } = useQuery({
    queryKey: ['transactions', filters, 0],
    queryFn: () => fetchTransactions({ ...filters, limit: 50, offset: 0 }),
  })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form, setForm] = useState(blank())
  const [err, setErr] = useState('')

  useEffect(() => {
    if (drawerOpen) { setForm(blank()); setErr('') }
  }, [drawerOpen])

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErr('') }

  const createMut = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      setDrawerOpen(false)
    },
  })

  const handleSave = () => {
    if (!form.description.trim()) { setErr('Merchant / description is required.'); return }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { setErr('Enter a valid amount.'); return }
    createMut.mutate({
      date: form.date,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
      category: form.category || undefined,
      note: form.note.trim() || undefined,
    })
  }

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label style={{ fontSize: 11, fontWeight: 600, color: C.t4, letterSpacing: '.05em', marginBottom: 5, display: 'block' }}>{children}</label>
  )

  return (
    <div style={{ position: 'relative' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: C.t1, margin: 0 }}>All Transactions</h2>
          {summary && (
            <div style={{ fontSize: 12, color: C.t4, marginTop: 3 }}>
              {summary.total} transactions · {formatCurrency(summary.total_amount)} total
            </div>
          )}
        </div>
        <a
          href={buildExportUrl(filters)}
          download="transactions.csv"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 8, color: C.t3, textDecoration: 'none', background: 'transparent' }}
        >
          <Download size={14} /> Export CSV
        </a>
      </div>

      <FilterBar />
      <TransactionTable />

      {/* FAB */}
      <button
        onClick={() => setDrawerOpen(true)}
        style={{ position: 'fixed', bottom: 28, right: 28, width: 52, height: 52, borderRadius: '50%', border: 'none', background: C.grad, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 20px rgba(8,145,178,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9997, transition: 'transform .15s, box-shadow .15s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(8,145,178,0.55)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(8,145,178,0.35)' }}
        title="Add Transaction"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Drawer */}
      {drawerOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, backdropFilter: 'blur(2px)' }} onClick={() => setDrawerOpen(false)} />
          <div style={{ position: 'fixed', right: 0, top: 0, height: '100%', width: 380, background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 9999, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.3)' }}>

            {/* Header */}
            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.t1 }}>Add Transaction</div>
                <div style={{ fontSize: 12, color: C.t4, marginTop: 2 }}>Quickly log a new expense</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.t4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} />
              </button>
            </div>

            {/* Form */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Amount — hero */}
              <div style={{ background: C.accentSub, border: `1px solid ${C.accentBdr}`, borderRadius: 12, padding: '16px 18px', textAlign: 'center' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.accentL, letterSpacing: '.05em', display: 'block', marginBottom: 4 }}>AMOUNT (₹)</label>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: C.accentL, ...MONO }}>₹</span>
                  <input
                    type="number" min="0" step="1" placeholder="0"
                    value={form.amount}
                    onChange={e => set('amount', e.target.value)}
                    autoFocus
                    style={{ border: 'none', background: 'transparent', fontSize: 36, fontWeight: 700, ...MONO, color: C.t1, textAlign: 'center', width: 160, padding: '0 4px', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>MERCHANT / DESCRIPTION</Label>
                <input
                  value={form.description}
                  placeholder="e.g. Swiggy, Uber, Amazon…"
                  onChange={e => set('description', e.target.value)}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.border}
                  style={inp}
                />
              </div>

              {/* Category grid */}
              <div>
                <Label>CATEGORY</Label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {CATEGORIES.map(cat => {
                    const color = CAT_COLORS[cat] ?? '#94a3b8'
                    const active = form.category === cat
                    return (
                      <button
                        key={cat}
                        onClick={() => set('category', cat)}
                        style={{
                          padding: '7px 4px', borderRadius: 8,
                          border: `1px solid ${active ? color : C.border}`,
                          background: active ? color + '18' : 'transparent',
                          color: active ? color : C.t4,
                          fontSize: 11, fontWeight: active ? 600 : 400,
                          cursor: 'pointer', transition: 'all .15s', textAlign: 'center',
                        }}
                      >
                        {cat.split(' ')[0]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date */}
              <div>
                <Label>DATE</Label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => set('date', e.target.value)}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.border}
                  style={{ ...inp, colorScheme: 'auto' as const }}
                />
              </div>

              {/* Note */}
              <div>
                <Label>NOTE <span style={{ color: C.t5, fontWeight: 400, fontSize: 10 }}>(optional)</span></Label>
                <input
                  value={form.note}
                  placeholder="e.g. Work lunch, split with Rahul…"
                  onChange={e => set('note', e.target.value)}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--accent)'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = C.border}
                  style={inp}
                />
              </div>

              {/* Inline error */}
              {err && (
                <div style={{ fontSize: 12, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 7, padding: '8px 12px' }}>
                  {err}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10 }}>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ flex: 1, padding: 11, borderRadius: 9, border: `1px solid ${C.border}`, background: 'transparent', color: C.t3, fontSize: 14, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={createMut.isPending}
                style={{ flex: 2, padding: 11, borderRadius: 9, border: 'none', background: C.grad, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: createMut.isPending ? 0.6 : 1 }}
              >
                {createMut.isPending ? 'Saving…' : '+ Add Transaction'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}