import type { Database } from './supabase'
import {
  CATEGORY_LABELS,
  CO2_CATEGORY_FACTORS,
  isRecommendationCategory,
  PERSONALIZED_TIPS_MAX,
  PERSONALIZED_TIPS_MIN,
  RECOMMENDATION_CATEGORIES,
  RF_AVERAGE_CO2,
  type RecommendationCategory,
} from './recommendationCategories'

type RecommendationRow = Database['public']['Tables']['recommendations']['Row']
type CalculationRow = Database['public']['Tables']['calculations']['Row']

export type PersonalizationMode = 'personalized' | 'generic' | 'fallback'

export interface CategoryShare {
  readonly category: RecommendationCategory
  readonly co2Tons: number
  readonly share: number
}

export interface GeneratedRecommendation extends RecommendationRow {
  /** Отрицательные id — сгенерированные на клиенте подсказки. */
  readonly generated?: boolean
  readonly reason?: string
}

export interface PersonalizationResult {
  readonly mode: PersonalizationMode
  readonly items: GeneratedRecommendation[]
  readonly categoryShares: CategoryShare[]
  readonly priorityCategories: RecommendationCategory[]
  readonly totalCo2: number | null
  readonly aboveNationalAverage: boolean | null
}

const DIFFICULTY_RANK: Record<string, number> = {
  Легко: 0,
  Средне: 1,
  Сложно: 2,
}

function parseTotalCo2(value: number | string): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

export function getCategoryShares(calculation: CalculationRow): CategoryShare[] {
  const weights = RECOMMENDATION_CATEGORIES.map((category) => ({
    category,
    co2Tons:
      Math.max(0, calculation[category]) * CO2_CATEGORY_FACTORS[category],
  }))
  const total = weights.reduce((sum, w) => sum + w.co2Tons, 0)
  if (total <= 0) {
    return weights.map((w) => ({ ...w, share: 0 }))
  }
  return weights.map((w) => ({ ...w, share: w.co2Tons / total }))
}

export function getPriorityCategories(
  shares: CategoryShare[],
  maxCategories = 2,
): RecommendationCategory[] {
  const sorted = [...shares].sort((a, b) => b.co2Tons - a.co2Tons)
  const picked: RecommendationCategory[] = []
  for (const entry of sorted) {
    if (entry.co2Tons <= 0) continue
    picked.push(entry.category)
    if (picked.length >= maxCategories) break
  }
  if (picked.length > 0) return picked
  return ['transport']
}

function difficultyRank(difficulty: string | null): number {
  if (!difficulty) return 1
  return DIFFICULTY_RANK[difficulty] ?? 1
}

function scoreRecommendation(
  item: RecommendationRow,
  priorityCategories: RecommendationCategory[],
  aboveAverage: boolean,
): number {
  const category = isRecommendationCategory(item.category) ? item.category : null
  const categoryIndex = category ? priorityCategories.indexOf(category) : -1
  const categoryBoost = categoryIndex === 0 ? 1000 : categoryIndex === 1 ? 500 : 0
  const impact = item.impact ?? 0
  const impactBoost = aboveAverage ? impact * 10 : impact * 6
  const easyBoost = aboveAverage ? 0 : (2 - difficultyRank(item.difficulty)) * 15
  return categoryBoost + impactBoost + easyBoost
}

function sortByScore(
  items: RecommendationRow[],
  priorityCategories: RecommendationCategory[],
  aboveAverage: boolean,
): RecommendationRow[] {
  return [...items].sort(
    (a, b) =>
      scoreRecommendation(b, priorityCategories, aboveAverage) -
      scoreRecommendation(a, priorityCategories, aboveAverage),
  )
}

