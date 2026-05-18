import { supabase, isSupabaseConfigured } from './supabase'
import { sanitizeDisplayText, sanitizeLogContext } from './security'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
  level: LogLevel
  message: string
  context?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export interface StructuredLogRecord extends LogEntry {
  userAgent: string
  url: string
}

const LOG_BUFFER_KEY = 'ecotrack-log-buffer'
const LOG_BUFFER_MAX = 50
const IS_DEV = import.meta.env.DEV

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
const JWT_RE = /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi
const BEARER_RE = /bearer\s+\S+/gi

const SENSITIVE_METADATA_KEYS = new Set([
  'email',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'apikey',
  'secret',
  'session',
])

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  if (SENSITIVE_METADATA_KEYS.has(lower)) return true
  return lower.includes('password') || lower.includes('token') || lower.includes('email')
}

function redactString(value: string): string {
  return value
    .replace(EMAIL_RE, '[email]')
    .replace(JWT_RE, '[jwt]')
    .replace(BEARER_RE, 'Bearer [redacted]')
}

/** Удаляет PII из metadata перед отправкой на сервер / в Supabase. */
export function sanitizeLogMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (metadata === undefined) return undefined

  const result: Record<string, unknown> = {}

  for (const [key, raw] of Object.entries(metadata)) {
    if (isSensitiveKey(key)) {
      result[key] = '[redacted]'
      continue
    }
    if (typeof raw === 'string') {
      result[key] = redactString(raw)
      continue
    }
    if (Array.isArray(raw)) {
      result[key] = raw.map((item) =>
        typeof item === 'string' ? redactString(item) : item,
      )
      continue
    }
    if (raw !== null && typeof raw === 'object') {
      result[key] = sanitizeLogMetadata(raw as Record<string, unknown>) ?? {}
      continue
    }
    result[key] = raw
  }

  return result
}

function readBrowserContext(): Pick<StructuredLogRecord, 'userAgent' | 'url'> {
  if (typeof window === 'undefined') {
    return { userAgent: 'ssr', url: '' }
  }
  return {
    userAgent: sanitizeDisplayText(navigator.userAgent, 512),
    url: sanitizeDisplayText(window.location.href, 2000),
  }
}

function buildRecord(
  level: LogLevel,
  message: string,
  context?: string,
  metadata?: Record<string, unknown>,
): StructuredLogRecord {
  const browser = readBrowserContext()
  return {
    level,
    timestamp: new Date().toISOString(),
    message: sanitizeDisplayText(message, 2000),
    context: context !== undefined ? sanitizeLogContext(context) : undefined,
    metadata: sanitizeLogMetadata(metadata),
    userAgent: browser.userAgent,
    url: browser.url,
  }
}

function getLogsEndpoint(): string | null {
  const configured = import.meta.env.VITE_LOGS_API_URL
  if (typeof configured === 'string' && configured.trim() !== '') {
    return configured.trim()
  }
  if (IS_DEV) {
    return 'http://localhost:3002/logs'
  }
  return null
}

function readLogBuffer(): StructuredLogRecord[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOG_BUFFER_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StructuredLogRecord[]) : []
  } catch {
    return []
  }
}

function writeLogBuffer(entries: StructuredLogRecord[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(LOG_BUFFER_KEY, JSON.stringify(entries.slice(-LOG_BUFFER_MAX)))
  } catch {
    // quota / private mode
  }
}

function enqueueLogBuffer(record: StructuredLogRecord): void {
  const next = [...readLogBuffer(), record]
  writeLogBuffer(next.slice(-LOG_BUFFER_MAX))
}

function devConsoleOutput(record: StructuredLogRecord): void {
  const label = `%c[${record.level}]%c ${record.context ? `[${record.context}] ` : ''}${record.message}`
  const styles: Record<LogLevel, [string, string]> = {
    debug: ['color:#6b7280;font-weight:bold', 'color:inherit'],
    info: ['color:#2979FF;font-weight:bold', 'color:inherit'],
    warn: ['color:#f59e0b;font-weight:bold', 'color:inherit'],
    error: ['color:#dc2626;font-weight:bold', 'color:inherit'],
  }
  const [levelStyle, textStyle] = styles[record.level]
  const payload = {
    timestamp: record.timestamp,
    context: record.context,
    metadata: record.metadata,
    userAgent: record.userAgent,
    url: record.url,
  }

  switch (record.level) {
    case 'error':
      console.error(label, levelStyle, textStyle, payload)
      break
    case 'warn':
      console.warn(label, levelStyle, textStyle, payload)
      break
    case 'debug':
      console.debug(label, levelStyle, textStyle, payload)
      break
    default:
      console.info(label, levelStyle, textStyle, payload)
  }
}

