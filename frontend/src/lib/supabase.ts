import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js'
import { getAuthApiUserMessage } from './authMessages'
import { isValidEmail, normalizeEmail } from './validation'
import { showToast } from './toast'
import {
  classifyAuthApiError,
  classifyYandexOAuthRedirectError,
  shouldRefreshSession,
  type OAuthRedirectErrorParams,
  type YandexOAuthErrorKind,
} from './yandexOAuthErrors'
import { getBrowserAuthStorage } from './authStorage'

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
      profiles: {
        Row: {
          id: string
          location: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          location?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          location?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
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

export function isSupabaseConfigured(): boolean {
  return isConfigured()
}

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

function createMissingConfigClient(): SupabaseClient<Database> {
  const noopSubscription = { subscription: { unsubscribe: () => undefined } }
  const configError = { message: CONFIG_MISSING_MESSAGE, name: 'AuthError', status: 500 }
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: noopSubscription }),
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: configError,
      }),
      signUp: async () => ({ data: { user: null, session: null }, error: configError }),
      signInWithOAuth: async () => ({ data: { provider: 'yandex', url: null }, error: configError }),
      signOut: async () => ({ error: null }),
    },
    from: () =>
      ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: async () => ({ data: [], error: configError }),
            }),
            maybeSingle: async () => ({ data: null, error: configError }),
            single: async () => ({ data: null, error: configError }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: configError }),
          }),
        }),
        upsert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: configError }),
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({ data: null, error: configError }),
            }),
          }),
        }),
      }) as unknown as ReturnType<SupabaseClient<Database>['from']>,
  } as unknown as SupabaseClient<Database>
}

const browserAuthStorage = getBrowserAuthStorage()

export const supabase: SupabaseClient<Database> = isConfigured()
  ? createClient<Database>(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: {
        // persistSession: true нужен, чтобы Supabase принял auth.storage (иначе только RAM).
        // createEphemeralAuthStorage: сессия в RAM, PKCE verifier в sessionStorage на редирект.
        persistSession: Boolean(browserAuthStorage),
        storage: browserAuthStorage,
        flowType: 'pkce',
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'ecotrack-web',
        },
      },
    })
  : createMissingConfigClient()

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
  if (!isValidEmail(email)) return { data: null, error: getValidationError('Укажите корректный email.') }
  if (password.length < 8) return { data: null, error: getValidationError('Пароль должен быть не короче 8 символов.') }

  const normalizedEmail = normalizeEmail(email)

  try {
    const { data, error } = await supabase.auth.signUp({ email: normalizedEmail, password })
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
  if (!isValidEmail(email)) return { data: null, error: getValidationError('Укажите корректный email.') }
  if (!password) return { data: null, error: getValidationError('Пароль обязателен.') }

  const normalizedEmail = normalizeEmail(email)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
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

export type HandleApiErrorAction =
  | { type: 'none' }
  | { type: 'toast'; message: string }
  | { type: 'redirect'; to: string }
  | { type: 'error'; message: string }
  | { type: 'session-refreshed' }

export const YANDEX_CONFIRM_PATH = '/auth/yandex-confirm'

function mapYandexOAuthKindToAction(kind: YandexOAuthErrorKind): HandleApiErrorAction {
  switch (kind) {
    case 'access-denied':
      return { type: 'toast', message: 'Доступ отклонён' }
    case 'account-unconfirmed':
      return { type: 'redirect', to: YANDEX_CONFIRM_PATH }
    case 'session-expired':
      return { type: 'session-refreshed' }
    default:
      return { type: 'error', message: 'Ошибка авторизации через Яндекс.' }
  }
}

/**
 * Обработка ошибок Yandex OAuth и просроченной сессии (>1 ч).
 * Для `session-expired` выполняет `supabase.auth.refreshSession()`.
 */
export async function handleApiError(
  error: unknown,
  context: 'yandex-oauth-redirect' | 'yandex-oauth-exchange' | 'session',
): Promise<HandleApiErrorAction> {
  if (context === 'session') {
    const { data, error: refreshError } = await supabase.auth.refreshSession()
    if (!refreshError && data.session) {
      return { type: 'session-refreshed' }
    }
    return {
      type: 'error',
      message: getAuthApiUserMessage(refreshError ?? error),
    }
  }

  const redirectParams: OAuthRedirectErrorParams | null =
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as OAuthRedirectErrorParams).error === 'string'
      ? (error as OAuthRedirectErrorParams)
      : null

  const kind = redirectParams
    ? classifyYandexOAuthRedirectError(redirectParams)
    : classifyAuthApiError(error)

  if (kind === 'session-expired') {
    const { data, error: refreshError } = await supabase.auth.refreshSession()
    if (!refreshError && data.session) {
      return { type: 'session-refreshed' }
    }
    return {
      type: 'error',
      message: getAuthApiUserMessage(refreshError ?? error),
    }
  }

  const action = mapYandexOAuthKindToAction(kind)
  if (action.type === 'toast') {
    showToast(action.message)
    return { type: 'none' }
  }
  if (action.type === 'redirect') {
    return action
  }
  if (context === 'yandex-oauth-exchange' && kind === 'unknown') {
    return {
      type: 'error',
      message: getAuthApiUserMessage(error),
    }
  }
  if (kind === 'unknown' && redirectParams) {
    const description = redirectParams.error_description ?? redirectParams.error
    return { type: 'error', message: description }
  }
  return action
}

