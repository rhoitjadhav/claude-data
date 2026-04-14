import { Link, Outlet, useLocation } from 'react-router-dom'
import { BarChart2, CreditCard, Upload } from 'lucide-react'
import { cn } from '../lib/utils'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { to: '/transactions', label: 'Transactions', icon: CreditCard },
  { to: '/upload', label: 'Upload', icon: Upload },
]

export default function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-brand-600">UPI Tracker</h1>
          <p className="text-xs text-gray-500 mt-0.5">Expense Manager</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                pathname === to
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-800">
            {nav.find(n => n.to === pathname)?.label ?? 'UPI Tracker'}
          </h2>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
