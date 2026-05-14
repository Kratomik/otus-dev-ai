import { supabase } from './supabase'
import { getAuthHttpStatus, shouldPersistAuthHttpLog } from './authMessages'

export interface ClientErrorLogPayload {
  readonly error: unknown
  readonly componentStack?: string
}

function safeString(value: unknown, max = 4000): string | undefined {
  if (value == null) return undefined
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  if (!raw) return undefined
  return raw.length > max ? `${raw.slice(0, max)}…` : raw
}

export interface ApiHttpLogPayload {
  readonly context: string
  readonly httpStatus: number | null
  readonly message: string
  readonly code?: string | null
  readonly details?: string | null
}

/** Логирование HTTP/сетевых ошибок API (best-effort, не бросает). */
export async function logApiHttpErrorToSupabase(payload: ApiHttpLogPayload): Promise<void> {
  try {
    const statusLabel = payload.httpStatus != null ? String(payload.httpStatus) : 'network'
    const summary = `[API ${statusLabel}] ${payload.context}`
    const stackPayload = {
      context: payload.context,
      httpStatus: payload.httpStatus,
      code: payload.code ?? null,
      details: payload.details ?? null,
      apiMessage: payload.message,
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(summary, stackPayload)
    }

    const { error } = await supabase.from('client_errors').insert({
      message: safeString(`${summary}: ${payload.message}`, 1000),
      stack: safeString(JSON.stringify(stackPayload)),
      url: safeString(window.location.href, 2000),
      user_agent: safeString(navigator.userAgent, 500),
    })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('Supabase client_errors insert failed (API log)', error.message, error)
    }
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.warn('Failed to log API error to Supabase', e)
  }
}

export function logAuthApiError(error: unknown, context: string): void {
  const status = getAuthHttpStatus(error)
  if (!shouldPersistAuthHttpLog(status)) return
  const message = error instanceof Error ? error.message : String(error)
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : null
  void logApiHttpErrorToSupabase({
    context,
    httpStatus: status,
    message,
    code,
    details: null,
  })
}

export async function logClientErrorToSupabase(payload: ClientErrorLogPayload): Promise<void> {
  try {
    const err = payload.error instanceof Error ? payload.error : new Error(safeString(payload.error) ?? 'Unknown error')

    // Best-effort only: logging must never crash the app.
    const { error } = await supabase.from('client_errors').insert({
      message: safeString(err.message, 1000),
      stack: safeString(err.stack),
      component_stack: safeString(payload.componentStack),
      url: safeString(window.location.href, 2000),
      user_agent: safeString(navigator.userAgent, 500),
    })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('Supabase client_errors insert failed', error.message, error)
    }
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.warn('Failed to log client error to Supabase', e)
  }
}

