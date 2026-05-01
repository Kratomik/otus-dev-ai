import { supabase } from './supabase'

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

export async function logClientErrorToSupabase(payload: ClientErrorLogPayload): Promise<void> {
  try {
    const err = payload.error instanceof Error ? payload.error : new Error(safeString(payload.error) ?? 'Unknown error')

    // Best-effort only: logging must never crash the app.
    await supabase.from('client_errors').insert({
      message: safeString(err.message, 1000),
      stack: safeString(err.stack),
      component_stack: safeString(payload.componentStack),
      url: safeString(window.location.href, 2000),
      user_agent: safeString(navigator.userAgent, 500),
    })
  } catch (e: unknown) {
    // eslint-disable-next-line no-console
    console.warn('Failed to log client error to Supabase', e)
  }
}

