import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase, type Database } from '../lib/supabase'

type ViewState = 'idle' | 'loading' | 'error' | 'success'

type CalculationRow = Database['public']['Tables']['calculations']['Row']
type RecommendationRow = Database['public']['Tables']['recommendations']['Row']
type UserProgressRow = Database['public']['Tables']['user_progress']['Row']

const LAST_CALCULATION_STORAGE_KEY = 'eco:last_calculation'

function redirectToLogin(): void {
  // App uses HashRouter, so login route lives under "#/login".
  if (window.location.hash.startsWith('#/login')) return
  window.location.assign('/#/login')
}

function getSupabaseStatus(error: PostgrestError | null): number | null {
  if (!error) return null
  // PostgrestError may include HTTP status as a number in newer clients.
  const maybe = (error as unknown as { status?: unknown }).status
  return typeof maybe === 'number' ? maybe : null
}

function isUnauthorized(error: PostgrestError | null): boolean {
  const status = getSupabaseStatus(error)
  return status === 401
}

function normalizeErrorMessage(error: PostgrestError | Error | unknown): string {
  if (error instanceof Error) return error.message || 'Unexpected error.'
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message?: unknown }).message
    return typeof msg === 'string' && msg.trim() ? msg : 'Unexpected error.'
  }
  return 'Unexpected error.'
}

function readLastCalculationDraft(): CalculationRow | null {
  try {
    const raw = window.localStorage.getItem(LAST_CALCULATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    return parsed as CalculationRow
  } catch {
    return null
  }
}

function writeLastCalculationDraft(row: CalculationRow): void {
  try {
    window.localStorage.setItem(LAST_CALCULATION_STORAGE_KEY, JSON.stringify(row))
  } catch {
    // ignore storage failures
  }
}

export interface UseCalculationsResult {
  readonly state: ViewState
  readonly loading: boolean
  readonly saving: boolean
  readonly success: boolean
  readonly error: string | null
  readonly items: CalculationRow[]
  readonly lastSaved: CalculationRow | null
  readonly reload: () => Promise<void>
  readonly saveCalculation: (payload: {
    transport: number
    food: number
    energy: number
    shopping: number
    totalCo2: number
  }) => Promise<CalculationRow | null>
}

export function useCalculations(): UseCalculationsResult {
  const [state, setState] = useState<ViewState>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<CalculationRow[]>([])
  const [lastSaved, setLastSaved] = useState<CalculationRow | null>(() =>
    typeof window === 'undefined' ? null : readLastCalculationDraft(),
  )

  const setLoading = useCallback(() => {
    setState('loading')
    setError(null)
  }, [])

  const setSuccess = useCallback(() => {
    setState('success')
    setError(null)
  }, [])

  const setFailure = useCallback((message: string) => {
    setState('error')
    setError(message)
  }, [])

  const reload = useCallback(async () => {
    setLoading()
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) {
        redirectToLogin()
        return
      }

      const { data, error: queryError } = await supabase
        .from('calculations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (isUnauthorized(queryError)) {
        redirectToLogin()
        return
      }
      if (queryError) {
        setFailure(queryError.message)
        return
      }

      setItems(data ?? [])
      setSuccess()
    } catch (err: unknown) {
      setFailure(normalizeErrorMessage(err))
    }
  }, [setFailure, setLoading, setSuccess])

  const saveCalculation = useCallback<
    UseCalculationsResult['saveCalculation']
  >(async ({ transport, food, energy, shopping, totalCo2 }) => {
    setSaving(true)
    setError(null)
    const values = [transport, food, energy, shopping, totalCo2]
    if (values.some((v) => !Number.isFinite(v) || v < 0)) {
      setFailure('Invalid calculation values.')
      setSaving(false)
      return null
    }

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) {
        redirectToLogin()
        setSaving(false)
        return null
      }

      const { data, error: insertError } = await supabase
        .from('calculations')
        .insert({
          user_id: userId,
          transport: Math.round(transport),
          food: Math.round(food),
          energy: Math.round(energy),
          shopping: Math.round(shopping),
          total_co2: totalCo2.toFixed(2),
        })
        .select('*')
        .single()

      if (isUnauthorized(insertError)) {
        redirectToLogin()
        setSaving(false)
        return null
      }
      if (insertError) {
        setFailure(insertError.message)
        setSaving(false)
        return null
      }

      if (data) {
        writeLastCalculationDraft(data)
        setLastSaved(data)
        setItems((prev) => [data, ...prev])
      }
      setSuccess()
      setSaving(false)
      return data ?? null
    } catch (err: unknown) {
      setFailure(normalizeErrorMessage(err))
      setSaving(false)
      return null
    }
  }, [setFailure, setLoading, setSuccess])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  const loading = state === 'loading'
  const success = state === 'success'

  return useMemo(
    () => ({
      state,
      loading,
      saving,
      success,
      error,
      items,
      lastSaved,
      reload,
      saveCalculation,
    }),
    [error, items, lastSaved, loading, reload, saveCalculation, saving, state, success],
  )
}

