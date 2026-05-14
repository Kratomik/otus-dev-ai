import { describe, expect, it } from 'vitest'
import { shouldPersistAuthHttpLog, shouldPersistHttpLog } from '../lib/authMessages'

describe('authMessages', () => {
  it('does not persist PostgREST-style 400 by default', () => {
    expect(shouldPersistHttpLog(400)).toBe(false)
  })

  it('persists Auth 400 (e.g. invalid login) for client_errors', () => {
    expect(shouldPersistAuthHttpLog(400)).toBe(true)
  })

  it('persists Auth 401/403 and 5xx', () => {
    expect(shouldPersistAuthHttpLog(401)).toBe(true)
    expect(shouldPersistAuthHttpLog(403)).toBe(true)
    expect(shouldPersistAuthHttpLog(500)).toBe(true)
  })

  it('persists when status unknown (network-style)', () => {
    expect(shouldPersistAuthHttpLog(null)).toBe(true)
  })
})
