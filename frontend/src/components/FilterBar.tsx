import { useFilterStore } from '../store/filterStore'

const CATEGORIES = [
  'Food & Dining', 'Transport', 'Groceries', 'Shopping',
  'Entertainment', 'Subscriptions', 'Health', 'Recharge', 'Bill', 'Rent', 'Family', 'Household', 'Social Life', 'Lending', 'Education', 'Finance', 'Uncategorized',
]

const PRESETS = [
  { id: 'this-month', label: 'This Month' },
  { id: 'last-3',     label: 'Last 3 Months' },
  { id: 'last-6',     label: 'Last 6 Months' },
  { id: 'this-year',  label: 'This Year' },
  { id: 'all',        label: 'All Time' },
  { id: 'custom',     label: 'Custom ▾' },
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

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 mb-5 space-y-3">
      {/* Row 1: preset chips + inline custom date inputs */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-400 self-center mr-1">Quick:</span>
        {PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id, p.id === 'custom' ? startDate : computeStart(p.id), p.id === 'custom' ? endDate : '')}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
              preset === p.id
                ? 'bg-brand-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </>
        )}
      </div>

      {/* Row 2: search + category + reset */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
