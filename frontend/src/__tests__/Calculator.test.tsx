import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import Calculator from '../pages/Calculator'

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    state: 'success',
    loading: false,
    success: true,
    error: null,
    currentUser: { id: 'test-user-id' },
  }),
}))

vi.mock('../hooks/useEcoData', () => ({
  useCalculations: () => ({
    saveCalculation: vi.fn().mockResolvedValue(null),
    saving: false,
    error: null,
    state: 'idle',
    loading: false,
    success: false,
    items: [],
    lastSaved: null,
    reload: vi.fn(),
  }),
}))

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
}

describe('Calculator', () => {
  it('renders all fields and submit button', () => {
    render(<Calculator />)

    expect(screen.getByLabelText('Transport')).toBeInTheDocument()
    expect(screen.getByLabelText('Food')).toBeInTheDocument()
    expect(screen.getByLabelText('Energy')).toBeInTheDocument()
    expect(screen.getByLabelText('Shopping')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /рассчитать|calculate/i }),
    ).toBeInTheDocument()
  })

  it('calculates 23.00 when energy is 100', async () => {
    const user = userEvent.setup()
    render(<Calculator />)

    await user.type(screen.getByLabelText('Energy'), '100')
    await user.click(screen.getByRole('button', { name: /рассчитать|calculate/i }))

    await waitFor(() => {
      expect(screen.getByText(/23\.00 t CO2\/year/i)).toBeInTheDocument()
    })
  })

  it('shows error for negative input', async () => {
    const user = userEvent.setup()
    render(<Calculator />)

    await user.type(screen.getByLabelText('Energy'), '-1')
    await user.click(screen.getByRole('button', { name: /рассчитать|calculate/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/значения должны быть неотрицательными числами/i),
      ).toBeInTheDocument()
    })
  })
})
