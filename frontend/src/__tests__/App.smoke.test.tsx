import { render, screen, waitFor } from '@testing-library/react'
import { HashRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    state: 'success',
    loading: false,
    success: true,
    error: null,
    currentUser: null,
  }),
}))

describe('App smoke', () => {
  it('renders login when unauthenticated at root hash route', async () => {
    window.location.hash = '#/'
    render(
      <HashRouter>
        <App />
      </HashRouter>,
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^вход$/i })).toBeInTheDocument()
    })
  })

  it('renders login when hash is empty (browser open on /)', async () => {
    window.location.hash = ''
    render(
      <HashRouter>
        <App />
      </HashRouter>,
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^вход$/i })).toBeInTheDocument()
    })
  })
})
