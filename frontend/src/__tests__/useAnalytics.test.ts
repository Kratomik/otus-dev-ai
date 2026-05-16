import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  init,
  setPageTitle,
  setUserId,
  trackAnalyticsEvent,
  trackError,
  trackEvent,
  trackGoal,
  trackPageView,
} from '../hooks/useAnalytics'

describe('useAnalytics', () => {
  const ym = vi.fn()

  beforeEach(() => {
    vi.stubEnv('VITE_YANDEX_METRIKA_ID', '109250000')
    window.ym = ym
    ym.mockClear()
    delete window.YaMetrika
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.ym
    delete window.YaMetrika
  })

  it('init configures YaMetrika and calls ym init', () => {
    init(109250000)
    expect(window.YaMetrika?.counterId).toBe(109250000)
    expect(ym).toHaveBeenCalledWith(
      109250000,
      'init',
      expect.objectContaining({ clickmap: true }),
    )
  })

  it('trackEvent sends reachGoal via YaMetrika', () => {
    trackEvent('SPA_Navigation', { page: '/calculator' })
    expect(ym).toHaveBeenCalledWith(109250000, 'reachGoal', 'SPA_Navigation', {
      page: '/calculator',
    })
    expect(window.YaMetrika?.counterId).toBe(109250000)
  })

  it('trackAnalyticsEvent sends typed CalculatorCalculated', () => {
    trackAnalyticsEvent('CalculatorCalculated', {
      transport: 1,
      food: 2,
      energy: 3,
      shopping: 4,
      total_co2: 10,
    })
    expect(ym).toHaveBeenCalledWith(
      109250000,
      'reachGoal',
      'CalculatorCalculated',
      expect.objectContaining({ total_co2: 10 }),
    )
  })

  it('setPageTitle sends hit with title', () => {
    setPageTitle('EcoTrack — Calculator')
    expect(ym).toHaveBeenCalledWith(
      109250000,
      'hit',
      expect.any(String),
      expect.objectContaining({ title: 'EcoTrack — Calculator' }),
    )
  })

  it('trackGoal is an alias for trackEvent', () => {
    trackGoal('custom_goal', { foo: 'bar' })
    expect(ym).toHaveBeenCalledWith(109250000, 'reachGoal', 'custom_goal', { foo: 'bar' })
  })

  it('trackError sends ErrorOccurred', () => {
    trackError(new Error('boom'), 'calculator')
    expect(ym).toHaveBeenCalledWith(
      109250000,
      'reachGoal',
      'ErrorOccurred',
      expect.objectContaining({
        error_type: 'Error:calculator',
        error_message: 'boom',
      }),
    )
  })

  it('no-ops when ym is missing', () => {
    delete window.ym
    trackEvent('SPA_Navigation')
    expect(ym).not.toHaveBeenCalled()
  })

  it('trackPageView sends SPA_Navigation and hit', () => {
    trackPageView('/progress')
    expect(ym).toHaveBeenCalledWith(109250000, 'reachGoal', 'SPA_Navigation', { page: '/progress' })
    expect(ym).toHaveBeenCalledWith(
      109250000,
      'hit',
      expect.any(String),
      expect.objectContaining({ title: '/progress' }),
    )
  })

  it('setUserId calls ym setUserID', () => {
    setUserId('user-abc')
    expect(ym).toHaveBeenCalledWith(109250000, 'setUserID', 'user-abc')
  })
})
