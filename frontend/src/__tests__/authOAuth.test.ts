import { describe, expect, it } from 'vitest'
import {
  claimOAuthCodeExchange,
  getOAuthCodeFromLocation,
  getOAuthRedirectErrorFromLocation,
  getOAuthRedirectTo,
  isFlowStateNotFoundError,
  normalizeAuthCallbackLocation,
  releaseOAuthCodeExchange,
} from '../lib/authOAuth'

describe('authOAuth', () => {
  it('builds redirect URL without hash fragment', () => {
    expect(getOAuthRedirectTo('http://localhost:5173')).toBe('http://localhost:5173/auth/callback')
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
})
