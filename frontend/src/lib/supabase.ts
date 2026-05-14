import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { getAuthApiUserMessage } from './authMessages'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      client_errors: {
        Row: {
          id: string
          created_at: string
          message: string | null
          stack: string | null
          component_stack: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          message?: string | null
          stack?: string | null
          component_stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          message?: string | null
          stack?: string | null
          component_stack?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      calculations: {
        Row: {
          id: string
          user_id: string
          transport: number
          food: number
          energy: number
          shopping: number
          total_co2: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transport?: number
          food?: number
          energy?: number
          shopping?: number
          total_co2: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transport?: number
          food?: number
          energy?: number
          shopping?: number
          total_co2?: string
          created_at?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          user_id: string
          xp: number
          level: number
          badges: string[]
          updated_at: string
        }
        Insert: {
          user_id: string
          xp?: number
          level?: number
          badges?: string[]
          updated_at?: string
        }
        Update: {
          user_id?: string
          xp?: number
          level?: number
          badges?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          id: number
          text: string
          co2_saving: string
          difficulty: 'Легко' | 'Средне' | 'Сложно' | null
          impact: number | null
          is_active: boolean
        }
        Insert: {
          id?: number
          text: string
          co2_saving: string
          difficulty?: 'Легко' | 'Средне' | 'Сложно' | null
          impact?: number | null
          is_active?: boolean
        }
        Update: {
          id?: number
          text?: string
          co2_saving?: string
          difficulty?: 'Легко' | 'Средне' | 'Сложно' | null
          impact?: number | null
          is_active?: boolean
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const CONFIG_MISSING_MESSAGE =
  'Supabase не настроен: задайте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в переменных окружения (файл frontend/.env.local) и перезапустите dev-сервер.'

function isConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

function createMissingConfigClient(): SupabaseClient<Database> {
  const err = new SupabaseHelperError('CONFIG_MISSING', CONFIG_MISSING_MESSAGE)
  return new Proxy(
    {},
    {
      get() {
        throw err
      },
    },
  ) as unknown as SupabaseClient<Database>
}

export const supabase: SupabaseClient<Database> = isConfigured()
  ? createClient<Database>(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: {
        // Сессия только в памяти вкладки: после полного обновления страницы нужен повторный вход.
        persistSession: false,
      },
    })
  : createMissingConfigClient()

export type SupabaseHelperErrorCode =
  | 'CONFIG_MISSING'
  | 'VALIDATION'
  | 'NETWORK'
  | 'AUTH'
  | 'UNKNOWN'

export class SupabaseHelperError extends Error {
  public readonly code: SupabaseHelperErrorCode
  public readonly cause?: unknown

  constructor(code: SupabaseHelperErrorCode, message: string, cause?: unknown) {
    super(message)
    this.name = 'SupabaseHelperError'
    this.code = code
    this.cause = cause
  }
}

export type SupabaseResult<T> = { data: T; error: null } | { data: null; error: SupabaseHelperError }

function getValidationError(message: string): SupabaseHelperError {
  return new SupabaseHelperError('VALIDATION', message)
}

function isLikelyNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  // Fetch failures in browsers often surface as TypeError("Failed to fetch")
  return err.name === 'TypeError' || /failed to fetch|networkerror|load failed/i.test(err.message)
}

function toHelperError(err: unknown): SupabaseHelperError {
  if (err instanceof SupabaseHelperError) return err
  if (isLikelyNetworkError(err)) {
    return new SupabaseHelperError('NETWORK', 'Сетевая ошибка. Проверьте подключение и повторите попытку.', err)
  }
  if (err instanceof Error) {
    return new SupabaseHelperError('UNKNOWN', err.message || 'Неизвестная ошибка.', err)
  }
  return new SupabaseHelperError('UNKNOWN', 'Неизвестная ошибка.', err)
}

function configMissingError(): SupabaseHelperError {
  return new SupabaseHelperError('CONFIG_MISSING', CONFIG_MISSING_MESSAGE)
}

export async function signUp(email: string, password: string): Promise<SupabaseResult<{ user: User | null }>> {
  if (!isConfigured()) return { data: null, error: configMissingError() }
  if (!email.trim()) return { data: null, error: getValidationError('Email обязателен.') }
  if (password.length < 8) return { data: null, error: getValidationError('Пароль должен быть не короче 8 символов.') }

  try {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      void import('./logClientError').then(({ logAuthApiError }) => {
        logAuthApiError(error, 'auth.signUp')
      })
      return { data: null, error: new SupabaseHelperError('AUTH', getAuthApiUserMessage(error), error) }
    }
    return { data: { user: data.user }, error: null }
  } catch (err: unknown) {
    return { data: null, error: toHelperError(err) }
  }
}

export async function signIn(email: string, password: string): Promise<SupabaseResult<{ user: User | null }>> {
  if (!isConfigured()) return { data: null, error: configMissingError() }
  if (!email.trim()) return { data: null, error: getValidationError('Email обязателен.') }
  if (!password) return { data: null, error: getValidationError('Пароль обязателен.') }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      void import('./logClientError').then(({ logAuthApiError }) => {
        logAuthApiError(error, 'auth.signIn')
      })
      return { data: null, error: new SupabaseHelperError('AUTH', getAuthApiUserMessage(error), error) }
    }
    return { data: { user: data.user }, error: null }
  } catch (err: unknown) {
    return { data: null, error: toHelperError(err) }
  }
}

export async function signOut(): Promise<SupabaseResult<null>> {
  if (!isConfigured()) return { data: null, error: configMissingError() }
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      void import('./logClientError').then(({ logAuthApiError }) => {
        logAuthApiError(error, 'auth.signOut')
      })
      return { data: null, error: new SupabaseHelperError('AUTH', getAuthApiUserMessage(error), error) }
    }
    return { data: null, error: null }
  } catch (err: unknown) {
    return { data: null, error: toHelperError(err) }
  }
}

export async function getCurrentUser(): Promise<SupabaseResult<{ user: User | null }>> {
  if (!isConfigured()) return { data: null, error: configMissingError() }
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      void import('./logClientError').then(({ logAuthApiError }) => {
        logAuthApiError(error, 'auth.getUser')
      })
      return { data: null, error: new SupabaseHelperError('AUTH', getAuthApiUserMessage(error), error) }
    }
    return { data: { user: data.user }, error: null }
  } catch (err: unknown) {
    return { data: null, error: toHelperError(err) }
  }
}

