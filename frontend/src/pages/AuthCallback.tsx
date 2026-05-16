import { memo, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { applyHandleApiErrorAction } from '../lib/applyApiErrorAction'
import { getAuthApiUserMessage } from '../lib/authMessages'
import {
  claimOAuthCodeExchange,
  getOAuthCodeFromLocation,
  getOAuthRedirectErrorFromLocation,
  isFlowStateNotFoundError,
  releaseOAuthCodeExchange,
} from '../lib/authOAuth'
import { finishAuthSession } from '../lib/finishAuthSession'
import { handleApiError, supabase } from '../lib/supabase'

const SESSION_POLL_MS = 150
const SESSION_POLL_ATTEMPTS = 20

async function waitForSession(): Promise<boolean> {
  for (let attempt = 0; attempt < SESSION_POLL_ATTEMPTS; attempt += 1) {
    const { data } = await supabase.auth.getSession()
    if (data.session) return true
    await new Promise((resolve) => {
      setTimeout(resolve, SESSION_POLL_MS)
    })
  }
  return false
}

function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const complete = async () => {
      const redirectError = getOAuthRedirectErrorFromLocation()
      if (redirectError) {
        const action = await handleApiError(redirectError, 'yandex-oauth-redirect')
        if (!active) return
        if (applyHandleApiErrorAction(action, navigate, setError) === 'stop') return
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (!active) return
      if (sessionError) {
        const action = await handleApiError(sessionError, 'yandex-oauth-exchange')
        if (!active) return
        if (applyHandleApiErrorAction(action, navigate, setError) === 'stop') {
          if (action.type !== 'error') setError(getAuthApiUserMessage(sessionError))
          return
        }
      }
      if (sessionData.session) {
        await finishAuthSession(navigate, () => active)
        return
      }

      const code = getOAuthCodeFromLocation()
      if (!code) {
        setError('Не найден код авторизации. Повторите вход через Яндекс.')
        return
      }

      const isPrimaryExchange = claimOAuthCodeExchange(code)
      if (!isPrimaryExchange) {
        const hasSession = await waitForSession()
        if (!active) return
        if (hasSession) {
          await finishAuthSession(navigate, () => active)
          return
        }
        setError('Не удалось завершить вход. Попробуйте ещё раз через Яндекс.')
        return
      }

      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!active) return

        if (exchangeError) {
          const hasSession = await waitForSession()
          if (!active) return
          if (hasSession) {
            await finishAuthSession(navigate, () => active)
            return
          }

          const action = await handleApiError(exchangeError, 'yandex-oauth-exchange')
          if (!active) return
          if (action.type === 'session-refreshed') {
            await finishAuthSession(navigate, () => active)
            return
          }
          if (applyHandleApiErrorAction(action, navigate, setError) === 'stop') {
            if (action.type === 'none' && isFlowStateNotFoundError(exchangeError)) {
              setError('Сессия входа устарела. Повторите вход через Яндекс.')
            }
            return
          }
        }

        await finishAuthSession(navigate, () => active)
      } finally {
        releaseOAuthCodeExchange(code)
      }
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active || !session) return
      void finishAuthSession(navigate, () => active)
    })

    void complete()

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [navigate])

  if (error) {
    return (
      <section className="mx-auto w-full max-w-md space-y-4" aria-live="polite">
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4" role="alert">
          <p className="font-medium text-red-700">{error}</p>
        </div>
        <Link
          to="/login"
          className="inline-flex min-h-[44px] items-center font-semibold text-[#2979FF] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2 rounded-sm"
        >
          Вернуться ко входу
        </Link>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-md p-4 text-center" aria-live="polite" aria-busy="true">
      <p className="text-sm text-[#0D1B2A]/75">Завершаем вход через Яндекс…</p>
    </section>
  )
}

export default memo(AuthCallback)
