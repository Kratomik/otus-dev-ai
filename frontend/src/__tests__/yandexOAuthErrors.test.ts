import { describe, expect, it } from 'vitest'
import {
  classifyAuthApiError,
  classifyYandexOAuthRedirectError,
  shouldRefreshSession,
} from '../lib/yandexOAuthErrors'

describe('yandexOAuthErrors', () => {
  it('classifies access_denied as access-denied', () => {
    expect(
      classifyYandexOAuthRedirectError({
        error: 'access_denied',
        error_description: 'User denied',
      }),
    ).toBe('access-denied')
  })

  it('classifies unverified Yandex account', () => {
    expect(
      classifyYandexOAuthRedirectError({
        error: 'access_denied',
        error_description: 'Unverified email with provider',
      }),
    ).toBe('account-unconfirmed')
  })

  it('classifies expired session from API error', () => {
    expect(
      classifyAuthApiError({
        code: 'refresh_token_not_found',
        message: 'Invalid Refresh Token',
      }),
    ).toBe('session-expired')
  })

  it('detects expired JWT by expires_at', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(shouldRefreshSession(now - 10)).toBe(true)
    expect(shouldRefreshSession(now + 3600)).toBe(false)
  })
})