/** Авто-обновление access token, если JWT просрочен (типично через ~1 ч). */
const YANDEX_PROFILE_SYNC_CONTEXT = 'yandex.profile.sync'

function isYandexAuthUser(user: User): boolean {
  const provider = user.app_metadata?.provider
  if (provider === 'yandex') return true
  return user.identities?.some((identity) => identity.provider === 'yandex') ?? false
}

function readAvatarUrlFromMetadata(user: User): string | null {
  const metadata = user.user_metadata
  if (!metadata || typeof metadata !== 'object') return null
  const value = (metadata as Record<string, unknown>).avatar_url
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function logYandexProfileSync(
  outcome: 'success' | 'error',
  userId: string,
  details: Record<string, unknown>,
): Promise<void> {
  const { logApiHttpErrorToSupabase } = await import('./logClientError')
  const prefix = `[${YANDEX_PROFILE_SYNC_CONTEXT}]`
  if (outcome === 'success') {
    const { error: insertError } = await supabase.from('client_errors').insert({
      message: `${prefix} success`,
      stack: JSON.stringify({ userId, ...details }),
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      user_id: userId,
    })
    if (insertError) {
      void logApiHttpErrorToSupabase({
        context: YANDEX_PROFILE_SYNC_CONTEXT,
        httpStatus: null,
        message: insertError.message,
        code: insertError.code,
      })
    }
    return
  }

  const message =
    details.message instanceof Error
      ? details.message.message
      : typeof details.message === 'string'
        ? details.message
        : 'Unknown error'

  void logApiHttpErrorToSupabase({
    context: YANDEX_PROFILE_SYNC_CONTEXT,
    httpStatus: typeof details.httpStatus === 'number' ? details.httpStatus : null,
    message,
    code: typeof details.code === 'string' ? details.code : null,
    details: JSON.stringify({ userId, ...details }),
  })
}

/**
 * При первом входе через Яндекс копирует `user_metadata.avatar_url` в `profiles.avatar_url`.
 */
export async function syncYandexProfile(user?: User | null): Promise<void> {
  if (!isConfigured()) return

  let authUser = user ?? null
  if (!authUser) {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      if (error) {
        await logYandexProfileSync('error', 'unknown', { message: error, phase: 'getUser' })
      }
      return
    }
    authUser = data.user
  }

  if (!isYandexAuthUser(authUser)) return

  const metadataAvatarUrl = readAvatarUrlFromMetadata(authUser)
  if (!metadataAvatarUrl) return

  const { data: profile, error: selectError } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', authUser.id)
    .maybeSingle()

  if (selectError) {
    await logYandexProfileSync('error', authUser.id, {
      message: selectError,
      code: selectError.code,
      phase: 'select',
    })
    return
  }

  if (profile?.avatar_url) return

  const writeQuery =
    profile === null
      ? supabase.from('profiles').insert({
          id: authUser.id,
          avatar_url: metadataAvatarUrl,
          location: 'RU',
        })
      : supabase.from('profiles').update({ avatar_url: metadataAvatarUrl }).eq('id', authUser.id)

  const { error: writeError } = await writeQuery

  if (writeError) {
    await logYandexProfileSync('error', authUser.id, {
      message: writeError,
      code: writeError.code,
      phase: profile === null ? 'insert' : 'update',
      avatarUrl: metadataAvatarUrl,
    })
    return
  }

  await logYandexProfileSync('success', authUser.id, {
    avatarUrl: metadataAvatarUrl,
    hadProfile: profile !== null,
  })
}

export async function refreshSessionIfExpired(): Promise<Session | null> {
  if (!isConfigured()) return null
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) return null
  if (!shouldRefreshSession(data.session.expires_at)) return data.session

  const refreshed = await handleApiError(data.session, 'session')
  if (refreshed.type === 'session-refreshed') {
    const { data: next } = await supabase.auth.getSession()
    return next.session
  }
  return data.session
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

