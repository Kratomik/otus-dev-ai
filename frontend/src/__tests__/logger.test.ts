import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeLogMetadata } from '../lib/logger'

describe('logger', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('redacts sensitive metadata keys and email patterns', () => {
    expect(
      sanitizeLogMetadata({
        email: 'user@example.com',
        password: 'secret',
        token: 'abc',
        note: 'contact user@mail.com',
      }),
    ).toEqual({
      email: '[redacted]',
      password: '[redacted]',
      token: '[redacted]',
      note: 'contact [email]',
    })
  })

  it('buffers failed prod warn logs in localStorage (max 50)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    vi.stubEnv('DEV', false)
    vi.stubEnv('PROD', true)
    vi.resetModules()

    const { logWarn } = await import('../lib/logger')

    logWarn('network down', 'test')

    await vi.waitFor(() => {
      const raw = localStorage.getItem('ecotrack-log-buffer')
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw ?? '[]') as { message: string }[]
      expect(parsed.some((entry) => entry.message === 'network down')).toBe(true)
    })
  })
})
