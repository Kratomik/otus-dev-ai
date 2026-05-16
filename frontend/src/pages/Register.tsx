import { memo, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAnalytics } from '../hooks/useAnalytics'
import { signUp, supabase } from '../lib/supabase'
import { useSession } from '../hooks/useSession'

type ViewState = 'idle' | 'loading' | 'error' | 'success'

const inputClass =
  'min-h-[44px] w-full rounded-xl border border-[#2979FF]/30 px-3 py-2 text-base text-[#0D1B2A] outline-none ring-[#2979FF] focus:ring-2'
const linkPrimary =
  'font-semibold text-[#2979FF] underline underline-offset-2 hover:text-[#1E67E6] focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2 rounded-sm'

function Register() {
  const navigate = useNavigate()
  const { trackEvent, trackError } = useAnalytics()
  const { currentUser } = useSession()
  const [state, setState] = useState<ViewState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [successHint, setSuccessHint] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (currentUser) navigate('/calculator', { replace: true })
  }, [currentUser, navigate])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccessHint(null)
    if (password !== confirmPassword) {
      trackError(new Error('Пароли не совпадают.'), 'auth_error')
      setState('error')
      setError('Пароли не совпадают.')
      return
    }
    setState('loading')
    const res = await signUp(email, password)
    if (res.error) {
      trackError(new Error(res.error.message), 'auth_error')
      setState('error')
      setError(res.error.message)
      return
    }
    trackEvent('UserRegistered', { provider: 'email' })
    const { data: sessionData } = await supabase.auth.getSession()
    if (sessionData.session) {
      navigate('/calculator', { replace: true })
      return
    }
    setState('success')
    setSuccessHint(
      'Аккаунт создан. При включённом подтверждении email проверьте почту, затем войдите.',
    )
  }

  return (
    <section aria-live="polite" className="mx-auto w-full max-w-md space-y-4">
      <header>
        <h2 className="text-2xl font-bold">Регистрация</h2>
        <p className="mt-1 text-sm text-[#0D1B2A]/75">Создайте аккаунт, чтобы сохранять расчёты и прогресс.</p>
      </header>
      <form
        noValidate
        onSubmit={onSubmit}
        className="space-y-3 rounded-2xl border border-[#2979FF]/20 bg-white p-4"
        aria-label="Форма регистрации"
      >
        <div className="space-y-1">
          <label htmlFor="register-email" className="block text-sm font-medium">
            Электронная почта
          </label>
          <input
            id="register-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="register-password" className="block text-sm font-medium">
            Пароль
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
            minLength={8}
            aria-describedby="register-password-hint"
          />
          <p id="register-password-hint" className="text-xs text-[#0D1B2A]/65">
            Не короче 8 символов.
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="register-password-confirm" className="block text-sm font-medium">
            Подтверждение пароля
          </label>
          <input
            id="register-password-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={state === 'loading'}
          className="min-h-[44px] w-full rounded-xl bg-[#00E676] px-4 py-2 font-semibold text-[#0D1B2A] transition-colors hover:bg-[#00C853] focus:outline-none focus:ring-2 focus:ring-[#00E676] focus:ring-offset-2 motion-reduce:transition-none disabled:opacity-70"
        >
          {state === 'loading' ? 'Регистрация…' : 'Зарегистрироваться'}
        </button>
      </form>
      <p className="text-center text-sm text-[#0D1B2A]/80">
        Уже есть аккаунт? <Link to="/login" className={linkPrimary}>Войти</Link>
      </p>
      {state === 'error' && error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4" role="alert">
          <p className="font-medium text-red-700">{error}</p>
        </div>
      )}
      {state === 'success' && successHint && (
        <div className="rounded-2xl border border-[#00E676]/40 bg-[#00E676]/10 p-4" role="status">
          <p className="font-medium text-[#0D1B2A]">{successHint}</p>
          <Link to="/login" className={`mt-3 inline-flex min-h-[44px] items-center ${linkPrimary}`}>
            Перейти ко входу
          </Link>
        </div>
      )}
    </section>
  )
}

export default memo(Register)
