import { useMemo } from 'react'
import { logDebug, logInfo } from '../lib/logger'
import { getYandexMetrikaId, type YmFn } from '../lib/yandexMetrika'

/** Провайдеры регистрации. */
export type AuthProvider = 'email' | 'yandex' | 'google'

export interface CalculatorCalculatedParams {
  readonly transport: number
  readonly food: number
  readonly energy: number
  readonly shopping: number
  readonly total_co2: number
}

export interface RecommendationViewedParams {
  readonly count: number
  readonly mode?: string
  readonly dominant_categories?: string
  readonly total_co2?: number
  readonly generated_count?: number
}

export interface RecommendationClickedParams {
  readonly recommendation_id: number
  readonly difficulty: string
  readonly impact: number
}

export interface ProgressViewedParams {
  readonly level: number
  readonly xp: number
  readonly badges_count: number
}

export interface UserRegisteredParams {
  readonly provider: AuthProvider
}

export interface UserLoggedInParams {
  readonly provider: string
}

export interface ErrorOccurredParams {
  readonly error_type: string
  readonly error_message: string
  readonly page_url: string
}

/** Дополнительные события EcoTrack (используются в страницах). */
export interface BadgeEarnedParams {
  readonly badge_name: string
  readonly earned_at?: string
}

export interface GoalSetParams {
  readonly goal_type: string
  readonly target_value: number
}

export interface CalculationSavedParams {
  readonly calculation_id: string
}

export interface ProgressExportedParams {
  readonly format: string
}

/** Карта имён событий → параметры. */
export interface AnalyticsEventMap {
  readonly CalculatorCalculated: CalculatorCalculatedParams
  readonly RecommendationViewed: RecommendationViewedParams
  readonly RecommendationsViewed: RecommendationViewedParams
  readonly RecommendationClicked: RecommendationClickedParams
  readonly ProgressViewed: ProgressViewedParams
  readonly BadgeEarned: BadgeEarnedParams
  readonly GoalSet: GoalSetParams
  readonly CalculationSaved: CalculationSavedParams
  readonly ProgressExported: ProgressExportedParams
  readonly UserRegistered: UserRegisteredParams
  readonly UserLoggedIn: UserLoggedInParams
  readonly ErrorOccurred: ErrorOccurredParams
  readonly SPA_Navigation: { readonly page: string }
}

export type AnalyticsEventName = keyof AnalyticsEventMap

/** Фасад Яндекс.Метрики поверх `window.ym` (для тестов и расширений). */
export interface YaMetrikaClient {
  readonly counterId: number
  reachGoal(goalName: string, params?: object): void
  hit(url: string, options?: { readonly title?: string; readonly params?: object }): void
  setParams(params: object): void
}

declare global {
  interface Window {
    YaMetrika?: YaMetrikaClient
  }
}

const isDev = import.meta.env.DEV

let activeCounterId: number | null = null
let globalHandlersInstalled = false
let previousOnError: OnErrorEventHandler | null = null
let previousOnUnhandledRejection: typeof window.onunhandledrejection = null

function devLog(message: string, payload?: unknown): void {
  if (!isDev) return
  logDebug(message, 'analytics', payload !== undefined ? { payload } : undefined)
}

function logMetrikaUnavailable(action: string, payload?: unknown): void {
  logInfo(`Metrika unavailable — ${action}`, 'analytics', payload !== undefined ? { payload } : undefined)
}

function getYm(): YmFn | undefined {
  return typeof window.ym === 'function' ? window.ym : undefined
}

function resolveCounterId(): number | null {
  return activeCounterId ?? getYandexMetrikaId()
}

function createYaMetrikaClient(counterId: number): YaMetrikaClient {
  return {
    counterId,
    reachGoal(goalName, params) {
      getYm()?.(counterId, 'reachGoal', goalName, params)
    },
    hit(url, options) {
      getYm()?.(counterId, 'hit', url, options)
    },
    setParams(params) {
      getYm()?.(counterId, 'params', params)
    },
  }
}

