import { memo } from 'react'
import { NavLink } from 'react-router-dom'

interface AuthLayoutProps {
  readonly children: React.ReactNode
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex min-h-[44px] items-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2',
    isActive ? 'bg-[#2979FF] text-white' : 'bg-white text-[#0D1B2A] hover:bg-[#2979FF]/10',
  ].join(' ')

function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F5F9F7] text-[#0D1B2A]">
      <header className="border-b border-[#2979FF]/20 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-[#00E676]" aria-hidden="true" />
            <span className="text-lg font-bold tracking-tight">EcoTrack v1.0</span>
          </div>
          <nav aria-label="Авторизация" className="flex flex-wrap gap-2">
            <NavLink to="/login" className={navLinkClass} end>
              Вход
            </NavLink>
            <NavLink to="/register" className={navLinkClass}>
              Регистрация
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}

export default memo(AuthLayout)