async function shipToLogsEndpoint(record: StructuredLogRecord): Promise<boolean> {
  const endpoint = getLogsEndpoint()
  if (endpoint === null) return false

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      keepalive: true,
    })
    return response.ok
  } catch {
    return false
  }
}

function safeString(value: unknown, max = 4000): string | undefined {
  if (value == null) return undefined
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  if (!raw) return undefined
  const cleaned = sanitizeDisplayText(raw, max)
  return cleaned.length > 0 ? cleaned : undefined
}

async function persistClientError(record: StructuredLogRecord): Promise<void> {
  if (!isSupabaseConfigured()) return

  const stack =
    typeof record.metadata?.stack === 'string'
      ? record.metadata.stack
      : record.metadata !== undefined
        ? safeString(JSON.stringify(record.metadata))
        : undefined

  const componentStack =
    typeof record.metadata?.componentStack === 'string'
      ? record.metadata.componentStack
      : typeof record.metadata?.component_stack === 'string'
        ? record.metadata.component_stack
        : undefined

  try {
    const { error } = await supabase.from('client_errors').insert({
      message: safeString(record.message, 1000),
      stack: safeString(stack),
      component_stack: safeString(componentStack),
      url: safeString(record.url, 2000),
      user_agent: safeString(record.userAgent, 500),
    })
    if (error) {
      devConsoleOutput(
        buildRecord('warn', `client_errors insert failed: ${error.message}`, 'logger', {
          code: error.code,
        }),
      )
    }
  } catch (error: unknown) {
    devConsoleOutput(
      buildRecord('warn', 'Failed to persist client error', 'logger', {
        err: error instanceof Error ? error.message : String(error),
      }),
    )
  }
}

function shouldShipToBackend(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK.warn
}

function shouldPersistClientErrors(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK.warn
}

async function emitLogAsync(
  level: LogLevel,
  message: string,
  context?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const record = buildRecord(level, message, context, metadata)

  if (IS_DEV) {
    devConsoleOutput(record)
  }

  if (shouldPersistClientErrors(level)) {
    await persistClientError(record)
  }

  if (!IS_DEV && shouldShipToBackend(level)) {
    const ok = await shipToLogsEndpoint(record)
    if (!ok) {
      enqueueLogBuffer(record)
    }
  }
}

function emitLog(
  level: LogLevel,
  message: string,
  context?: string,
  metadata?: Record<string, unknown>,
): void {
  void emitLogAsync(level, message, context, metadata)
}

export function logInfo(
  message: string,
  context?: string,
  metadata?: Record<string, unknown>,
): void {
  emitLog('info', message, context, metadata)
}

export function logWarn(
  message: string,
  context?: string,
  metadata?: Record<string, unknown>,
): void {
  emitLog('warn', message, context, metadata)
}

export async function logWarnAsync(
  message: string,
  context?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await emitLogAsync('warn', message, context, metadata)
}

export function logError(
  message: string,
  context?: string,
  metadata?: Record<string, unknown>,
): void {
  emitLog('error', message, context, metadata)
}

export async function logErrorAsync(
  message: string,
  context?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await emitLogAsync('error', message, context, metadata)
}

export function logDebug(
  message: string,
  context?: string,
  metadata?: Record<string, unknown>,
): void {
  emitLog('debug', message, context, metadata)
}

/** Считывает и очищает буфер логов из localStorage (после восстановления сети). */
export function flushBufferedLogs(): void {
  if (IS_DEV) return
  const buffered = readLogBuffer()
  if (buffered.length === 0) return
  writeLogBuffer([])

  for (const record of buffered) {
    if (LEVEL_RANK[record.level] < LEVEL_RANK.warn) continue
    void shipToLogsEndpoint(record).then((ok) => {
      if (!ok) {
        enqueueLogBuffer(record)
      }
    })
  }
}

if (typeof window !== 'undefined' && !IS_DEV) {
  window.addEventListener('online', () => {
    flushBufferedLogs()
  })
}
