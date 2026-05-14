import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'

/** Фиксированный origin для MSW (не должен совпадать с реальным локальным Kong). */
export const SUPABASE_TEST_ORIGIN = 'http://127.0.0.1:54329'

/** Произвольная строка apikey — в тестах не валидируется. */
export const SUPABASE_TEST_ANON_KEY = 'sb-publishable-test-anon-key'

export const TEST_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

/** Минимальный JWT (три сегмента), чтобы клиент мог передать его в Authorization. */
export const TEST_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhYWFhYWFhYS1hYWFhLWFhYWEtYWFhYS1hYWFhYWFhYWFhYWEiLCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTYwMDAwMDAwMH0.test-signature'

const jsonHeaders = { 'Content-Type': 'application/json' }

function isOrigin(url: string): boolean {
  try {
    return new URL(url).origin === SUPABASE_TEST_ORIGIN
  } catch {
    return false
  }
}

const sampleCalculation = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  user_id: TEST_USER_ID,
  transport: 1,
  food: 2,
  energy: 3,
  shopping: 4,
  total_co2: '5.00',
  created_at: '2026-05-14T12:00:00.000Z',
}

const sampleRecommendation = {
  id: 1,
  text: 'Test recommendation',
  co2_saving: '0.1 т CO₂/год',
  difficulty: 'Легко' as const,
  impact: 5,
  is_active: true,
}

export function tokenPasswordPredicate({ request }: { request: Request }): boolean {
  if (request.method !== 'POST') return false
  if (!isOrigin(request.url)) return false
  const u = new URL(request.url)
  return u.pathname === '/auth/v1/token' && u.searchParams.get('grant_type') === 'password'
}

/** Handlers для эндпоинтов Auth и PostgREST, которые дергает приложение. */
export function createDefaultSupabaseHandlers(): HttpHandler[] {
  return [
    http.post(tokenPasswordPredicate, async ({ request }) => {
      const body = (await request.json()) as { email?: string; password?: string }
      if (!body.email || !body.password) {
        return HttpResponse.json({ error: 'invalid_request' }, { status: 400 })
      }
      return HttpResponse.json(
        {
          access_token: TEST_ACCESS_TOKEN,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'refresh-test-token',
          user: {
            id: TEST_USER_ID,
            aud: 'authenticated',
            role: 'authenticated',
            email: body.email,
            email_confirmed_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {},
            identities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        { headers: jsonHeaders },
      )
    }),

    http.post(
      ({ request }) => isOrigin(request.url) && new URL(request.url).pathname === '/auth/v1/signup',
      async ({ request }) => {
        const body = (await request.json()) as { email?: string; password?: string }
        if (!body.email || !body.password) {
          return HttpResponse.json({ error: 'invalid_request' }, { status: 400 })
        }
        return HttpResponse.json(
          {
            access_token: TEST_ACCESS_TOKEN,
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'refresh-signup',
            user: {
              id: TEST_USER_ID,
              aud: 'authenticated',
              role: 'authenticated',
              email: body.email,
              email_confirmed_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {},
              identities: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          { headers: jsonHeaders },
        )
      },
    ),

    http.get(
      ({ request }) => isOrigin(request.url) && new URL(request.url).pathname === '/auth/v1/user',
      ({ request }) => {
        const auth = request.headers.get('Authorization') ?? ''
        if (!auth.includes(TEST_ACCESS_TOKEN)) {
          return HttpResponse.json({ error: 'invalid_jwt' }, { status: 401, headers: jsonHeaders })
        }
        return HttpResponse.json(
          {
            user: {
              id: TEST_USER_ID,
              aud: 'authenticated',
              role: 'authenticated',
              email: 'ok@example.com',
              email_confirmed_at: new Date().toISOString(),
              app_metadata: {},
              user_metadata: {},
              identities: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          { headers: jsonHeaders },
        )
      },
    ),

    http.post(
      ({ request }) => isOrigin(request.url) && new URL(request.url).pathname === '/auth/v1/logout',
      () => new HttpResponse(null, { status: 204 }),
    ),

    http.get(
      ({ request }) => isOrigin(request.url) && new URL(request.url).pathname === '/rest/v1/calculations',
      () => HttpResponse.json([sampleCalculation], { headers: jsonHeaders }),
    ),

    http.post(
      ({ request }) => isOrigin(request.url) && new URL(request.url).pathname === '/rest/v1/calculations',
      async ({ request }) => {
        const rows = (await request.json()) as Record<string, unknown>[]
        const row = Array.isArray(rows) ? rows[0] : rows
        const inserted = {
          ...sampleCalculation,
          ...(typeof row === 'object' && row !== null ? row : {}),
          id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        }
        return HttpResponse.json([inserted], { status: 201, headers: jsonHeaders })
      },
    ),

    http.get(
      ({ request }) => isOrigin(request.url) && new URL(request.url).pathname === '/rest/v1/user_progress',
      () => HttpResponse.json([], { headers: jsonHeaders }),
    ),

    http.post(
      ({ request }) => isOrigin(request.url) && new URL(request.url).pathname === '/rest/v1/user_progress',
      async ({ request }) => {
        const rows = (await request.json()) as Record<string, unknown>[]
        const row = Array.isArray(rows) ? rows[0] : rows
        const merged = {
          user_id: TEST_USER_ID,
          xp: 10,
          level: 1,
          badges: [] as string[],
          updated_at: new Date().toISOString(),
          ...(typeof row === 'object' && row !== null ? row : {}),
        }
        return HttpResponse.json([merged], { status: 201, headers: jsonHeaders })
      },
    ),

    http.get(
      ({ request }) => isOrigin(request.url) && new URL(request.url).pathname === '/rest/v1/recommendations',
      () => HttpResponse.json([sampleRecommendation], { headers: jsonHeaders }),
    ),

    http.post(
      ({ request }) => isOrigin(request.url) && new URL(request.url).pathname === '/rest/v1/client_errors',
      () => HttpResponse.json([], { status: 201, headers: jsonHeaders }),
    ),
  ]
}

export const supabaseDefaultHandlers = createDefaultSupabaseHandlers()
