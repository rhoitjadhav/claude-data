import { Download } from 'lucide-react'
import { buildExportUrl } from '../api/transactions'
import FilterBar from '../components/FilterBar'
import TransactionTable from '../components/TransactionTable'
import { useFilterParams } from "../store/filterStore"

export default function Transactions() {
  const filters = useFilterParams()

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-gray-800">All Transactions</h2>
        <a
          href={buildExportUrl(filters)}
          download="transactions.csv"
          className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Download size={14} /> Export CSV
        </a>
      </div>
      <FilterBar />
      <TransactionTable />
    </div>
  )
}
