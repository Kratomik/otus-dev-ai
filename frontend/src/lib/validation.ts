/** Простая проверка email (OWASP: валидация ввода на клиенте + на сервере Auth). */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim()
  if (!trimmed || trimmed.length > MAX_EMAIL_LENGTH) return false
  return EMAIL_PATTERN.test(trimmed)
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Безопасный разбор черновика из localStorage (защита от подмены структуры). */
export interface CalculationDraft {
  readonly id: string
  readonly user_id: string
  readonly transport: number
  readonly food: number
  readonly energy: number
  readonly shopping: number
  readonly total_co2: string
  readonly created_at: string
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmptyString(value: unknown, maxLen: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLen
}

export function parseCalculationDraft(raw: string): CalculationDraft | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const o = parsed as Record<string, unknown>
    if (
      !isNonEmptyString(o.id, 64) ||
      !isNonEmptyString(o.user_id, 64) ||
      !isNonEmptyString(o.total_co2, 32) ||
      !isNonEmptyString(o.created_at, 64) ||
      !isFiniteNumber(o.transport) ||
      !isFiniteNumber(o.food) ||
      !isFiniteNumber(o.energy) ||
      !isFiniteNumber(o.shopping) ||
      o.transport < 0 ||
      o.food < 0 ||
      o.energy < 0 ||
      o.shopping < 0
    ) {
      return null
    }
    return {
      id: o.id,
      user_id: o.user_id,
      transport: o.transport,
      food: o.food,
      energy: o.energy,
      shopping: o.shopping,
      total_co2: o.total_co2,
      created_at: o.created_at,
    }
  } catch {
    return null
  }
}
