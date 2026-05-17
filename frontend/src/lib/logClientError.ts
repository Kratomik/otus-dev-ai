import { getAuthHttpStatus, shouldPersistAuthHttpLog } from './authMessages'
import { logErrorAsync, logWarnAsync } from './logger'
import { sanitizeLogContext } from './security'

export interface ClientErrorLogPayload {
  readonly error: unknown
  readonly componentStack?: string
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
  const statusLabel = payload.httpStatus != null ? String(payload.httpStatus) : 'network'
  const summary = `[API ${statusLabel}] ${sanitizeLogContext(payload.context)}`
  const stackPayload: Record<string, unknown> = {
    context: payload.context,
    httpStatus: payload.httpStatus,
    code: payload.code ?? null,
    details: payload.details ?? null,
    apiMessage: payload.message,
  }

  await logWarnAsync(`${summary}: ${payload.message}`, payload.context, stackPayload)
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
  const err =
    payload.error instanceof Error
      ? payload.error
      : new Error(typeof payload.error === 'string' ? payload.error : 'Unknown error')

  await logErrorAsync(err.message, 'client_error', {
    stack: err.stack,
    componentStack: payload.componentStack,
  })
}
