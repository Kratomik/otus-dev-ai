/** OAuth redirect URI must not contain `#` (fragment is not sent back to the client). */
export function getOAuthRedirectTo(origin: string = window.location.origin): string {
  return `${origin}/auth/callback`
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
