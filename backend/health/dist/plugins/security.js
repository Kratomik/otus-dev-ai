import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';
function resolveCorsOrigin() {
    if (env.corsOrigins === '*') {
        return true;
    }
    const origins = env.corsOrigins
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    return origins.length > 0 ? origins : true;
}
const securityPlugin = async (fastify) => {
    await fastify.register(helmet, {
        contentSecurityPolicy: env.nodeEnv === 'production',
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    });
    await fastify.register(compress, {
        global: true,
        encodings: ['gzip', 'deflate'],
        threshold: 1024,
    });
    await fastify.register(rateLimit, {
        global: true,
        max: env.rateLimitGlobalMax,
        timeWindow: env.rateLimitWindowMs,
        allowList: (request) => request.url === '/ready' || request.url === '/health',
    });
};
export { resolveCorsOrigin, securityPlugin };
export default fp(securityPlugin, { name: 'ecotrack-security' });
