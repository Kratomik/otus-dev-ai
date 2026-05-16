import { describe, expect, it } from 'vitest'
import {
  buildCalculationInsertPayload,
  clampLevel,
  formatCo2Total,
  sanitizeBadges,
  sanitizeDisplayText,
  sanitizeLogContext,
} from '../lib/security'

describe('security', () => {
  it('sanitizeDisplayText strips control characters', () => {
    expect(sanitizeDisplayText('hello')).toBe('hello')
    expect(sanitizeDisplayText('a\u0000b')).toBe('ab')
  })

  it('sanitizeLogContext keeps safe context keys', () => {
    expect(sanitizeLogContext('auth.signIn')).toBe('auth.signIn')
    expect(sanitizeLogContext('auth;DROP')).toBe('authDROP')
  })

  it('formatCo2Total bounds numeric string for DB', () => {
    expect(formatCo2Total(23.456)).toBe('23.46')
    expect(formatCo2Total(9999)).toBe('999.99')
    expect(formatCo2Total(-1)).toBe('0.00')
  })

  it('buildCalculationInsertPayload clamps values', () => {
    const p = buildCalculationInsertPayload({
      transport: 1.9,
      food: -5,
      energy: 0,
      shopping: 2_000_000,
      totalCo2: 12.3,
    })
    expect(p.transport).toBe(2)
    expect(p.food).toBe(0)
    expect(p.shopping).toBe(1_000_000)
    expect(p.total_co2).toBe('12.30')
  })

  it('sanitizeBadges limits count and length', () => {
    expect(sanitizeBadges(['🌱', 'x'.repeat(30), 'ok'])).toEqual(['🌱', 'xxxxxxxx', 'ok'])
    expect(sanitizeBadges(Array.from({ length: 30 }, (_, i) => `b${i}`))).toHaveLength(20)
  })

  it('clampLevel enforces minimum 1', () => {
    expect(clampLevel(0)).toBe(1)
    expect(clampLevel(3.7)).toBe(3)
  })
})