function getYaMetrikaClient(): YaMetrikaClient | null {
  const counterId = resolveCounterId()
  if (counterId === null) return null
  if (window.YaMetrika?.counterId === counterId) return window.YaMetrika
  if (!getYm()) return null
  const client = createYaMetrikaClient(counterId)
  window.YaMetrika = client
  return client
}

function sendReachGoal(eventName: string, params?: object): void {
  const counterId = resolveCounterId()
  if (counterId === null) {
    logMetrikaUnavailable('reachGoal', { eventName, params })
    return
  }

  const client = getYaMetrikaClient()
  if (!client) {
    logMetrikaUnavailable('reachGoal', { eventName, params })
    return
  }

  client.reachGoal(eventName, params)
  devLog('reachGoal', { counterId, eventName, params })
}

function normalizeToError(reason: unknown): Error {
  if (reason instanceof Error) return reason
  if (typeof reason === 'string') return new Error(reason)
  return new Error('Unknown error')
}

/** Инициализирует фасад `window.YaMetrika` и счётчик Метрики. */
export function init(counterId: number): void {
  activeCounterId = counterId
  const ym = getYm()
  if (!ym) {
    logMetrikaUnavailable('init', { counterId })
    return
  }
  window.YaMetrika = createYaMetrikaClient(counterId)
  ym(counterId, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    trackHash: true,
  })
  devLog('init', { counterId })
}

/** Отправляет JavaScript-событие (reachGoal) в Яндекс.Метрику. */
export function trackEvent<T extends object = object>(eventName: string, params?: T): void {
  sendReachGoal(eventName, params)
}

/** Типобезопасная отправка события из `AnalyticsEventMap`. */
export function trackAnalyticsEvent<E extends AnalyticsEventName>(
  eventName: E,
  params: AnalyticsEventMap[E],
): void {
  trackEvent(eventName, params)
}

/** Виртуальный просмотр страницы (HashRouter / SPA). */
export function trackPageView(page: string): void {
  trackEvent('SPA_Navigation', { page })

  const counterId = resolveCounterId()
  const ym = getYm()
  if (counterId === null || !ym) {
    logMetrikaUnavailable('trackPageView', { page })
    return
  }

  if (typeof window !== 'undefined') {
    ym(counterId, 'hit', window.location.href, { title: page })
  }
  devLog('trackPageView', { page })
}

/** Привязывает UserID к визитам в Метрике. */
export function setUserId(userId: string): void {
  const counterId = resolveCounterId()
  const ym = getYm()
  if (counterId === null || !ym) {
    logMetrikaUnavailable('setUserId', { userId })
    return
  }
  ym(counterId, 'setUserID', userId)
  devLog('setUserId', { userId })
}

/** Отправляет событие ErrorOccurred. */
export function trackError(error: Error, context: string): void {
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''
  const params: ErrorOccurredParams = {
    error_type: `${error.name}:${context}`,
    error_message: error.message,
    page_url: pageUrl,
  }
  trackEvent('ErrorOccurred', params)
}

/** Обновляет виртуальный просмотр с заголовком страницы. */
export function setPageTitle(title: string): void {
  const counterId = resolveCounterId()
  const ym = getYm()
  if (counterId === null || !ym || typeof window === 'undefined') {
    logMetrikaUnavailable('setPageTitle', { title })
    return
  }
  ym(counterId, 'hit', window.location.href, { title })
  devLog('setPageTitle', { title })
}

/** Алиас reachGoal для целей Метрики. */
export function trackGoal(goalId: string, params?: object): void {
  trackEvent(goalId, params)
}

function handleWindowError(
  message: Event | string,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error,
): boolean {
  const err =
    error ??
    new Error(
      typeof message === 'string'
        ? message
        : `Script error at ${source ?? 'unknown'}:${lineno ?? 0}:${colno ?? 0}`,
    )
  trackError(err, 'window.onerror')
  if (typeof previousOnError === 'function') {
    return previousOnError.call(window, message, source, lineno, colno, error) ?? false
  }
  return false
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  trackError(normalizeToError(event.reason), 'unhandledrejection')
  if (typeof previousOnUnhandledRejection === 'function') {
    previousOnUnhandledRejection.call(window, event)
  }
}

