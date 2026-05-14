/** Только сообщения / статусы для Auth без импорта supabase (избегаем циклических зависимостей). */

export function getAuthHttpStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null
  const rec = error as { __isAuthError?: unknown; status?: unknown }
  if (rec.__isAuthError !== true) return null
  return typeof rec.status === 'number' ? rec.status : null
}

/** Для PostgREST: не пишем «шумные» 4xx (валидация, PGRST116 и т.д.), только 401/403/5xx и сеть. */
export function shouldPersistHttpLog(status: number | null): boolean {
  if (status == null) return true
  if (status === 401 || status === 403) return true
  return status >= 500 && status < 600
}

/**
 * Для Auth (GoTrue): включая 400 — неверный пароль (`invalid_credentials`) и прочие ошибки клиента Auth.
 * Иначе неудачный вход не попадает в `client_errors`, хотя в UI ошибка показывается.
 */
export function shouldPersistAuthHttpLog(status: number | null): boolean {
  if (status == null) return true
  if (status === 400 || status === 401 || status === 403) return true
  return status >= 500 && status < 600
}

export function getAuthApiUserMessage(error: unknown): string {
  const s = getAuthHttpStatus(error)
  if (s === 401) return 'Неверный email или пароль, либо сессия истекла. Попробуйте войти снова.'
  if (s === 403) return 'Доступ запрещён. Проверьте настройки проекта или свяжитесь с поддержкой.'
  if (s === 500 || s === 502 || s === 503 || s === 504) {
    return 'Сервер авторизации временно недоступен. Попробуйте позже.'
  }
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  return 'Ошибка авторизации.'
}
