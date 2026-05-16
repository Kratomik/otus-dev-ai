import { beforeEach, describe, expect, it, vi } from 'vitest'

const showToast = vi.fn()

vi.mock('../lib/toast', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}))

describe('handleApiError', () => {
  beforeEach(() => {
    showToast.mockReset()
  })

  it('shows toast when user denies Yandex access', async () => {
    const { handleApiError } = await import('../lib/supabase')
    const action = await handleApiError(
      { error: 'access_denied', error_description: 'denied' },
      'yandex-oauth-redirect',
    )
    expect(action).toEqual({ type: 'none' })
    expect(showToast).toHaveBeenCalledWith('Доступ отклонён')
  })

  it('redirects when Yandex account is not confirmed', async () => {
    const { handleApiError, YANDEX_CONFIRM_PATH } = await import('../lib/supabase')
    const action = await handleApiError(
      { error: 'access_denied', error_description: 'Unverified email' },
      'yandex-oauth-redirect',
    )
    expect(action).toEqual({ type: 'redirect', to: YANDEX_CONFIRM_PATH })
    expect(showToast).not.toHaveBeenCalled()
  })

  it('refreshes session when token expired', async () => {
    const mod = await import('../lib/supabase')
    const refreshSpy = vi.spyOn(mod.supabase.auth, 'refreshSession').mockResolvedValue({
      data: {
        user: null,
        session: { access_token: 'x' } as import('@supabase/supabase-js').Session,
      },
      error: null,
    })
    const action = await mod.handleApiError(
      { code: 'refresh_token_not_found', message: 'expired' },
      'yandex-oauth-exchange',
    )
    expect(refreshSpy).toHaveBeenCalled()
    expect(action).toEqual({ type: 'session-refreshed' })
    refreshSpy.mockRestore()
  })
})
