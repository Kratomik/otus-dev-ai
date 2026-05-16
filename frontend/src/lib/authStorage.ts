/**
 * Supabase при persistSession: false всегда использует in-memory storage и
 * игнорирует `auth.storage`. PKCE verifier тогда теряется при редиректе OAuth.
 *
 * Этот адаптер сохраняет только `-code-verifier` в sessionStorage (переживает
 * уход на Яндекс и обратно), а токен сессии — только в памяти вкладки (F5 → выход).
 */

const PKCE_VERIFIER_SUFFIX = '-code-verifier'

export interface AuthKeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function isPkceVerifierKey(key: string): boolean {
  return key.endsWith(PKCE_VERIFIER_SUFFIX)
}

export function createEphemeralAuthStorage(
  durable: AuthKeyValueStorage,
): AuthKeyValueStorage {
  const sessionMemory: Record<string, string> = {}

  return {
    getItem(key: string): string | null {
      if (isPkceVerifierKey(key)) {
        return durable.getItem(key)
      }
      return sessionMemory[key] ?? null
    },
    setItem(key: string, value: string): void {
      if (isPkceVerifierKey(key)) {
        durable.setItem(key, value)
        return
      }
      sessionMemory[key] = value
    },
    removeItem(key: string): void {
      if (isPkceVerifierKey(key)) {
        durable.removeItem(key)
        return
      }
      delete sessionMemory[key]
    },
  }
}

/** Удаляет устаревшие сессии из sessionStorage/localStorage после смены стратегии хранения. */
export function clearLegacyPersistedAuthSessions(): void {
  if (typeof window === 'undefined') return

  for (const store of [window.sessionStorage, window.localStorage]) {
    const keysToRemove: string[] = []
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i)
      if (!key) continue
      if (key.startsWith('sb-') && key.endsWith('-auth-token') && !key.endsWith(PKCE_VERIFIER_SUFFIX)) {
        keysToRemove.push(key)
      }
      if (key.startsWith('sb-') && key.endsWith('-auth-token-user')) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      store.removeItem(key)
    }
  }
}

export function getBrowserAuthStorage(): AuthKeyValueStorage | undefined {
  if (typeof window === 'undefined') return undefined
  return createEphemeralAuthStorage(window.sessionStorage)
}
