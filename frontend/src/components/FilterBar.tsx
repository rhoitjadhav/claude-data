import { useFilterStore } from '../store/filterStore'

const CATEGORIES = [
  'Food & Dining', 'Transport', 'Groceries', 'Shopping',
  'Entertainment', 'Health', 'Utilities', 'Education', 'Finance', 'Uncategorized',
]

export default function FilterBar() {
  const { category, startDate, endDate, search, setCategory, setStartDate, setEndDate, setSearch, reset } =
    useFilterStore()

  return (
    <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 mb-5">
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
      <input
        type="date"
        value={startDate}
        onChange={e => setStartDate(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <span className="self-center text-gray-400 text-sm">to</span>
      <input
        type="date"
        value={endDate}
        onChange={e => setEndDate(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      <button
        onClick={reset}
        className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        Reset
      </button>
    </div>
  )
}