function buildDynamicTips(
  shares: CategoryShare[],
  totalCo2: number,
  aboveAverage: boolean,
  maxTips: number,
): GeneratedRecommendation[] {
  const top = shares[0]
  if (!top || top.co2Tons <= 0 || maxTips <= 0) return []

  const label = CATEGORY_LABELS[top.category]
  const sharePct = Math.round(top.share * 100)
  const potentialSaving = (top.co2Tons * 0.15).toFixed(2)

  const tips: GeneratedRecommendation[] = [
    {
      id: -1,
      text: `Сфокусируйтесь на «${label}»: эта категория даёт ~${sharePct}% вашего следа (${top.co2Tons.toFixed(2)} т CO₂/год).`,
      co2_saving: `до ${potentialSaving} т CO₂/год`,
      difficulty: 'Средне',
      impact: 7,
      category: top.category,
      is_active: true,
      generated: true,
      reason: 'category_focus',
    },
  ]

  if (aboveAverage && maxTips > 1) {
    const delta = (totalCo2 - RF_AVERAGE_CO2).toFixed(2)
    tips.push({
      id: -2,
      text: `Ваш след ${totalCo2.toFixed(2)} т/год — на ${delta} т выше среднего по РФ (${RF_AVERAGE_CO2}). Начните с привычек ниже.`,
      co2_saving: `цель: −${delta} т CO₂/год`,
      difficulty: 'Сложно',
      impact: 9,
      category: top.category,
      is_active: true,
      generated: true,
      reason: 'above_benchmark',
    })
  }

  return tips.slice(0, maxTips)
}

/**
 * Подбирает 3–5 советов: приоритет категориям следа, ранжирование по impact/сложности,
 * при нехватке каталога — клиентские подсказки по расчёту.
 */
export function generatePersonalizedRecommendations(
  catalog: RecommendationRow[],
  calculation: CalculationRow | null,
): PersonalizationResult {
  const active = catalog.filter((r) => r.is_active)

  if (!calculation) {
    const generic = sortByScore(active, [], false).slice(0, PERSONALIZED_TIPS_MAX)
    return {
      mode: 'generic',
      items: generic,
      categoryShares: [],
      priorityCategories: [],
      totalCo2: null,
      aboveNationalAverage: null,
    }
  }

  const totalCo2 = parseTotalCo2(calculation.total_co2)
  const aboveNationalAverage = totalCo2 > RF_AVERAGE_CO2
  const categoryShares = getCategoryShares(calculation)
  const priorityCategories = getPriorityCategories(categoryShares)

  const sorted = sortByScore(active, priorityCategories, aboveNationalAverage)
  const primary = sorted.filter(
    (r) => isRecommendationCategory(r.category) && priorityCategories.includes(r.category),
  )
  const secondary = sorted.filter((r) => !primary.includes(r))

  const picked: RecommendationRow[] = []
  const seen = new Set<number>()

  const take = (list: RecommendationRow[]) => {
    for (const row of list) {
      if (picked.length >= PERSONALIZED_TIPS_MAX) break
      if (seen.has(row.id)) continue
      seen.add(row.id)
      picked.push(row)
    }
  }

  take(primary)
  take(secondary)

  const dynamic = buildDynamicTips(
    categoryShares,
    totalCo2,
    aboveNationalAverage,
    2,
  )
  const merged: GeneratedRecommendation[] = [...dynamic]

  for (const row of picked) {
    if (merged.length >= PERSONALIZED_TIPS_MAX) break
    if (merged.some((i) => i.id === row.id)) continue
    merged.push(row)
  }

  let items: GeneratedRecommendation[] = merged.slice(0, PERSONALIZED_TIPS_MAX)

  if (items.length < PERSONALIZED_TIPS_MIN) {
    for (const row of sorted) {
      if (items.some((i) => i.id === row.id)) continue
      items.push(row)
      if (items.length >= PERSONALIZED_TIPS_MIN) break
    }
  }

  const mode: PersonalizationMode =
    primary.length > 0 && items.length >= PERSONALIZED_TIPS_MIN
      ? 'personalized'
      : 'fallback'

  return {
    mode,
    items: items.slice(0, PERSONALIZED_TIPS_MAX),
    categoryShares,
    priorityCategories,
    totalCo2,
    aboveNationalAverage,
  }
}
