import { describe, expect, it, vi } from 'vitest'
import {
  claimOAuthCodeExchange,
  clearOAuthParamsFromUrl,
  getOAuthCodeFromLocation,
  getOAuthRedirectErrorFromLocation,
  getOAuthRedirectTo,
  getYandexSignInOAuthOptions,
  isFlowStateNotFoundError,
  normalizeAuthCallbackLocation,
  releaseOAuthCodeExchange,
  YANDEX_OAUTH_QUERY_PARAMS,
} from '../lib/authOAuth'

describe('authOAuth', () => {
  it('builds redirect URL without hash fragment', () => {
    expect(getOAuthRedirectTo('http://localhost:5173')).toBe('http://localhost:5173/auth/callback')
  })

  it('requests Yandex account picker via force_confirm', () => {
    expect(YANDEX_OAUTH_QUERY_PARAMS).toEqual({ force_confirm: 'yes' })
    expect(getYandexSignInOAuthOptions('http://localhost:5173')).toEqual({
      redirectTo: 'http://localhost:5173/auth/callback',
      queryParams: { force_confirm: 'yes' },
    })
  })

  it('normalizes empty hash on GitHub Pages project path to login under base', () => {
    vi.stubEnv('BASE_URL', '/otus-dev-ai/')
    let replaced = ''
    const location = {
      pathname: '/otus-dev-ai/',
      search: '',
      hash: '',
      origin: 'https://kratomik.github.io',
      replace: (url: string) => {
        replaced = url
      },
    } as unknown as Location

    expect(normalizeAuthCallbackLocation(location)).toBe(true)
    expect(replaced).toBe('https://kratomik.github.io/otus-dev-ai/#/login')
    vi.unstubAllEnvs()
  })

  it('normalizes ?code= on root with hash route', () => {
    let replaced = ''
    const location = {
      pathname: '/',
      search: '?code=abc&state=xyz',
      hash: '#/auth/callback',
      origin: 'http://localhost:5173',
      replace: (url: string) => {
        replaced = url
      },
    } as unknown as Location

    expect(normalizeAuthCallbackLocation(location)).toBe(true)
    expect(replaced).toBe('http://localhost:5173/#/auth/callback?code=abc&state=xyz')
  })

  it('reads auth code from hash route query', () => {
    const location = {
      href: 'http://localhost:5173/#/auth/callback?code=be6c49f4-1c40-41a9-a58a-85eeb5725dc1',
      origin: 'http://localhost:5173',
      search: '',
      hash: '#/auth/callback?code=be6c49f4-1c40-41a9-a58a-85eeb5725dc1',
    } as Location

    expect(getOAuthCodeFromLocation(location)).toBe('be6c49f4-1c40-41a9-a58a-85eeb5725dc1')
  })

  it('reads auth code from pathname search before hash normalization', () => {
    const location = {
      href: 'http://localhost:5173/?code=abc#/auth/callback',
      origin: 'http://localhost:5173',
      search: '?code=abc',
      hash: '#/auth/callback',
    } as Location

    expect(getOAuthCodeFromLocation(location)).toBe('abc')
  })

  it('allows only one PKCE exchange per auth code in sessionStorage', () => {
    sessionStorage.clear()
    expect(claimOAuthCodeExchange('code-a')).toBe(true)
    expect(claimOAuthCodeExchange('code-a')).toBe(false)
    expect(claimOAuthCodeExchange('code-b')).toBe(true)
    releaseOAuthCodeExchange('code-b')
    expect(claimOAuthCodeExchange('code-b')).toBe(true)
    sessionStorage.clear()
  })

  it('reads structured OAuth redirect error from hash', () => {
    const location = {
      search: '',
      hash: '#/auth/callback?error=access_denied&error_description=denied',
    } as Location
    expect(getOAuthRedirectErrorFromLocation(location)).toEqual({
      error: 'access_denied',
      error_description: 'denied',
    })
  })

  it('detects flow_state_not_found auth errors', () => {
    expect(
      isFlowStateNotFoundError({
        code: 'flow_state_not_found',
        message: 'invalid flow state, no valid flow state found',
      }),
    ).toBe(true)
    expect(isFlowStateNotFoundError(new Error('other'))).toBe(false)
  })

  it('clears OAuth params from hash URL', () => {
    let replaced = ''
    const location = {
      href: 'http://localhost:5173/#/auth/callback?code=used-code',
      hash: '#/auth/callback?code=used-code',
      search: '',
      origin: 'http://localhost:5173',
    } as Location
    const history = {
      state: null,
      replaceState: (_state: unknown, _title: string, url: string) => {
        replaced = url
      },
    }
    vi.stubGlobal('history', history)
    clearOAuthParamsFromUrl(location)
    expect(replaced).toBe('http://localhost:5173/#/auth/callback')
    vi.unstubAllGlobals()
  })
})
