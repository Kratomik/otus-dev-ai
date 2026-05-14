import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Register from '../pages/Register'

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    state: 'success',
    loading: false,
    success: true,
    error: null,
    currentUser: null,
  }),
}))

const mockSignUp = vi.fn()
const mockGetSession = vi.fn()

vi.mock('../lib/supabase', () => ({
  signUp: (...args: unknown[]) => mockSignUp(...args),
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
  },
}))

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  })

  it('renders registration form', () => {
    renderRegister()
    expect(screen.getByRole('heading', { name: /^регистрация$/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/^электронная почта$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /зарегистрироваться/i })).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText(/^электронная почта$/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^пароль$/i), 'password12')
    await user.type(screen.getByLabelText(/^подтверждение пароля$/i), 'password99')
    await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/пароли не совпадают/i)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('calls signUp and shows success hint when session is not returned', async () => {
    const user = userEvent.setup()
    renderRegister()

    await user.type(screen.getByLabelText(/^электронная почта$/i), 'new@example.com')
    await user.type(screen.getByLabelText(/^пароль$/i), 'password12')
    await user.type(screen.getByLabelText(/^подтверждение пароля$/i), 'password12')
    await user.click(screen.getByRole('button', { name: /зарегистрироваться/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'password12')
    })
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })
})
