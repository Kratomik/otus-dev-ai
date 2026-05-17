import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
function isClientLogBody(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const record = value;
    return (typeof record.level === 'string' &&
        typeof record.timestamp === 'string' &&
        typeof record.message === 'string');
}
export async function registerLogsRoutes(app) {
    app.post('/logs', {
        config: {
            rateLimit: {
                max: env.rateLimitLogsMax,
                timeWindow: env.rateLimitWindowMs,
            },
        },
        bodyLimit: 8192,
    }, async (request, reply) => {
        const body = request.body;
        if (!isClientLogBody(body)) {
            return reply.code(400).send({ error: 'Invalid log payload' });
        }
        const logLevel = body.level === 'error' ? 'error' : body.level === 'warn' ? 'warn' : 'info';
        logger[logLevel]({
            client: true,
            context: body.context,
            metadata: body.metadata,
            userAgent: body.userAgent,
            url: body.url,
            timestamp: body.timestamp,
        }, body.message);
        return reply.code(204).send();
    });
}
