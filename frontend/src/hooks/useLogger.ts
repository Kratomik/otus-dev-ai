import { useMemo } from 'react'
import { logDebug, logError, logInfo, logWarn } from '../lib/logger'

export interface LoggerApi {
  readonly info: (message: string, metadata?: Record<string, unknown>) => void
  readonly warn: (message: string, metadata?: Record<string, unknown>) => void
  readonly error: (message: string, metadata?: Record<string, unknown>) => void
  readonly debug: (message: string, metadata?: Record<string, unknown>) => void
}

/**
 * Контекстный логгер для React-компонентов (имя файла/фичи в поле `context`).
 */
export function useLogger(context: string): LoggerApi {
  return useMemo(
    () => ({
      info: (message, metadata) => logInfo(message, context, metadata),
      warn: (message, metadata) => logWarn(message, context, metadata),
      error: (message, metadata) => logError(message, context, metadata),
      debug: (message, metadata) => logDebug(message, context, metadata),
    }),
    [context],
  )
}
