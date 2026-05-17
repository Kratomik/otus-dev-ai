import { checkDatabase } from './database.js';
export function degradedPayload() {
    return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        services: {
            db: 'down',
            auth: 'up',
        },
    };
}
export async function buildHealthPayload(pool, log) {
    const dbUp = await checkDatabase(pool, log);
    return {
        status: dbUp ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
            db: dbUp ? 'up' : 'down',
            auth: 'up',
        },
    };
}
