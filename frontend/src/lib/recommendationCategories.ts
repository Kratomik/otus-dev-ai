export const RECOMMENDATION_CATEGORIES = ['transport', 'food', 'energy', 'shopping'] as const

export type RecommendationCategory = (typeof RECOMMENDATION_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  transport: 'Транспорт',
  food: 'Питание',
  energy: 'Энергия',
  shopping: 'Покупки',
}

export const CO2_CATEGORY_FACTORS: Record<RecommendationCategory, number> = {
  transport: 0.21,
  food: 0.18,
  energy: 0.23,
  shopping: 0.15,
}

/** Средний след по РФ для сравнения (т CO₂/год). */
export const RF_AVERAGE_CO2 = 12.5

export const PERSONALIZED_TIPS_MIN = 3
export const PERSONALIZED_TIPS_MAX = 5

export function isRecommendationCategory(value: string | null | undefined): value is RecommendationCategory {
  return (
    value !== null &&
    value !== undefined &&
    (RECOMMENDATION_CATEGORIES as readonly string[]).includes(value)
  )
}
