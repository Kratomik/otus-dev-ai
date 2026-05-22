import { describe, expect, it } from 'vitest'
import {
  generatePersonalizedRecommendations,
  getCategoryShares,
  getPriorityCategories,
} from '../lib/recommendationPersonalization'
import type { Database } from '../lib/supabase'

type RecommendationRow = Database['public']['Tables']['recommendations']['Row']
type CalculationRow = Database['public']['Tables']['calculations']['Row']

const baseCalc: CalculationRow = {
  id: 'c1',
  user_id: 'u1',
  transport: 50,
  food: 5,
  energy: 5,
  shopping: 5,
  total_co2: '11.80',
  created_at: '2026-05-01T00:00:00.000Z',
}

function rec(
  partial: Partial<RecommendationRow> & Pick<RecommendationRow, 'id' | 'text' | 'category'>,
): RecommendationRow {
  return {
    co2_saving: '0.1 т CO₂/год',
    difficulty: 'Легко',
    impact: 5,
    is_active: true,
    ...partial,
  }
}

const catalog: RecommendationRow[] = [
  rec({ id: 1, text: 'Bike', category: 'transport', impact: 9 }),
  rec({ id: 2, text: 'Bus', category: 'transport', impact: 8 }),
  rec({ id: 3, text: 'LED', category: 'energy', impact: 6 }),
  rec({ id: 4, text: 'Heat', category: 'energy', impact: 5 }),
  rec({ id: 5, text: 'Meat', category: 'food', impact: 10 }),
  rec({ id: 6, text: 'Veg', category: 'food', impact: 7 }),
  rec({ id: 7, text: 'List', category: 'shopping', impact: 6 }),
  rec({ id: 8, text: 'Repair', category: 'shopping', impact: 8 }),
]

describe('recommendationPersonalization', () => {
  it('getCategoryShares weights transport highest for sample calc', () => {
    const shares = getCategoryShares(baseCalc)
    const transport = shares.find((s) => s.category === 'transport')
    expect(transport?.co2Tons).toBeCloseTo(10.5, 2)
    expect(getPriorityCategories(shares)[0]).toBe('transport')
  })

  it('generatePersonalizedRecommendations returns 3–5 items when calculation present', () => {
    const result = generatePersonalizedRecommendations(catalog, baseCalc)
    expect(result.items.length).toBeGreaterThanOrEqual(3)
    expect(result.items.length).toBeLessThanOrEqual(5)
    expect(result.priorityCategories[0]).toBe('transport')
    expect(result.mode).toBe('personalized')
  })

  it('prioritizes transport tips for transport-heavy footprint', () => {
    const result = generatePersonalizedRecommendations(catalog, baseCalc)
    const transportTips = result.items.filter((i) => i.category === 'transport')
    expect(transportTips.length).toBeGreaterThanOrEqual(1)
  })

  it('generic mode without calculation caps at 5 by impact', () => {
    const result = generatePersonalizedRecommendations(catalog, null)
    expect(result.mode).toBe('generic')
    expect(result.items.length).toBeLessThanOrEqual(5)
    expect(result.items.length).toBeGreaterThan(0)
  })

  it('adds generated tip when footprint above RF average', () => {
    const heavy: CalculationRow = {
      ...baseCalc,
      transport: 80,
      total_co2: '20.00',
    }
    const result = generatePersonalizedRecommendations(catalog, heavy)
    expect(result.aboveNationalAverage).toBe(true)
    expect(result.items.some((i) => i.generated === true)).toBe(true)
  })
})
