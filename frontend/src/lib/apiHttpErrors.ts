import type { PostgrestError } from '@supabase/supabase-js'
import { shouldPersistHttpLog } from './authMessages'
import { logApiHttpErrorToSupabase } from './logClientError'
import { logWarn } from './logger'

/** HTTP-код из PostgREST / Supabase REST (если клиент его отдаёт). */
export function getPostgrestHttpStatus(error: PostgrestError | null): number | null {
  if (!error) return null
  const maybe = (error as unknown as { status?: unknown }).status
  return typeof maybe === 'number' ? maybe : null
}

/** Понятное пользователю сообщение по HTTP-коду и телу PostgREST. */
export function getPostgrestUserMessage(error: PostgrestError): string {
  const status = getPostgrestHttpStatus(error)
  if (status === 401) {
    return 'Сессия недействительна или вы не авторизованы. Войдите снова.'
  }
  if (status === 403) {
    return 'Недостаточно прав для этой операции. Проверьте вход в аккаунт или политики доступа.'
  }
  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return 'Сервер временно недоступен. Попробуйте позже.'
  }
  const msg = typeof error.message === 'string' && error.message.trim() ? error.message.trim() : null
  return msg ?? 'Ошибка при обращении к серверу.'
}

export type PostgrestErrorOutcome =
  | { kind: 'ok' }
  | { kind: 'redirect-login' }
  | { kind: 'fail'; message: string }

/**
 * Обрабатывает ошибку PostgREST: логирует 401 / 403 / 5xx и неизвестный статус, возвращает сценарий для UI.
 */
export function interpretPostgrestError(error: PostgrestError | null, context: string): PostgrestErrorOutcome {
  if (!error) return { kind: 'ok' }
  const status = getPostgrestHttpStatus(error)
  if (shouldPersistHttpLog(status)) {
    void logApiHttpErrorToSupabase({
      context,
      httpStatus: status,
      message: error.message,
      code: error.code,
      details: error.details ?? null,
    })
  }
  if (status === 401) return { kind: 'redirect-login' }
  return { kind: 'fail', message: getPostgrestUserMessage(error) }
}

function isLikelyBrowserNetworkFailure(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(err.message)
}

/** Исключения вокруг await supabase (без PostgrestError в ответе). */
export function interpretCaughtRequestError(err: unknown, context: string): string {
  if (isLikelyBrowserNetworkFailure(err)) {
    void logApiHttpErrorToSupabase({
      context,
      httpStatus: null,
      message: err instanceof Error ? err.message : String(err),
      code: 'browser_network',
      details: null,
    })
    return 'Сетевая ошибка. Проверьте подключение и повторите попытку.'
  }
  logWarn(`[API catch] ${context}`, context, {
    err: err instanceof Error ? err.message : String(err),
  })
  if (err instanceof Error && err.message.trim()) return err.message.trim()
  return 'Не удалось выполнить запрос.'
}
