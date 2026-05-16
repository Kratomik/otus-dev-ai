/**
 * Защита от XSS, CSRF и подготовка безопасных payload для PostgREST (SQL injection).
 *
 * CSRF: API через Supabase JWT в заголовке Authorization (не cookie-сессия приложения).
 * persistSession: false — токен только в памяти вкладки.
 */

const CONTROL_AND_BIDI = /[\u0000-\u001F\u007F\u200E\u200F\u202A-\u202E]/g

/** Текст из API/ошибок для безопасного вывода в React (без HTML). */
export function sanitizeDisplayText(value: string, maxLength = 2000): string {
  return value.replace(CONTROL_AND_BIDI, '').trim().slice(0, maxLength)
}

/** Ключ контекста для логов (только безопасные символы). */
export function sanitizeLogContext(context: string): string {
  const cleaned = context.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 64)
  return cleaned.length > 0 ? cleaned : 'unknown'
}

/** Целое ≥ 0 с верхней границей (PostgREST передаёт параметры, не конкатенацию SQL). */
export function clampNonNegativeInt(value: number, max = 1_000_000): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(max, Math.max(0, Math.round(value)))
}

/** Уровень ≥ 1. */
export function clampLevel(value: number, max = 9999): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(max, Math.max(1, Math.floor(value)))
}

/** total_co2 для NUMERIC(5,2). */
export function formatCo2Total(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0.00'
  return Math.min(999.99, value).toFixed(2)
}

/** Бейджи: короткие строки без управляющих символов. */
export function sanitizeBadges(badges: readonly string[] | undefined, maxCount = 20): string[] {
  if (!badges?.length) return []
  return badges
    .filter((b): b is string => typeof b === 'string')
    .map((b) => sanitizeDisplayText(b, 8))
    .filter((b) => b.length > 0)
    .slice(0, maxCount)
}

export interface CalculationInsertPayload {
  readonly transport: number
  readonly food: number
  readonly energy: number
  readonly shopping: number
  readonly total_co2: string
}

export function buildCalculationInsertPayload(input: {
  transport: number
  food: number
  energy: number
  shopping: number
  totalCo2: number
}): CalculationInsertPayload {
  return {
    transport: clampNonNegativeInt(input.transport),
    food: clampNonNegativeInt(input.food),
    energy: clampNonNegativeInt(input.energy),
    shopping: clampNonNegativeInt(input.shopping),
    total_co2: formatCo2Total(input.totalCo2),
  }
}
