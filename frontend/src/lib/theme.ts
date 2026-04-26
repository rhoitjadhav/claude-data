import type { CSSProperties } from 'react'

export const C = {
  bg:          'var(--bg)',
  surface:     'var(--surface)',
  nav:         'var(--surface-nav)',
  border:      'var(--border)',
  borderFaint: 'var(--border-faint)',
  hover:       'var(--hover)',
  inputBg:     'var(--input-bg)',
  t1:          'var(--t1)',
  t2:          'var(--t2)',
  t3:          'var(--t3)',
  t4:          'var(--t4)',
  t5:          'var(--t5)',
  t6:          'var(--t6)',
  accent:      'var(--accent)',
  accentL:     'var(--accent-l)',
  accentSub:   'var(--accent-sub)',
  accentBdr:   'var(--accent-bdr)',
  grad:        'var(--grad)',
} as const

export const MONO: CSSProperties = { fontFamily: "'JetBrains Mono', 'Fira Mono', monospace" }

export const card: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  transition: 'background .25s',
}

export const inp: CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 7,
  fontSize: 13,
  background: 'var(--input-bg)',
  border: '1px solid var(--border)',
  color: 'var(--t1)',
  outline: 'none',
  boxSizing: 'border-box',
}