/** Регистрирует глобальные обработчики ошибок (идемпотентно). */
export function initGlobalAnalyticsHandlers(): void {
  if (typeof window === 'undefined' || globalHandlersInstalled) return
  globalHandlersInstalled = true
  previousOnError = window.onerror
  previousOnUnhandledRejection = window.onunhandledrejection
  window.onerror = handleWindowError
  window.onunhandledrejection = handleUnhandledRejection
}

/** Снимает глобальные обработчики (для тестов). */
export function teardownGlobalAnalyticsHandlers(): void {
  if (!globalHandlersInstalled || typeof window === 'undefined') return
  window.onerror = previousOnError
  window.onunhandledrejection = previousOnUnhandledRejection
  previousOnError = null
  previousOnUnhandledRejection = null
  globalHandlersInstalled = false
}

export interface UseAnalyticsResult {
  readonly init: typeof init
  readonly trackEvent: typeof trackEvent
  readonly trackAnalyticsEvent: typeof trackAnalyticsEvent
  readonly trackPageView: typeof trackPageView
  readonly setUserId: typeof setUserId
  readonly setPageTitle: typeof setPageTitle
  readonly trackGoal: typeof trackGoal
  readonly trackError: typeof trackError
  readonly trackCalculator: (params: CalculatorCalculatedParams) => void
  readonly trackRecommendation: (params: RecommendationClickedParams) => void
  readonly trackProgress: (params: ProgressViewedParams) => void
  readonly trackCalculatorCalculated: (params: CalculatorCalculatedParams) => void
  readonly trackRecommendationViewed: (params: RecommendationViewedParams) => void
  readonly trackRecommendationsViewed: (params: RecommendationViewedParams) => void
  readonly trackRecommendationClicked: (params: RecommendationClickedParams) => void
  readonly trackProgressViewed: (params: ProgressViewedParams) => void
  readonly trackBadgeEarned: (params: BadgeEarnedParams) => void
  readonly trackGoalSet: (params: GoalSetParams) => void
  readonly trackUserRegistered: (params: UserRegisteredParams) => void
  readonly trackUserLoggedIn: (params: UserLoggedInParams) => void
}

/** Хук с мемоизированными методами аналитики для React-компонентов. */
export function useAnalytics(): UseAnalyticsResult {
  return useMemo(
    () => ({
      init,
      trackEvent,
      trackAnalyticsEvent,
      trackPageView,
      setUserId,
      setPageTitle,
      trackGoal,
      trackError,
      trackCalculator: (params) => trackAnalyticsEvent('CalculatorCalculated', params),
      trackRecommendation: (params) => trackAnalyticsEvent('RecommendationClicked', params),
      trackProgress: (params) => trackAnalyticsEvent('ProgressViewed', params),
      trackCalculatorCalculated: (params) => trackAnalyticsEvent('CalculatorCalculated', params),
      trackRecommendationViewed: (params) => trackAnalyticsEvent('RecommendationViewed', params),
      trackRecommendationsViewed: (params) => trackAnalyticsEvent('RecommendationsViewed', params),
      trackRecommendationClicked: (params) =>
        trackAnalyticsEvent('RecommendationClicked', params),
      trackProgressViewed: (params) => trackAnalyticsEvent('ProgressViewed', params),
      trackBadgeEarned: (params) => trackAnalyticsEvent('BadgeEarned', params),
      trackGoalSet: (params) => trackAnalyticsEvent('GoalSet', params),
      trackUserRegistered: (params) => trackAnalyticsEvent('UserRegistered', params),
      trackUserLoggedIn: (params) => trackAnalyticsEvent('UserLoggedIn', params),
    }),
    [],
  )
}
