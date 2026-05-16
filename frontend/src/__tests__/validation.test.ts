import { describe, expect, it } from 'vitest'
import { isValidEmail, normalizeEmail, parseCalculationDraft } from '../lib/validation'

describe('validation', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com')
  })

  it('rejects invalid emails', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('a@')).toBe(false)
  })

  it('parses valid calculation draft', () => {
    const draft = {
      id: 'id-1',
      user_id: 'u-1',
      transport: 1,
      food: 2,
      energy: 3,
      shopping: 4,
      total_co2: '10.00',
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(parseCalculationDraft(JSON.stringify(draft))).toEqual(draft)
  })

  it('rejects tampered calculation draft', () => {
    expect(parseCalculationDraft('{"id":"<script>"}')).toBeNull()
    expect(parseCalculationDraft('not json')).toBeNull()
  })
})
