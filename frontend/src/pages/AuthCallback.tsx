import { memo, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { applyHandleApiErrorAction } from '../lib/applyApiErrorAction'
import { getAuthApiUserMessage } from '../lib/authMessages'
import { exchangeOAuthCodeForSession } from '../lib/authExchange'
import {
  clearOAuthParamsFromUrl,
  getOAuthCodeFromLocation,
  getOAuthRedirectErrorFromLocation,
  isFlowStateNotFoundError,
  isPkceVerifierMissingError,
} from '../lib/authOAuth'
import { finishAuthSession } from '../lib/finishAuthSession'
import { handleApiError, supabase } from '../lib/supabase'

function oauthFailureMessage(error: unknown): string {
  if (isPkceVerifierMissingError(error)) {
    return 'Сессия OAuth сброшена. Начните вход через Яндекс заново (не обновляйте страницу).'
  }
  if (isFlowStateNotFoundError(error)) {
    return 'Код входа уже использован или устарел. Начните вход через Яндекс заново.'
  }
  return getAuthApiUserMessage(error)
}

function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const fail = (message: string): void => {
      clearOAuthParamsFromUrl()
      setError(message)
    }

    const complete = async () => {
      const redirectError = getOAuthRedirectErrorFromLocation()
      if (redirectError) {
        const action = await handleApiError(redirectError, 'yandex-oauth-redirect')
        if (!active) return
        const stopped = applyHandleApiErrorAction(action, navigate, setError) === 'stop'
        if (!stopped) {
          fail(redirectError.error_description ?? redirectError.error)
        } else {
          clearOAuthParamsFromUrl()
        }
        return
      }

      const { data: existingSession } = await supabase.auth.getSession()
      if (!active) return
      if (existingSession.session) {
        clearOAuthParamsFromUrl()
        await finishAuthSession(navigate, () => active)
        return
      }

      const code = getOAuthCodeFromLocation()
      if (!code) {
        fail('Не найден код авторизации. Начните вход через Яндекс с страницы входа.')
        return
      }

      const { error: exchangeError, session } = await exchangeOAuthCodeForSession(code)
      if (!active) return

      if (session) {
        clearOAuthParamsFromUrl()
        await finishAuthSession(navigate, () => active)
        return
      }

      if (exchangeError) {
        const action = await handleApiError(exchangeError, 'yandex-oauth-exchange')
        if (!active) return
        if (action.type === 'session-refreshed') {
          const { data: refreshed } = await supabase.auth.getSession()
          if (refreshed.session) {
            clearOAuthParamsFromUrl()
            await finishAuthSession(navigate, () => active)
            return
          }
        }
        const stopped = applyHandleApiErrorAction(action, navigate, setError) === 'stop'
        if (!stopped) {
          fail(oauthFailureMessage(exchangeError))
        } else {
          clearOAuthParamsFromUrl()
        }
        return
      }

      const { data: afterExchange } = await supabase.auth.getSession()
      if (!active) return
      if (afterExchange.session) {
        clearOAuthParamsFromUrl()
        await finishAuthSession(navigate, () => active)
        return
      }

      fail('Не удалось завершить вход. Начните вход через Яндекс заново (не обновляйте эту страницу).')
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active || !nextSession) return
      clearOAuthParamsFromUrl()
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
