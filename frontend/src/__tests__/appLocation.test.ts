import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildAppLocationUrl,
  getOAuthCallbackPathname,
  getOAuthCallbackUrl,
} from '../lib/appLocation'

describe('appLocation', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds hash URL at site root', () => {
    vi.stubEnv('BASE_URL', '/')
    expect(buildAppLocationUrl('#/login')).toBe('http://localhost:3000/#/login')
  })

  it('builds hash URL with GitHub Pages project base', () => {
    vi.stubEnv('BASE_URL', '/otus-dev-ai/')
    expect(buildAppLocationUrl('#/login')).toBe(
      'http://localhost:3000/otus-dev-ai/#/login',
    )
  })

  it('builds OAuth callback pathname with base', () => {
    vi.stubEnv('BASE_URL', '/otus-dev-ai/')
    expect(getOAuthCallbackPathname()).toBe('/otus-dev-ai/auth/callback')
    expect(getOAuthCallbackUrl('https://kratomik.github.io')).toBe(
      'https://kratomik.github.io/otus-dev-ai/auth/callback',
    )
  })
})