export interface ProgressPayload {
  readonly xp: number
  readonly level: number
  readonly badges?: string[]
}

export interface UseProgressResult {
  readonly state: ViewState
  readonly loading: boolean
  readonly success: boolean
  readonly error: string | null
  readonly data: UserProgressRow | null
  readonly reload: () => Promise<void>
  readonly upsert: (payload: ProgressPayload) => Promise<UserProgressRow | null>
}

export function useProgress(): UseProgressResult {
  const [state, setState] = useState<ViewState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<UserProgressRow | null>(null)

  const setLoading = useCallback(() => {
    setState('loading')
    setError(null)
  }, [])

  const setSuccess = useCallback(() => {
    setState('success')
    setError(null)
  }, [])

  const setFailure = useCallback((message: string) => {
    setState('error')
    setError(message)
  }, [])

  const reload = useCallback(async () => {
    setLoading()
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) {
        redirectToLogin()
        return
      }

      const { data: row, error: queryError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (isUnauthorized(queryError)) {
        redirectToLogin()
        return
      }
      if (queryError) {
        setFailure(queryError.message)
        return
      }

      setData(row ?? null)
      setSuccess()
    } catch (err: unknown) {
      setFailure(normalizeErrorMessage(err))
    }
  }, [setFailure, setLoading, setSuccess])

  const upsert = useCallback<UseProgressResult['upsert']>(
    async (payload) => {
      setLoading()
      if (!Number.isFinite(payload.xp) || payload.xp < 0) {
        setFailure('XP must be a non-negative number.')
        return null
      }
      if (!Number.isInteger(payload.level) || payload.level < 1) {
        setFailure('Level must be an integer ≥ 1.')
        return null
      }

      try {
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData.user?.id
        if (!userId) {
          redirectToLogin()
          return null
        }

        const { data: row, error: upsertError } = await supabase
          .from('user_progress')
          .upsert(
            {
              user_id: userId,
              xp: Math.floor(payload.xp),
              level: payload.level,
              badges: payload.badges ?? [],
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          )
          .select('*')
          .single()

        if (isUnauthorized(upsertError)) {
          redirectToLogin()
          return null
        }
        if (upsertError) {
          setFailure(upsertError.message)
          return null
        }

        setData(row)
        setSuccess()
        return row
      } catch (err: unknown) {
        setFailure(normalizeErrorMessage(err))
        return null
      }
    },
    [setFailure, setLoading, setSuccess],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  const loading = state === 'loading'
  const success = state === 'success'

  return useMemo(
    () => ({
      state,
      loading,
      success,
      error,
      data,
      reload,
      upsert,
    }),
    [data, error, loading, reload, state, success, upsert],
  )
}

export interface UseRecommendationsResult {
  readonly state: ViewState
  readonly loading: boolean
  readonly success: boolean
  readonly error: string | null
  readonly items: RecommendationRow[]
  readonly reload: () => Promise<void>
}

export function useRecommendations(): UseRecommendationsResult {
  const [state, setState] = useState<ViewState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<RecommendationRow[]>([])

  const setLoading = useCallback(() => {
    setState('loading')
    setError(null)
  }, [])

  const setSuccess = useCallback(() => {
    setState('success')
    setError(null)
  }, [])

  const setFailure = useCallback((message: string) => {
    setState('error')
    setError(message)
  }, [])

  const reload = useCallback(async () => {
    setLoading()
    try {
      const { data, error: queryError } = await supabase
        .from('recommendations')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: false })
        .limit(50)

      if (isUnauthorized(queryError)) {
        redirectToLogin()
        return
      }
      if (queryError) {
        setFailure(queryError.message)
        return
      }

      setItems(data ?? [])
      setSuccess()
    } catch (err: unknown) {
      setFailure(normalizeErrorMessage(err))
    }
  }, [setFailure, setLoading, setSuccess])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  const loading = state === 'loading'
  const success = state === 'success'

  return useMemo(
    () => ({
      state,
      loading,
      success,
      error,
      items,
      reload,
    }),
    [error, items, loading, reload, state, success],
  )
}

