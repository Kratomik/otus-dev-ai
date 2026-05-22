import { useCallback, useMemo } from 'react'
import type { Database } from '../lib/supabase'
import { generatePersonalizedRecommendations } from '../lib/recommendationPersonalization'
import type { PersonalizationResult } from '../lib/recommendationPersonalization'
import { useCalculations, useRecommendations } from './useEcoData'

type CalculationRow = Database['public']['Tables']['calculations']['Row']

function pickLastCalculation(
  lastSaved: CalculationRow | null,
  items: CalculationRow[],
): CalculationRow | null {
  return lastSaved ?? items[0] ?? null
}

export interface UsePersonalizedRecommendationsResult {
  readonly loading: boolean
  readonly error: string | null
  readonly success: boolean
  readonly reload: () => Promise<void>
  readonly lastCalculation: CalculationRow | null
  readonly personalization: PersonalizationResult
}

export function usePersonalizedRecommendations(): UsePersonalizedRecommendationsResult {
  const {
    items: catalogItems,
    loading: catalogLoading,
    error: catalogError,
    success: catalogSuccess,
    reload: reloadCatalog,
  } = useRecommendations()

  const {
    items: calculationItems,
    lastSaved,
    loading: calculationsLoading,
    error: calculationsError,
    success: calculationsSuccess,
    reload: reloadCalculations,
  } = useCalculations()

  const lastCalculation = useMemo(
    () => pickLastCalculation(lastSaved, calculationItems),
    [lastSaved, calculationItems],
  )

  const personalization = useMemo(
    () => generatePersonalizedRecommendations(catalogItems, lastCalculation),
    [catalogItems, lastCalculation],
  )

  const loading = catalogLoading || calculationsLoading
  const error = catalogError ?? calculationsError
  const success = catalogSuccess && calculationsSuccess

  const reload = useCallback(async (): Promise<void> => {
    await Promise.all([reloadCatalog(), reloadCalculations()])
  }, [reloadCatalog, reloadCalculations])

  return useMemo(
    () => ({
      loading,
      error,
      success,
      reload,
      lastCalculation,
      personalization,
    }),
    [error, lastCalculation, loading, personalization, reload, success],
  )
}
