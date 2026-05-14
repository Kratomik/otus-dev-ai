import { memo, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signIn } from '../lib/supabase'
import { useSession } from '../hooks/useSession'

type ViewState = 'idle' | 'loading' | 'error'

function Login() {
  const navigate = useNavigate()
  const { currentUser } = useSession()
  const [state, setState] = useState<ViewState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (currentUser) navigate('/calculator', { replace: true })
  }, [currentUser, navigate])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setState('loading')
    setError(null)

    const res = await signIn(email, password)
    if (res.error) {
      setState('error')
      setError(res.error.message)
      return
    }
    navigate('/calculator', { replace: true })
  }

  return (
    <section aria-live="polite" className="mx-auto w-full max-w-md space-y-4">
      <header>
        <h2 className="text-2xl font-bold">Вход</h2>
        <p className="mt-1 text-sm text-[#0D1B2A]/75">Войдите, чтобы синхронизировать данные между устройствами.</p>
      </header>

      <form
        noValidate
        onSubmit={onSubmit}
        className="space-y-3 rounded-2xl border border-[#2979FF]/20 bg-white p-4"
        aria-label="Форма входа"
      >
        <div className="space-y-1">
          <label htmlFor="login-email" className="block text-sm font-medium">
            Электронная почта
          </label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-[#2979FF]/30 px-3 py-2 text-base text-[#0D1B2A] outline-none ring-[#2979FF] focus:ring-2"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="login-password" className="block text-sm font-medium">
            Пароль
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-[#2979FF]/30 px-3 py-2 text-base text-[#0D1B2A] outline-none ring-[#2979FF] focus:ring-2"
          />
        </div>

        <button
          type="submit"
          disabled={state === 'loading'}
          className="min-h-[44px] w-full rounded-xl bg-[#2979FF] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#1E67E6] focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2 motion-reduce:transition-none disabled:opacity-70"
        >
          {state === 'loading' ? 'Вход…' : 'Войти'}
        </button>
      </form>

      <p className="text-center text-sm text-[#0D1B2A]/80">
        Нет аккаунта?{' '}
        <Link
          to="/register"
          className="font-semibold text-[#2979FF] underline underline-offset-2 hover:text-[#1E67E6] focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2 rounded-sm"
        >
          Зарегистрироваться
        </Link>
      </p>

      {state === 'error' && error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4" role="alert">
          <p className="font-medium text-red-700">{error}</p>
        </div>
      )}
    </section>
  )
}

export default memo(Login)

