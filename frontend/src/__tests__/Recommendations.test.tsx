import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Calculator from '../pages/Calculator'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
}

describe('Calculator (requested in Recommendations.test.tsx)', () => {
  it('renders input fields and calculate button', () => {
    render(<Calculator />)

    expect(screen.getByLabelText('Transport')).toBeInTheDocument()
    expect(screen.getByLabelText('Food')).toBeInTheDocument()
    expect(screen.getByLabelText('Energy')).toBeInTheDocument()
    expect(screen.getByLabelText('Shopping')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /рассчитать|calculate/i }),
    ).toBeInTheDocument()
  })

  it('enters 100 in energy and shows 23.00 after calculate click', async () => {
    const user = userEvent.setup()
    render(<Calculator />)

    await user.type(screen.getByLabelText('Energy'), '100')
    await user.click(screen.getByRole('button', { name: /рассчитать|calculate/i }))

    await waitFor(() => {
      expect(screen.getByText(/23\.00 t CO2\/year/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for negative input', async () => {
    const user = userEvent.setup()
    render(<Calculator />)

    await user.type(screen.getByLabelText('Energy'), '-1')
    await user.click(screen.getByRole('button', { name: /рассчитать|calculate/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/values must be non-negative numbers/i),
      ).toBeInTheDocument()
    })
  })
})
