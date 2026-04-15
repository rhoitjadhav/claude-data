import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

interface FilterState {
  category: string
  startDate: string
  endDate: string
  search: string
  setCategory: (v: string) => void
  setStartDate: (v: string) => void
  setEndDate: (v: string) => void
  setSearch: (v: string) => void
  reset: () => void
  toParams: () => Record<string, string>
}

export const useFilterStore = create<FilterState>((set, get) => ({
  category: '',
  startDate: '',
  endDate: '',
  search: '',
  setCategory: (category) => set({ category }),
  setStartDate: (startDate) => set({ startDate }),
  setEndDate: (endDate) => set({ endDate }),
  setSearch: (search) => set({ search }),
  reset: () => set({ category: '', startDate: '', endDate: '', search: '' }),
  toParams: () => {
    const { category, startDate, endDate, search } = get()
    const params: Record<string, string> = {}
    if (category) params.category = category
    if (startDate) params.start = startDate
    if (endDate) params.end = endDate
    if (search) params.search = search
    return params
  },
}))

/** Stable selector — returns same object reference when filter values haven't changed */
export function useFilterParams(): Record<string, string> {
  return useFilterStore(
    useShallow(s => s.toParams())
  )
}
