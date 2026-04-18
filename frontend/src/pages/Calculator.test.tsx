import { act, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import Calculator from './Calculator'

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  PieChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Cell: () => null,
  Tooltip: () => null,
}))

vi.mock('../components/EmissionsPieChart', () => ({
  default: () => <div data-testid="pie-chart" />,
}))

const clickCalculate = () => {
  fireEvent.click(screen.getByRole('button', { name: /calculate/i }))
}

describe('Calculator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('shows error state when any input is negative', () => {
    render(<Calculator />)

    fireEvent.change(screen.getByLabelText('Transport'), {
      target: { value: '-1' },
    })

    clickCalculate()

    expect(
      screen.getByText('Values must be non-negative numbers.'),
    ).toBeInTheDocument()
  })

  it('shows loading then success with calculated total and RF comparison', () => {
    render(<Calculator />)

    fireEvent.change(screen.getByLabelText('Transport'), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByLabelText('Food'), {
      target: { value: '20' },
    })
    fireEvent.change(screen.getByLabelText('Energy'), {
      target: { value: '30' },
    })
    fireEvent.change(screen.getByLabelText('Shopping'), {
      target: { value: '40' },
    })

    clickCalculate()

    expect(screen.getByText('Calculating footprint...')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(450)
    })

    // IPCC formula: 10*0.21 + 20*0.18 + 30*0.23 + 40*0.15 = 18.6
    expect(screen.getByText('18.60 t CO2/year')).toBeInTheDocument()
    expect(screen.getByText('+6.10 t CO2/year')).toBeInTheDocument()
    expect(screen.getByText('Loading chart...')).toBeInTheDocument()
  })

  it('treats empty fields as zero values', () => {
    render(<Calculator />)

    clickCalculate()
    act(() => {
      vi.advanceTimersByTime(450)
    })

    expect(screen.getByText('0.00 t CO2/year')).toBeInTheDocument()
    expect(screen.getByText('-12.50 t CO2/year')).toBeInTheDocument()
  })
})
