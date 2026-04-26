import { Link, Outlet, useLocation } from 'react-router-dom'
import { Moon, Sun, Users } from 'lucide-react'
import { C } from '../lib/theme'
import { useThemeStore } from '../store/themeStore'

const nav = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    to: '/transactions',
    label: 'Transactions',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="16" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    to: '/lendings',
    label: 'Lendings',
    icon: <Users size={17} />,
  },
  {
    to: '/upload',
    label: 'Upload',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
]

export default function Layout() {
  const { pathname } = useLocation()
  const { isDark, toggle } = useThemeStore()

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg }}>
      <aside style={{ width: 220, minWidth: 220, background: C.nav, borderRight: `1px solid ${C.borderFaint}`, display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '22px 20px 18px', borderBottom: `1px solid ${C.borderFaint}` }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.t1, letterSpacing: '-0.3px' }}>UPI Tracker</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 10px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.t6, letterSpacing: '0.08em', padding: '4px 10px 8px' }}>MENU</span>
            {nav.map(({ to, label, icon }) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 8,
                    fontSize: 13.5, fontWeight: 500,
                    color: active ? C.t1 : C.t3,
                    background: active ? C.accentSub : 'transparent',
                    textDecoration: 'none', transition: 'background .15s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = C.accentSub }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
                >
                  <span style={{ color: active ? 'var(--accent)' : C.t4, display: 'flex', flexShrink: 0 }}>{icon}</span>
                  <span>{label}</span>
                  {active && (
                    <div style={{ position: 'absolute', right: 10, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Theme toggle */}
        <div style={{ padding: '8px 10px', borderTop: `1px solid ${C.borderFaint}` }}>
          <button
            onClick={toggle}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8, border: 'none',
              width: '100%', background: 'transparent', color: C.t3,
              fontSize: 13.5, fontWeight: 500, cursor: 'pointer', transition: 'background .15s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = C.hover}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            <span style={{ color: C.t4, display: 'flex' }}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            {isDark ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Footer / user */}
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.borderFaint}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--grad)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              R
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.t2, fontWeight: 500 }}>Rohit J.</div>
              <div style={{ fontSize: 11, color: C.t4, marginTop: 1 }}>Personal account</div>
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ background: C.nav, borderBottom: `1px solid ${C.border}`, padding: '14px 24px', flexShrink: 0 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: C.t1, margin: 0 }}>
            {nav.find(n => n.to === pathname)?.label ?? 'UPI Tracker'}
          </h2>
        </header>
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}