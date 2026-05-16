import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  initGlobalErrorTracking,
  reportTrackedError,
  sanitizeErrorMessage,
  sanitizePageUrl,
  teardownGlobalErrorTracking,
} from '../lib/errorTracking'
vi.mock('../hooks/useAnalytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useAnalytics')>()
  return {
    ...actual,
    trackEvent: vi.fn(),
  }
})

import { trackEvent } from '../hooks/useAnalytics'

describe('errorTracking', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_YANDEX_METRIKA_ID', '109250000')
    vi.mocked(trackEvent).mockClear()
    teardownGlobalErrorTracking()
  })

  afterEach(() => {
    teardownGlobalErrorTracking()
    vi.unstubAllEnvs()
  })

  it('sanitizes email and tokens in messages', () => {
    const cleaned = sanitizeErrorMessage('User user@example.com failed Bearer secret123')
    expect(cleaned).not.toContain('user@example.com')
    expect(cleaned).toContain('[email]')
    expect(cleaned).toContain('[redacted]')
  })

  it('redacts sensitive query params in URLs', () => {
    const cleaned = sanitizePageUrl(
      'https://app.test/#/login?code=abc&access_token=xyz&page=1',
    )
    expect(cleaned).not.toContain('abc')
    expect(cleaned).not.toContain('xyz')
    expect(cleaned).toContain('[redacted]')
  })

  it('deduplicates identical errors within 5 seconds', () => {
    vi.useFakeTimers()
    const err = new Error('duplicate failure')
    reportTrackedError(err, { source: 'test' })
    reportTrackedError(err, { source: 'test' })
    expect(trackEvent).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(5001)
    reportTrackedError(err, { source: 'test' })
    expect(trackEvent).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('sends ErrorOccurred to Metrika with severity critical', () => {
    reportTrackedError(new Error('boom'), { source: 'unit_test' })
    expect(trackEvent).toHaveBeenCalledWith(
      'ErrorOccurred',
      expect.objectContaining({
        error_type: expect.stringContaining('Error'),
        error_message: 'boom',
        severity: 'critical',
        user_agent: expect.any(String),
      }),
    )
  })

  it('registers global handlers once', () => {
    const onerror = vi.fn()
    window.onerror = onerror
    initGlobalErrorTracking()
    initGlobalErrorTracking()
    expect(window.onerror).not.toBe(onerror)
    teardownGlobalErrorTracking()
    expect(window.onerror).toBe(onerror)
  })
})
