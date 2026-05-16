import { describe, expect, it, beforeEach } from 'vitest'
import {
  clearLegacyPersistedAuthSessions,
  createEphemeralAuthStorage,
  type AuthKeyValueStorage,
} from '../lib/authStorage'

function createMemoryStore(): AuthKeyValueStorage & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return {
    data,
    getItem(key) {
      return data[key] ?? null
    },
    setItem(key, value) {
      data[key] = value
    },
    removeItem(key) {
      delete data[key]
    },
  }
}

describe('authStorage', () => {
  let durable: ReturnType<typeof createMemoryStore>

  beforeEach(() => {
    durable = createMemoryStore()
    sessionStorage.clear()
    localStorage.clear()
  })

  it('persists PKCE verifier in durable storage only', () => {
    const storage = createEphemeralAuthStorage(durable)
    storage.setItem('sb-localhost-auth-token-code-verifier', 'verifier-xyz')
    storage.setItem('sb-localhost-auth-token', '{"access_token":"x"}')

    expect(durable.getItem('sb-localhost-auth-token-code-verifier')).toBe('verifier-xyz')
    expect(durable.getItem('sb-localhost-auth-token')).toBeNull()
    expect(storage.getItem('sb-localhost-auth-token')).toBe('{"access_token":"x"}')
  })

  it('drops session from ephemeral layer on remove', () => {
    const storage = createEphemeralAuthStorage(durable)
    storage.setItem('sb-localhost-auth-token', 'session')
    storage.removeItem('sb-localhost-auth-token')
    expect(storage.getItem('sb-localhost-auth-token')).toBeNull()
  })

  it('clears legacy sb-* session keys from browser storage', () => {
    sessionStorage.setItem('sb-localhost-auth-token', 'old-session')
    sessionStorage.setItem('sb-localhost-auth-token-code-verifier', 'keep-me')
    localStorage.setItem('sb-localhost-auth-token-user', '{}')

    clearLegacyPersistedAuthSessions()

    expect(sessionStorage.getItem('sb-localhost-auth-token')).toBeNull()
    expect(sessionStorage.getItem('sb-localhost-auth-token-code-verifier')).toBe('keep-me')
    expect(localStorage.getItem('sb-localhost-auth-token-user')).toBeNull()
  })
})
