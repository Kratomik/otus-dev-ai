import { lazy, memo, Suspense, useMemo, useState } from 'react'

type ViewState = 'idle' | 'loading' | 'error' | 'success'

interface CalculatorInputs {
  transport: string
  food: string
  energy: string
  shopping: string
}

interface ChartPoint {
  name: string
  value: number
}

const RF_AVERAGE = 12.5
const EmissionsPieChart = lazy(() => import('../components/EmissionsPieChart'))

const initialInputs: CalculatorInputs = {
  transport: '',
  food: '',
  energy: '',
  shopping: '',
}

function Calculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>(initialInputs)
  const [state, setState] = useState<ViewState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [totalTons, setTotalTons] = useState(0)
  const [chartData, setChartData] = useState<ChartPoint[]>([])

  const handleInputChange = (field: keyof CalculatorInputs, value: string) => {
    setInputs((prev) => ({ ...prev, [field]: value }))
    if (state === 'error') {
      setState('idle')
      setErrorMessage('')
    }
  }

  const parseValue = (raw: string): number => (raw.trim() === '' ? 0 : Number(raw))

  const handleCalculate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const transport = parseValue(inputs.transport)
    const food = parseValue(inputs.food)
    const energy = parseValue(inputs.energy)
    const shopping = parseValue(inputs.shopping)

    const values = [transport, food, energy, shopping]
    const hasInvalid = values.some((value) => Number.isNaN(value) || value < 0)

    if (hasInvalid) {
      setState('error')
      setErrorMessage('Values must be non-negative numbers.')
      return
    }

    setState('loading')
    setErrorMessage('')

    window.setTimeout(() => {
      const transportCo2 = transport * 0.21
      const foodCo2 = food * 0.18
      const energyCo2 = energy * 0.23
      const shoppingCo2 = shopping * 0.15
      const total = transportCo2 + foodCo2 + energyCo2 + shoppingCo2

      setTotalTons(total)
      setChartData([
        { name: 'Transport', value: transportCo2 },
        { name: 'Food', value: foodCo2 },
        { name: 'Energy', value: energyCo2 },
        { name: 'Shopping', value: shoppingCo2 },
      ])
      setState('success')
    }, 400)
  }

  const difference = totalTons - RF_AVERAGE
  const fields = useMemo(
    () =>
      [
        ['transport', 'Transport'],
        ['food', 'Food'],
        ['energy', 'Energy'],
        ['shopping', 'Shopping'],
      ] as Array<[keyof CalculatorInputs, string]>,
    [],
  )

  return (
    <section aria-live="polite" className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">Carbon Calculator</h2>
        <p className="mt-1 text-sm text-[#0D1B2A]/75">
          Enter your annual activity values to estimate footprint (t CO2/year).
        </p>
      </header>

      <form
        noValidate
        onSubmit={handleCalculate}
        className="space-y-3 rounded-2xl border border-[#2979FF]/20 bg-white p-4"
      >
        {fields.map(([field, label]) => (
          <div key={field} className="space-y-1">
            <label htmlFor={field} className="block text-sm font-medium">
              {label}
            </label>
            <input
              id={field}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={inputs[field]}
              onChange={(event) => handleInputChange(field, event.target.value)}
              aria-invalid={state === 'error'}
              aria-describedby={state === 'error' ? 'calculator-error' : undefined}
              className="min-h-[44px] w-full rounded-xl border border-[#2979FF]/30 px-3 py-2 text-base text-[#0D1B2A] outline-none ring-[#2979FF] focus:ring-2"
            />
          </div>
        ))}

        <button
          type="submit"
          className="min-h-[44px] w-full rounded-xl bg-[#2979FF] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#1E67E6] focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2 motion-reduce:transition-none"
        >
          Calculate
        </button>
      </form>

      {state === 'loading' && (
        <div className="rounded-2xl border border-[#2979FF]/20 bg-white p-4">
          <p className="font-medium text-[#2979FF]">Calculating footprint...</p>
        </div>
      )}

      {state === 'error' && (
        <div id="calculator-error" className="rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="font-medium text-red-700">{errorMessage}</p>
        </div>
      )}

      {state === 'success' && (
        <div className="space-y-3 rounded-2xl border border-[#00E676]/30 bg-white p-4 shadow-sm">
          <div className="rounded-xl bg-[#F5F9F7] p-4">
            <p className="text-sm text-[#0D1B2A]/70">Your footprint</p>
            <p className="text-2xl font-semibold text-[#2979FF]">{totalTons.toFixed(2)} t CO2/year</p>
          </div>

          <div className="rounded-xl bg-[#F5F9F7] p-4">
            <p className="text-sm text-[#0D1B2A]/70">Comparison with average in Russia (12.5)</p>
            <p className="text-lg font-semibold text-[#0D1B2A]">
              {difference >= 0 ? '+' : ''}
              {difference.toFixed(2)} t CO2/year
            </p>
          </div>

          <Suspense
            fallback={
              <div className="h-64 rounded-xl bg-[#F5F9F7] p-4">
                <p className="font-medium text-[#2979FF]">Loading chart...</p>
              </div>
            }
          >
            <EmissionsPieChart data={chartData} />
          </Suspense>
        </div>
      )}
    </section>
  )
}

export default memo(Calculator)
