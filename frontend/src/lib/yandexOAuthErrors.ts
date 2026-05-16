/** OAuth redirect params after failed Yandex / GoTrue external login. */
export interface OAuthRedirectErrorParams {
  error: string
  error_description: string | null
}

export type YandexOAuthErrorKind =
  | 'access-denied'
  | 'account-unconfirmed'
  | 'session-expired'
  | 'unknown'

const ONE_HOUR_SECONDS = 3600

const UNCONFIRMED_ACCOUNT_RE =
  /unverified|not verified|не подтвержд|неподтвержд|account.*not.*confirm|login not verified|подтвердите.*яндекс|yandex.*confirm/i

const SESSION_EXPIRED_RE =
  /expired|истек|invalid refresh|refresh_token_not_found|session_expired|invalid_grant|token.*invalid/i

export function classifyYandexOAuthRedirectError(
  params: OAuthRedirectErrorParams,
): YandexOAuthErrorKind {
  const code = params.error.toLowerCase()
  const description = (params.error_description ?? '').toLowerCase()

  if (code === 'access_denied') {
    if (UNCONFIRMED_ACCOUNT_RE.test(description)) return 'account-unconfirmed'
    return 'access-denied'
  }

  if (UNCONFIRMED_ACCOUNT_RE.test(description) || UNCONFIRMED_ACCOUNT_RE.test(code)) {
    return 'account-unconfirmed'
  }

  if (SESSION_EXPIRED_RE.test(description) || SESSION_EXPIRED_RE.test(code)) {
    return 'session-expired'
  }

  return 'unknown'
}

export function classifyAuthApiError(error: unknown): YandexOAuthErrorKind {
  if (typeof error !== 'object' || error === null) return 'unknown'

  const rec = error as {
    code?: unknown
    message?: unknown
    error?: unknown
    error_description?: unknown
  }

  const code = String(rec.code ?? rec.error ?? '').toLowerCase()
  const message = String(rec.message ?? rec.error_description ?? '').toLowerCase()
  const combined = `${code} ${message}`

  if (code === 'access_denied' && UNCONFIRMED_ACCOUNT_RE.test(message)) {
    return 'account-unconfirmed'
  }
  if (code === 'access_denied') return 'access-denied'
  if (UNCONFIRMED_ACCOUNT_RE.test(combined)) return 'account-unconfirmed'
  if (
    SESSION_EXPIRED_RE.test(combined) ||
    code === 'refresh_token_not_found' ||
    code === 'session_expired'
  ) {
    return 'session-expired'
  }

  return 'unknown'
}

export function isSessionOlderThanOneHour(expiresAtSeconds: number | undefined): boolean {
  if (expiresAtSeconds == null || expiresAtSeconds <= 0) return false
  const now = Math.floor(Date.now() / 1000)
  return now >= expiresAtSeconds || expiresAtSeconds - now <= 0
}

export function shouldRefreshSession(expiresAtSeconds: number | undefined): boolean {
  return isSessionOlderThanOneHour(expiresAtSeconds)
}

export { ONE_HOUR_SECONDS }
