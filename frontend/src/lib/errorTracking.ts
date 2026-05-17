import {
  initGlobalAnalyticsHandlers,
  teardownGlobalAnalyticsHandlers,
  trackEvent,
} from '../hooks/useAnalytics'
import { logDebug, logInfo } from './logger'
import { sanitizeDisplayText, sanitizeLogContext } from './security'

const DEDUP_MS = 5000
const MAX_MESSAGE_LENGTH = 500
const MAX_URL_LENGTH = 2000

export type ErrorSeverity = 'critical' | 'warning' | 'error'

export interface TrackedErrorPayload {
  readonly error_type: string
  readonly error_message: string
  readonly page_url: string
  readonly user_agent: string
  readonly severity: ErrorSeverity
  readonly source?: string
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
const JWT_RE = /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi
const BEARER_RE = /bearer\s+\S+/gi
const SENSITIVE_QUERY_KEYS = new Set([
  'access_token',
  'refresh_token',
  'token',
  'code',
  'password',
  'email',
  'session',
  'apikey',
  'authorization',
])

const recentSignatures = new Map<string, number>()

/** Удаляет email, токены и чувствительные query-параметры из текста ошибки. */
export function sanitizeErrorMessage(message: string): string {
  const redacted = message
    .replace(EMAIL_RE, '[email]')
    .replace(JWT_RE, '[jwt]')
    .replace(BEARER_RE, 'Bearer [redacted]')
  return sanitizeDisplayText(redacted, MAX_MESSAGE_LENGTH)
}

/** Убирает чувствительные query-параметры из URL. */
export function sanitizePageUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin)
    const keys = [...parsed.searchParams.keys()]
    keys.forEach((key) => {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, '[redacted]')
      }
    })
    const hash = parsed.hash
    if (hash.includes('access_token') || hash.includes('refresh_token')) {
      parsed.hash = '[redacted]'
    }
    return sanitizeDisplayText(parsed.toString(), MAX_URL_LENGTH)
  } catch {
    return sanitizeDisplayText(url, MAX_URL_LENGTH)
  }
}

/** Сокращает user agent без PII-паттернов (на всякий случай — email в редких UA). */
export function sanitizeUserAgent(userAgent: string): string {
  return sanitizeErrorMessage(userAgent).slice(0, 512)
}

function normalizeToError(reason: unknown): Error {
  if (reason instanceof Error) return reason
  if (typeof reason === 'string') return new Error(reason)
  return new Error('Unknown error')
}

function buildSignature(payload: TrackedErrorPayload): string {
  return [payload.error_type, payload.error_message, payload.page_url, payload.source ?? ''].join('|')
}

function shouldReport(signature: string, now: number): boolean {
  const lastSent = recentSignatures.get(signature)
  if (lastSent !== undefined && now - lastSent < DEDUP_MS) return false
  recentSignatures.set(signature, now)
  return true
}

/** Отправляет ErrorOccurred в Метрику с дедупликацией и санитизацией. */
export function reportTrackedError(
  error: Error,
  options?: {
    readonly severity?: ErrorSeverity
    readonly source?: string
    readonly componentStack?: string
  },
): void {
  if (typeof window === 'undefined') return

  const pageUrl = sanitizePageUrl(window.location.href)
  const payload: TrackedErrorPayload = {
    error_type: sanitizeLogContext(options?.source ? `${error.name}:${options.source}` : error.name),
    error_message: sanitizeErrorMessage(
      options?.componentStack
        ? `${error.message} | ${sanitizeErrorMessage(options.componentStack).slice(0, 200)}`
        : error.message,
    ),
    page_url: pageUrl,
    user_agent: sanitizeUserAgent(navigator.userAgent),
    severity: options?.severity ?? 'critical',
    source: options?.source ? sanitizeLogContext(options.source) : undefined,
  }

  const signature = buildSignature(payload)
  const now = Date.now()
  if (!shouldReport(signature, now)) {
    logInfo('deduplicated error report', 'errorTracking', { signature })
    return
  }

  trackEvent('ErrorOccurred', payload)

  logDebug(error.message, 'errorTracking', { payload, stack: error.stack })
}

/** Унифицированный вход для Error Boundary и ручных вызовов. */
export function trackCapturedError(
  error: unknown,
  context?: { readonly source?: string; readonly componentStack?: string },
): void {
  reportTrackedError(normalizeToError(error), {
    severity: 'critical',
    source: context?.source ?? 'react_error_boundary',
    componentStack: context?.componentStack,
  })
}

/** Регистрирует глобальные обработчики через `useAnalytics` (идемпотентно). */
export function initGlobalErrorTracking(): void {
  initGlobalAnalyticsHandlers()
}

/** Снимает обработчики (для тестов). */
export function teardownGlobalErrorTracking(): void {
  teardownGlobalAnalyticsHandlers()
  recentSignatures.clear()
}
