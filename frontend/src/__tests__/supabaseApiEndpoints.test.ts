import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SUPABASE_TEST_ANON_KEY,
  SUPABASE_TEST_ORIGIN,
  TEST_USER_ID,
  tokenPasswordPredicate,
} from '../test/msw/supabaseApiHandlers'
import { supabaseMswServer } from '../test/msw/supabaseMswServer'

const jsonHeaders = { 'Content-Type': 'application/json' }

const invalidCredentialsTokenHandler = http.post(tokenPasswordPredicate, () =>
  HttpResponse.json(
    {
      error: 'invalid_grant',
      error_description: 'Invalid login credentials',
    },
    { status: 400, headers: jsonHeaders },
  ),
)

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('Supabase HTTP API (MSW)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_TEST_ORIGIN)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SUPABASE_TEST_ANON_KEY)
  })

  it('POST /auth/v1/token?grant_type=password — signIn возвращает пользователя', async () => {
    const { signIn } = await import('../lib/supabase')
    const res = await signIn('ok@example.com', 'password12')
    expect(res.error).toBeNull()
    expect(res.data?.user?.id).toBe(TEST_USER_ID)
  })

  it('POST /auth/v1/token — неверный пароль → AUTH и логирование в client_errors', async () => {
    let clientErrorHits = 0
    supabaseMswServer.use(
      invalidCredentialsTokenHandler,
      http.post(
        ({ request }) =>
          new URL(request.url).origin === SUPABASE_TEST_ORIGIN &&
          new URL(request.url).pathname === '/rest/v1/client_errors',
        async () => {
          clientErrorHits += 1
          return HttpResponse.json([], { status: 201, headers: jsonHeaders })
        },
      ),
    )

    const { signIn } = await import('../lib/supabase')
    const res = await signIn('ok@example.com', 'wrong-password')
    expect(res.data).toBeNull()
    expect(res.error?.code).toBe('AUTH')
    await waitFor(() => {
      expect(clientErrorHits).toBeGreaterThanOrEqual(1)
    })
  })

  it('POST /auth/v1/signup — signUp возвращает пользователя', async () => {
    const { signUp } = await import('../lib/supabase')
    const res = await signUp('new@example.com', 'password12')
    expect(res.error).toBeNull()
    expect(res.data?.user?.id).toBe(TEST_USER_ID)
  })

  it('GET /auth/v1/user — getCurrentUser после signIn', async () => {
    const { signIn, getCurrentUser } = await import('../lib/supabase')
    await signIn('ok@example.com', 'password12')
    const res = await getCurrentUser()
    expect(res.error).toBeNull()
    expect(res.data?.user?.id).toBe(TEST_USER_ID)
  })

  it('POST /auth/v1/logout — signOut без ошибки', async () => {
    const { signIn, signOut } = await import('../lib/supabase')
    await signIn('ok@example.com', 'password12')
    const res = await signOut()
    expect(res.error).toBeNull()
  })

  it('GET /rest/v1/recommendations — useRecommendations загружает строки', async () => {
    const { useRecommendations } = await import('../hooks/useEcoData')
    const { result } = renderHook(() => useRecommendations())
    await waitFor(
      () => {
        expect(result.current.items).toHaveLength(4)
      },
      { timeout: 5000 },
    )
    expect(result.current.error).toBeNull()
    expect(result.current.items[0]?.category).toBe('transport')
  })

  it('GET /rest/v1/calculations — useCalculations после signIn', async () => {
    const { signIn } = await import('../lib/supabase')
    const { useCalculations } = await import('../hooks/useEcoData')
    await signIn('ok@example.com', 'password12')
    const { result } = renderHook(() => useCalculations())
    await waitFor(
      () => {
        expect(result.current.items).toHaveLength(1)
      },
      { timeout: 5000 },
    )
    expect(result.current.error).toBeNull()
    expect(result.current.items[0]?.user_id).toBe(TEST_USER_ID)
  })

  it('POST /rest/v1/client_errors — logApiHttpErrorToSupabase', async () => {
    let hits = 0
    supabaseMswServer.use(
      http.post(
        ({ request }) =>
          new URL(request.url).origin === SUPABASE_TEST_ORIGIN &&
          new URL(request.url).pathname === '/rest/v1/client_errors',
        async () => {
          hits += 1
          return HttpResponse.json([], { status: 201, headers: jsonHeaders })
        },
      ),
    )
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_TEST_ORIGIN)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', SUPABASE_TEST_ANON_KEY)
    const { logApiHttpErrorToSupabase } = await import('../lib/logClientError')
    await logApiHttpErrorToSupabase({
      context: 'test.manual',
      httpStatus: 503,
      message: 'upstream',
      code: 'test',
      details: null,
    })
    expect(hits).toBe(1)
  })
})
