import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('supabase auth validation', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54329')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
    vi.resetModules()
  })

  it('signIn rejects invalid email without API call', async () => {
    const { signIn } = await import('../lib/supabase')
    const res = await signIn('not-email', 'password12')
    expect(res.error?.code).toBe('VALIDATION')
    expect(res.error?.message).toMatch(/корректный email/i)
  })

  it('signUp rejects invalid email without API call', async () => {
    const { signUp } = await import('../lib/supabase')
    const res = await signUp('bad', 'password12')
    expect(res.error?.code).toBe('VALIDATION')
    expect(res.error?.message).toMatch(/корректный email/i)
  })
})
