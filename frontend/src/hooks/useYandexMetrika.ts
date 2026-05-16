import { getYandexMetrikaId } from '../lib/yandexMetrika'

/**
 * Sends a Yandex Metrika reach goal. No-op when counter ID is unset or `window.ym` is unavailable.
 */
export function trackEvent(goalName: string, params?: object): void {
  const counterId = getYandexMetrikaId()
  if (counterId === null || typeof window.ym !== 'function') return
  window.ym(counterId, 'reachGoal', goalName, params)
}
