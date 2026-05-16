import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getYandexMetrikaId } from '../lib/yandexMetrika'
import { trackEvent } from '../hooks/useYandexMetrika'

describe('useYandexMetrika', () => {
  const ym = vi.fn()

  beforeEach(() => {
    vi.stubEnv('VITE_YANDEX_METRIKA_ID', '109250000')
    window.ym = ym
    ym.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.ym
  })

  it('parses counter id from env', () => {
    expect(getYandexMetrikaId()).toBe(109250000)
  })

  it('sends reachGoal when ym is available', () => {
    trackEvent('SPA_Navigation', { page: '/calculator' })
    expect(ym).toHaveBeenCalledWith(109250000, 'reachGoal', 'SPA_Navigation', { page: '/calculator' })
  })

  it('no-ops when ym is missing', () => {
    delete window.ym
    trackEvent('SPA_Navigation', { page: '/login' })
    expect(ym).not.toHaveBeenCalled()
  })

  it('no-ops when counter id is unset', () => {
    vi.stubEnv('VITE_YANDEX_METRIKA_ID', '')
    trackEvent('SPA_Navigation')
    expect(ym).not.toHaveBeenCalled()
  })
})
