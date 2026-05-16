import { describe, expect, it, vi } from 'vitest'

const exchangeCodeForSession = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession,
    },
  },
}))

describe('exchangeOAuthCodeForSession', () => {
  it('deduplicates concurrent exchanges for the same code', async () => {
    exchangeCodeForSession.mockReset()
    let resolveExchange!: (value: { data: { session: { access_token: string } }; error: null }) => void
    exchangeCodeForSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveExchange = resolve
        }),
    )

    const { exchangeOAuthCodeForSession } = await import('../lib/authExchange')
    const first = exchangeOAuthCodeForSession('same-code')
    const second = exchangeOAuthCodeForSession('same-code')

    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)

    resolveExchange({
      data: { session: { access_token: 'token' } },
      error: null,
    })
    await expect(first).resolves.toEqual({
      error: null,
      session: { access_token: 'token' },
    })
    await expect(second).resolves.toEqual({
      error: null,
      session: { access_token: 'token' },
    })
  })
})
