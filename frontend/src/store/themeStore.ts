import { create } from 'zustand'

type ThemeStore = { isDark: boolean; toggle: () => void }

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: localStorage.getItem('theme') === 'dark',
  toggle: () => set(s => {
    const next = !s.isDark
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    localStorage.setItem('theme', next ? 'dark' : 'light')
    return { isDark: next }
  }),
}))