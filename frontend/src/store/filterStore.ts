import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

const firstOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

interface FilterState {
  category: string
  startDate: string
  endDate: string
  search: string
  preset: string
  setCategory: (v: string) => void
  setStartDate: (v: string) => void
  setEndDate: (v: string) => void
  setSearch: (v: string) => void
  setPreset: (preset: string, startDate: string, endDate: string) => void
  reset: () => void
  toParams: () => Record<string, string>
}

export const useFilterStore = create<FilterState>((set, get) => ({
  category: '',
  startDate: firstOfMonth(),
  endDate: '',
  search: '',
  preset: 'this-month',
  setCategory: (category) => set({ category }),
  setStartDate: (startDate) => set({ startDate, preset: 'custom' }),
  setEndDate: (endDate) => set({ endDate, preset: 'custom' }),
  setSearch: (search) => set({ search }),
  setPreset: (preset, startDate, endDate) => set({ preset, startDate, endDate }),
  reset: () => set({ category: '', startDate: firstOfMonth(), endDate: '', search: '', preset: 'this-month' }),
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
