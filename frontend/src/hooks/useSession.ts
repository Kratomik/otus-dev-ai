import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, refreshSessionIfExpired, supabase } from '../lib/supabase'

type ViewState = 'loading' | 'error' | 'success'

export interface UseSessionResult {
  readonly state: ViewState
  readonly loading: boolean
  readonly success: boolean
  readonly error: string | null
  readonly currentUser: User | null
}

export function useSession(): UseSessionResult {
  const [state, setState] = useState<ViewState>(() =>
    isSupabaseConfigured() ? 'loading' : 'success',
  )
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return
    }

    let active = true

    const load = async () => {
      try {
        await refreshSessionIfExpired()
        const { data, error } = await supabase.auth.getUser()
        if (!active) return
        if (error) {
          setState('error')
          setError(error.message)
          return
        }
        setCurrentUser(data.user ?? null)
        setState('success')
        setError(null)
      } catch (err: unknown) {
        if (!active) return
        const message = err instanceof Error ? err.message : 'Unexpected error.'
        setState('error')
        setError(message)
      }
    }

    void load()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setCurrentUser(session?.user ?? null)
      setState('success')
      setError(null)
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const loading = state === 'loading'
  const success = state === 'success'

  return useMemo(
    () => ({
      state,
      loading,
      success,
      error,
      currentUser,
    }),
    [currentUser, error, loading, state, success],
  )
}

