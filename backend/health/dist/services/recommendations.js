import { createMemoryCache } from '../lib/memoryCache.js';
import { env } from '../config/env.js';
const SELECT_ACTIVE_RECOMMENDATIONS = `
  SELECT id, text, co2_saving, difficulty, impact, is_active
  FROM public.recommendations
  WHERE is_active = true
  ORDER BY id DESC
  LIMIT 50
`;
const cache = createMemoryCache(env.recommendationsCacheTtlMs);
export async function getActiveRecommendations(pool) {
    const cached = cache.get();
    if (cached !== null) {
        return { items: cached, cached: true };
    }
    const result = await pool.query(SELECT_ACTIVE_RECOMMENDATIONS);
    const items = result.rows;
    cache.set(items);
    return { items, cached: false };
}
export function clearRecommendationsCache() {
    cache.clear();
}
