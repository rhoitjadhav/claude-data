import type { MerchantStat } from '../api/stats'
import { formatCurrency } from '../lib/utils'

interface Props { data: MerchantStat[] | undefined; isLoading: boolean }

export default function TopMerchants({ data, isLoading }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Merchants</h3>
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
      ) : (
        <ul className="space-y-2">
          {data?.map((m, i) => (
            <li key={m.merchant} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-600 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <span className="text-gray-700">{m.merchant}</span>
              </span>
              <span className="font-semibold text-gray-900">{formatCurrency(m.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
