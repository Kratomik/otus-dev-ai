/** OAuth redirect URI must not contain `#` (fragment is not sent back to the client). */
export function getOAuthRedirectTo(origin: string = window.location.origin): string {
  return `${origin}/auth/callback`
}

/**
 * Параметры authorize для Yandex ID.
 * @see https://yandex.com/dev/id/doc/en/codes/screen-code#code-request — force_confirm
 */
export const YANDEX_OAUTH_QUERY_PARAMS: Readonly<Record<string, string>> = {
  force_confirm: 'yes',
}

export interface YandexSignInOAuthOptions {
  redirectTo: string
  queryParams: Record<string, string>
}

/** Опции signInWithOAuth: всегда показывать выбор аккаунта Яндекса и экран разрешений. */
export function getYandexSignInOAuthOptions(
  origin: string = window.location.origin,
): YandexSignInOAuthOptions {
  return {
    redirectTo: getOAuthRedirectTo(origin),
    queryParams: { ...YANDEX_OAUTH_QUERY_PARAMS },
  }
}

const OAUTH_EXCHANGE_CODE_KEY = 'ecotrack-oauth-exchange-code'

/** Move ?code= / ?error= from pathname search into `/#/auth/callback?…` for HashRouter. */
export function normalizeAuthCallbackLocation(location: Location = window.location): boolean {
  const { pathname, search, hash, origin } = location
  const hasOAuthParams =
    search.includes('code=') ||
    search.includes('error=') ||
    search.includes('error_description=')

  if (hasOAuthParams && hash !== `#/auth/callback${search}`) {
    location.replace(`${origin}/#/auth/callback${search}`)
    return true
  }

  if (!hash || hash === '#') {
    if (pathname === '/login' || pathname === '/register' || pathname === '/auth/callback') {
      location.replace(`${origin}/#${pathname}${search}`)
      return true
    }
    location.replace(`${origin}/#/login`)
    return true
  }

  if (
    (pathname === '/login' || pathname === '/register' || pathname === '/auth/callback') &&
    !hash.startsWith('#/')
  ) {
    location.replace(`${origin}/#${pathname}${search}`)
    return true
  }

  return false
}

/** PKCE auth code from `?code=` (pathname or `/#/auth/callback?code=`). */
export function getOAuthCodeFromLocation(location: Location = window.location): string | null {
  const fromSearch = new URLSearchParams(location.search).get('code')
  if (fromSearch) return fromSearch

  const queryStart = location.hash.indexOf('?')
  if (queryStart === -1) return null
  return new URLSearchParams(location.hash.slice(queryStart + 1)).get('code')
}

function getOAuthQueryParams(location: Location): URLSearchParams {
  if (location.search) {
    return new URLSearchParams(location.search)
  }
  const queryStart = location.hash.indexOf('?')
  if (queryStart === -1) return new URLSearchParams()
  return new URLSearchParams(location.hash.slice(queryStart + 1))
}

export function getOAuthRedirectErrorFromLocation(
  location: Location = window.location,
): { error: string; error_description: string | null } | null {
  const params = getOAuthQueryParams(location)
  const error = params.get('error')
  if (!error) return null
  return {
    error,
    error_description: params.get('error_description'),
  }
}

export function getOAuthErrorFromLocation(location: Location = window.location): string | null {
  const redirectError = getOAuthRedirectErrorFromLocation(location)
  if (!redirectError) return null
  return redirectError.error_description ?? redirectError.error
}

/**
 * React StrictMode mounts effects twice; the second PKCE exchange hits a consumed flow_state.
 * Only the first mount should call `exchangeCodeForSession`.
 */
export function claimOAuthCodeExchange(code: string): boolean {
  try {
    const current = sessionStorage.getItem(OAUTH_EXCHANGE_CODE_KEY)
    if (current === code) return false
    sessionStorage.setItem(OAUTH_EXCHANGE_CODE_KEY, code)
    return true
  } catch {
    return true
  }
}

export function releaseOAuthCodeExchange(code: string): void {
  try {
    if (sessionStorage.getItem(OAUTH_EXCHANGE_CODE_KEY) === code) {
      sessionStorage.removeItem(OAUTH_EXCHANGE_CODE_KEY)
    }
  } catch {
    // ignore
  }
}

export function isFlowStateNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const rec = error as { code?: unknown; message?: unknown }
  if (rec.code === 'flow_state_not_found') return true
  return (
    typeof rec.message === 'string' &&
    rec.message.toLowerCase().includes('invalid flow state')
  )
}

export function isPkceVerifierMissingError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const rec = error as { code?: unknown; message?: unknown }
  if (rec.code === 'pkce_code_verifier_missing') return true
  const message = typeof rec.message === 'string' ? rec.message.toLowerCase() : ''
  return message.includes('code verifier') || message.includes('both auth code')
}

/** Убирает одноразовый ?code= из hash/search (повторное F5 иначе ломает вход). */
export function clearOAuthParamsFromUrl(location: Location = window.location): void {
  const url = new URL(location.href)
  let changed = false

  for (const key of ['code', 'error', 'error_description', 'state'] as const) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }

  const hashQueryIdx = url.hash.indexOf('?')
  if (hashQueryIdx !== -1) {
    const baseHash = url.hash.slice(0, hashQueryIdx)
    const params = new URLSearchParams(url.hash.slice(hashQueryIdx + 1))
    const hadOAuth =
      params.has('code') || params.has('error') || params.has('error_description')
    for (const key of ['code', 'error', 'error_description', 'state'] as const) {
      params.delete(key)
    }
    if (hadOAuth) {
      const rest = params.toString()
      url.hash = rest ? `${baseHash}?${rest}` : baseHash || '#/login'
      changed = true
    }
  }

  if (changed) {
    window.history.replaceState(window.history.state, '', url.toString())
  }
}
