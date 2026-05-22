import { memo, useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAnalytics } from '../hooks/useAnalytics'
import { usePersonalizedRecommendations } from '../hooks/usePersonalizedRecommendations'
import { CATEGORY_LABELS, isRecommendationCategory } from '../lib/recommendationCategories'
import { sanitizeDisplayText } from '../lib/security'

function Recommendations() {
  const { loading, error, success, reload, lastCalculation, personalization } =
    usePersonalizedRecommendations()
  const { trackEvent, trackError } = useAnalytics()

  const viewItems = useMemo(
    () =>
      personalization.items.map((item) => ({
        id: item.id,
        text: sanitizeDisplayText(item.text, 500),
        co2Savings: sanitizeDisplayText(item.co2_saving, 64),
        difficulty: sanitizeDisplayText(item.difficulty ?? 'Средне', 32),
        impact: item.impact ?? 5,
        generated: item.generated === true,
        categoryLabel:
          item.category && isRecommendationCategory(item.category)
            ? CATEGORY_LABELS[item.category]
            : null,
      })),
    [personalization.items],
  )

  useEffect(() => {
    if (!success) return
    trackEvent('RecommendationsViewed', {
      count: viewItems.length,
      mode: personalization.mode,
      dominant_categories: personalization.priorityCategories.join(','),
      total_co2: personalization.totalCo2 ?? undefined,
      generated_count: viewItems.filter((i) => i.generated).length,
    })
  }, [
    success,
    viewItems.length,
    personalization.mode,
    personalization.priorityCategories,
    personalization.totalCo2,
    trackEvent,
    viewItems,
  ])

  useEffect(() => {
    if (!error) return
    trackError(new Error(error), 'recommendations_load')
  }, [error, trackError])

  const handleRecommendationClick = useCallback(
    (recommendationId: number, difficulty: string, impact: number) => {
      trackEvent('RecommendationClicked', {
        recommendation_id: recommendationId,
        difficulty,
        impact,
      })
    },
    [trackEvent],
  )

  const headerSubtitle = useMemo(() => {
    if (!lastCalculation) {
      return 'Сделайте расчёт в калькуляторе — подберём 3–5 советов под ваш след.'
    }
    if (personalization.mode === 'personalized' && personalization.priorityCategories.length > 0) {
      const labels = personalization.priorityCategories.map((c) => CATEGORY_LABELS[c]).join(', ')
      return `Подобрано ${viewItems.length} советов по приоритету: ${labels}.`
    }
    return `Подобрано ${viewItems.length} советов на основе последнего расчёта.`
  }, [lastCalculation, personalization.mode, personalization.priorityCategories, viewItems.length])

  return (
    <section aria-live="polite" className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">Recommendations</h2>
        <p className="mt-1 text-sm text-[#0D1B2A]/75">{headerSubtitle}</p>
        {!lastCalculation && (
          <Link
            to="/calculator"
            className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold text-[#2979FF] underline-offset-2 hover:underline"
          >
            Перейти к калькулятору
          </Link>
        )}
      </header>

      {loading && (
        <div className="rounded-2xl border border-[#2979FF]/20 bg-white p-4">
          <p className="inline-flex items-center gap-2 font-medium text-[#2979FF]">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-[#2979FF]/30 border-t-[#2979FF]"
            />
            Подбираем персональные советы…
          </p>
        </div>
      )}

      {!!error && (
        <div role="alert" className="space-y-3 rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="font-medium text-red-700">Could not load recommendations.</p>
          <p className="text-sm text-red-700/90">{error}</p>
          <button
            type="button"
            onClick={() => void reload()}
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
            onClick={() => void reload()}
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
              style={{ animationDelay: `${index * 70}ms` }}
              className="animate-ecotrack-card-enter rounded-2xl border border-[#2979FF]/20 bg-white p-4 opacity-0 shadow-sm"
            >
              <button
                type="button"
                onClick={() => handleRecommendationClick(item.id, item.difficulty, item.impact)}
                aria-label={`Recommendation ${index + 1}: ${item.difficulty}, impact ${item.impact} out of 10`}
                className="min-h-[44px] w-full rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2"
              >
                <p className="font-semibold text-[#0D1B2A]">{item.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.categoryLabel ? (
                    <span className="inline-flex min-h-[44px] items-center rounded-xl bg-[#F5F9F7] px-3 text-sm font-medium text-[#0D1B2A]">
                      {item.categoryLabel}
                    </span>
                  ) : null}
                  {item.generated ? (
                    <span className="inline-flex min-h-[44px] items-center rounded-xl bg-[#00E676]/25 px-3 text-sm font-medium text-[#0D1B2A]">
                      По вашему расчёту
                    </span>
                  ) : null}
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default memo(Recommendations)
