import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useRecommendations } from '../hooks/useEcoData'

function Recommendations() {
  const { items, loading, error, success, reload } = useRecommendations()
  const [showCards, setShowCards] = useState(false)
  const didAlertRef = useRef(false)

  useEffect(() => {
    if (!error) {
      didAlertRef.current = false
      return
    }
    if (didAlertRef.current) return
    window.alert(error)
    didAlertRef.current = true
  }, [error])

  useEffect(() => {
    if (!success) return
    setShowCards(false)
    const id = window.requestAnimationFrame(() => setShowCards(true))
    return () => window.cancelAnimationFrame(id)
  }, [success, items.length])

  const viewItems = useMemo(
    () =>
      items.map((item) => ({
        id: String(item.id),
        text: item.text,
        co2Savings: item.co2_saving,
        difficulty: item.difficulty ?? 'Средне',
        impact: item.impact ?? 5,
      })),
    [items],
  )

  return (
    <section aria-live="polite" className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">Recommendations</h2>
        <p className="mt-1 text-sm text-[#0D1B2A]/75">
          Prioritized actions with measurable impact.
        </p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-[#2979FF]/20 bg-white p-4">
          <p className="inline-flex items-center gap-2 font-medium text-[#2979FF]">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-[#2979FF]/30 border-t-[#2979FF]"
            />
            Loading personalized tips...
          </p>
        </div>
      )}

      {!!error && (
        <div className="space-y-3 rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="font-medium text-red-700">Could not load recommendations.</p>
          <button
            type="button"
            onClick={reload}
            aria-label="Retry loading recommendations"
            className="min-h-[44px] rounded-xl bg-[#0D1B2A] px-4 py-2 text-sm font-semibold text-white"
          >
            Retry
          </button>
        </div>
      )}

      {success && viewItems.length === 0 && (
        <div className="space-y-3 rounded-2xl border border-[#2979FF]/20 bg-white p-4">
          <p className="font-medium text-[#0D1B2A]">No recommendations yet.</p>
          <p className="text-sm text-[#0D1B2A]">
            Complete a calculator run to generate personal actions.
          </p>
          <button
            type="button"
            onClick={reload}
            aria-label="Refresh recommendations"
            className="min-h-[44px] rounded-xl bg-[#2979FF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1E67E6] active:bg-[#1757BD] motion-reduce:transition-none"
          >
            Refresh
          </button>
        </div>
      )}

      {success && viewItems.length > 0 && (
        <ul className="space-y-3">
          {viewItems.map((item, index) => (
            <li
              key={item.id}
              aria-label={`Recommendation ${index + 1}: ${item.difficulty}, impact ${item.impact} out of 10`}
              style={{ transitionDelay: `${index * 70}ms` }}
              className={[
                'rounded-2xl border border-[#2979FF]/20 bg-white p-4 shadow-sm',
                'transition-all duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                'motion-reduce:transform-none motion-reduce:transition-none',
                showCards ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
              ].join(' ')}
            >
              <p className="font-semibold text-[#0D1B2A]">{item.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex min-h-[44px] items-center rounded-xl bg-[#00E676]/20 px-3 text-sm font-medium text-[#0D1B2A]">
                  Экономия: {item.co2Savings}
                </span>
                <span className="inline-flex min-h-[44px] items-center rounded-xl bg-[#2979FF]/15 px-3 text-sm font-medium text-[#0D1B2A]">
                  Сложность: {item.difficulty}
                </span>
                <span className="inline-flex min-h-[44px] items-center rounded-xl bg-[#0D1B2A] px-3 text-sm font-semibold text-white">
                  Impact: {item.impact}/10
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default memo(Recommendations)
