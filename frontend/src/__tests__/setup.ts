import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { SUPABASE_TEST_ANON_KEY, SUPABASE_TEST_ORIGIN } from '../test/msw/supabaseApiHandlers'

// Все тесты используют MSW-origin, а не .env.local (иначе unhandled fetch / таймауты).
vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_TEST_ORIGIN)
vi.stubEnv('VITE_SUPABASE_ANON_KEY', SUPABASE_TEST_ANON_KEY)
