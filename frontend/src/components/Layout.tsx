import { memo } from 'react'
import { BarChart3, Calculator, Leaf } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { to: '/calculator', label: 'Calculator', icon: Calculator },
  { to: '/recommendations', label: 'Recommendations', icon: Leaf },
  { to: '/progress', label: 'Progress', icon: BarChart3 },
]

function Layout() {
  return (
    <div className="min-h-screen bg-[#F5F9F7] text-[#0D1B2A]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
        <aside className="w-full border-b border-[#2979FF]/20 bg-white/95 p-3 backdrop-blur md:w-64 md:border-b-0 md:border-r md:p-5">
          <div className="mb-3 flex items-center gap-2 md:mb-8">
            <span
              className="inline-block h-3 w-3 rounded-full bg-[#00E676]"
              aria-hidden="true"
            />
            <h1 className="text-lg font-bold tracking-tight">EcoTrack v1.0</h1>
          </div>

          <nav aria-label="Main navigation">
            <ul className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
              {navItems.map(({ to, label, icon: Icon }) => (
                <li key={to} className="min-w-fit md:w-full">
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      [
                        'flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none',
                        isActive
                          ? 'bg-[#2979FF] text-white shadow-sm'
                          : 'bg-[#F5F9F7] text-[#0D1B2A] hover:bg-[#2979FF]/10',
                      ].join(' ')
                    }
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default memo(Layout)
