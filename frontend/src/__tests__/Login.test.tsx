import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Login from '../pages/Login'

const { signInWithOAuth } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
}))

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    state: 'success',
    loading: false,
    success: true,
    error: null,
    currentUser: null,
  }),
}))

vi.mock('../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/supabase')>()
  return {
    ...actual,
    isSupabaseConfigured: () => true,
    supabase: {
      auth: {
        signInWithOAuth,
      },
    },
  }
})

describe('Login', () => {
  beforeEach(() => {
    signInWithOAuth.mockReset()
  })

  it('renders Yandex sign-in button above email form', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    const yandexButton = screen.getByRole('button', { name: 'Войти через Яндекс' })
    const emailField = screen.getByLabelText(/электронная почта/i)

    expect(yandexButton.compareDocumentPosition(emailField) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('calls signInWithOAuth for Yandex and shows error on failure', async () => {
    const oauthError = Object.assign(new Error('OAuth failed'), {
      name: 'AuthError',
      status: 400,
      __isAuthError: true as const,
    })
    signInWithOAuth.mockResolvedValue({
      data: { provider: 'yandex', url: 'https://oauth.yandex.ru/authorize' },
      error: oauthError,
    })

    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Войти через Яндекс' }))

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith({
        provider: 'yandex',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(/oauth failed/i)
  })
})
