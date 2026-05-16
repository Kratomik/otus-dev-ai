import { memo, useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Provider } from '@supabase/supabase-js'
import YandexIcon from '../components/YandexIcon'
import { getAuthApiUserMessage } from '../lib/authMessages'
import { getYandexSignInOAuthOptions } from '../lib/authOAuth'
import { useAnalytics } from '../hooks/useAnalytics'
import { isSupabaseConfigured, signIn, supabase } from '../lib/supabase'
import { useSession } from '../hooks/useSession'

type ViewState = 'idle' | 'loading' | 'error'

const YANDEX_PROVIDER = 'yandex' as unknown as Provider

function Login() {
  const navigate = useNavigate()
  const { trackEvent, trackError } = useAnalytics()
  const { currentUser } = useSession()
  const [state, setState] = useState<ViewState>('idle')
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const showError = useCallback(
    (message: string) => {
      trackError(new Error(message), 'auth_error')
      setState('error')
      setError(message)
    },
    [trackError],
  )

  useEffect(() => {
    if (currentUser) navigate('/calculator', { replace: true })
  }, [currentUser, navigate])

  const onYandexSignIn = async () => {
    if (!isSupabaseConfigured()) {
      showError('Supabase не настроен. Проверьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.')
      return
    }

    setOauthLoading(true)
    setError(null)
    setState('idle')

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: YANDEX_PROVIDER,
        options: getYandexSignInOAuthOptions(),
      })
      if (oauthError) {
        showError(getAuthApiUserMessage(oauthError))
        setOauthLoading(false)
        return
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось начать вход через Яндекс.'
      showError(message)
      setOauthLoading(false)
    }
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setState('loading')
    setError(null)

    const res = await signIn(email, password)
    if (res.error) {
      trackError(new Error(res.error.message), 'auth_error')
      setState('error')
      setError(res.error.message)
      return
    }
    trackEvent('UserLoggedIn', { provider: 'email' })
    navigate('/calculator', { replace: true })
  }

  return (
    <section aria-live="polite" className="mx-auto w-full max-w-md space-y-4">
      <header>
        <h2 className="text-2xl font-bold">Вход</h2>
        <p className="mt-1 text-sm text-[#0D1B2A]/75">Войдите, чтобы синхронизировать данные между устройствами.</p>
      </header>

      <button
        type="button"
        onClick={() => void onYandexSignIn()}
        disabled={oauthLoading || state === 'loading'}
        aria-label="Войти через Яндекс"
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 font-semibold text-[#0D1B2A] transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2 motion-reduce:transition-none disabled:opacity-70"
      >
        <YandexIcon />
        {oauthLoading ? 'Переход к Яндексу…' : 'Войти через Яндекс'}
      </button>

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
          disabled={state === 'loading' || oauthLoading}
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
