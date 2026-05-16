import type { AuthError, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface ExchangeResult {
  error: AuthError | null
  session: Session | null
}

const inflightByCode = new Map<string, Promise<ExchangeResult>>()

/** Один PKCE exchange на code (StrictMode вызывает effect дважды). */
export function exchangeOAuthCodeForSession(code: string): Promise<ExchangeResult> {
  const existing = inflightByCode.get(code)
  if (existing) {
    return existing
  }

  const promise = supabase.auth
    .exchangeCodeForSession(code)
    .then(({ data, error }) => ({
      error,
      session: data.session ?? null,
    }))
    .finally(() => {
      inflightByCode.delete(code)
    })

  inflightByCode.set(code, promise)
  return promise
}
