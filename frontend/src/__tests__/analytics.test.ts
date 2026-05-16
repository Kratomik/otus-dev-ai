import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { YaMetrikaClient } from '../hooks/useAnalytics'

/** Мок счётчика Метрики для unit-тестов (аналог yaCounter). */
export function createMockYaMetrika(counterId: number): YaMetrikaClient & {
  readonly reachGoal: ReturnType<typeof vi.fn>
  readonly hit: ReturnType<typeof vi.fn>
  readonly setParams: ReturnType<typeof vi.fn>
} {
  return {
    counterId,
    reachGoal: vi.fn(),
    hit: vi.fn(),
    setParams: vi.fn(),
  }
}

describe('analytics', () => {
  let init: typeof import('../hooks/useAnalytics').init
  let trackEvent: typeof import('../hooks/useAnalytics').trackEvent
  let trackError: typeof import('../hooks/useAnalytics').trackError
  let initGlobalAnalyticsHandlers: typeof import('../hooks/useAnalytics').initGlobalAnalyticsHandlers
  let teardownGlobalAnalyticsHandlers: typeof import('../hooks/useAnalytics').teardownGlobalAnalyticsHandlers

  const ym = vi.fn()

  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('VITE_YANDEX_METRIKA_ID', '109250000')
    window.ym = ym
    ym.mockClear()
    delete window.YaMetrika

    const analytics = await import('../hooks/useAnalytics')
    init = analytics.init
    trackEvent = analytics.trackEvent
    trackError = analytics.trackError
    initGlobalAnalyticsHandlers = analytics.initGlobalAnalyticsHandlers
    teardownGlobalAnalyticsHandlers = analytics.teardownGlobalAnalyticsHandlers
  })

  afterEach(() => {
    teardownGlobalAnalyticsHandlers()
    vi.unstubAllEnvs()
    delete window.ym
    delete window.YaMetrika
  })

  describe('init', () => {
    it('creates window.YaMetrika when counterId is provided and ym exists', () => {
      init(109250000)
      expect(window.YaMetrika).toBeDefined()
      expect(window.YaMetrika?.counterId).toBe(109250000)
      expect(ym).toHaveBeenCalledWith(
        109250000,
        'init',
        expect.objectContaining({ clickmap: true, trackLinks: true }),
      )
    })

    it('does not throw when window.ym is missing', () => {
      delete window.ym
      expect(() => init(109250000)).not.toThrow()
      expect(window.YaMetrika).toBeUndefined()
    })

    it('does not throw when env counter id is unset and ym is missing', async () => {
      vi.unstubAllEnvs()
      vi.stubEnv('VITE_YANDEX_METRIKA_ID', '')
      delete window.ym
      vi.resetModules()
      const { init: initFresh, trackEvent: trackFresh } = await import('../hooks/useAnalytics')
      expect(() => initFresh(109250000)).not.toThrow()
      expect(() => trackFresh('test_event')).not.toThrow()
    })
  })

  describe('trackEvent', () => {
    it('calls yaCounter.reachGoal with event name and params', () => {
      const yaCounter = createMockYaMetrika(109250000)
      window.YaMetrika = yaCounter

      trackEvent('calculator_calculated', {
        transport: 1,
        food: 2,
        energy: 3,
        shopping: 4,
        total_co2: 10,
      })

      expect(yaCounter.reachGoal).toHaveBeenCalledTimes(1)
      expect(yaCounter.reachGoal).toHaveBeenCalledWith('calculator_calculated', {
        transport: 1,
        food: 2,
        energy: 3,
        shopping: 4,
        total_co2: 10,
      })
    })

    it('falls back to ym reachGoal when YaMetrika is built via init', () => {
      init(109250000)
      trackEvent('SPA_Navigation', { page: '/calculator' })
      expect(ym).toHaveBeenCalledWith(109250000, 'reachGoal', 'SPA_Navigation', {
        page: '/calculator',
      })
    })

    it('does not throw when yaCounter and ym are absent', async () => {
      vi.unstubAllEnvs()
      vi.stubEnv('VITE_YANDEX_METRIKA_ID', '')
      delete window.ym
      delete window.YaMetrika
      vi.resetModules()
      const { trackEvent: trackFresh } = await import('../hooks/useAnalytics')
      expect(() => trackFresh('orphan_event')).not.toThrow()
    })
  })

  describe('trackError and global handlers', () => {
    it('trackError sends ErrorOccurred with expected parameters', () => {
      const yaCounter = createMockYaMetrika(109250000)
      window.YaMetrika = yaCounter

      trackError(new Error('auth failed'), 'auth_error')

      expect(yaCounter.reachGoal).toHaveBeenCalledWith(
        'ErrorOccurred',
        expect.objectContaining({
          error_type: 'Error:auth_error',
          error_message: 'auth failed',
          page_url: expect.any(String),
        }),
      )
    })

    it('global onerror handler reports ErrorOccurred via reachGoal', () => {
      const yaCounter = createMockYaMetrika(109250000)
      window.YaMetrika = yaCounter
      initGlobalAnalyticsHandlers()

      const handler = window.onerror
      expect(handler).toBeTypeOf('function')
      handler?.call(window, 'Script error', 'app.js', 1, 2, new Error('global boom'))

      expect(yaCounter.reachGoal).toHaveBeenCalledWith(
        'ErrorOccurred',
        expect.objectContaining({
          error_type: 'Error:window.onerror',
          error_message: 'global boom',
          page_url: expect.any(String),
        }),
      )
    })

    it('global unhandledrejection handler reports ErrorOccurred', () => {
      const yaCounter = createMockYaMetrika(109250000)
      window.YaMetrika = yaCounter
      initGlobalAnalyticsHandlers()

      const handler = window.onunhandledrejection
      expect(handler).toBeTypeOf('function')
      handler?.call(window, { reason: new Error('promise rejected') } as PromiseRejectionEvent)

      expect(yaCounter.reachGoal).toHaveBeenCalledWith(
        'ErrorOccurred',
        expect.objectContaining({
          error_type: 'Error:unhandledrejection',
          error_message: 'promise rejected',
        }),
      )
    })
  })
})
