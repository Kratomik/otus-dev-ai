import { getActiveRecommendations } from '../services/recommendations.js';
import { env } from '../config/env.js';
export async function registerRecommendationsRoutes(app, pool) {
    app.get('/recommendations', {
        config: {
            rateLimit: {
                max: env.rateLimitRecommendationsMax,
                timeWindow: env.rateLimitWindowMs,
            },
        },
    }, async (_request, reply) => {
        const { items, cached } = await getActiveRecommendations(pool);
        const maxAgeSec = Math.max(1, Math.floor(env.recommendationsCacheTtlMs / 1000));
        return reply
            .header('Cache-Control', `public, max-age=${maxAgeSec}`)
            .header('X-Cache', cached ? 'HIT' : 'MISS')
            .send({
            items,
            cached,
            fetchedAt: new Date().toISOString(),
        });
    });
}
