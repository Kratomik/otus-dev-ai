import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Pool } from 'pg';
const DB_CHECK_TIMEOUT_MS = 3000;
const PORT = 3002;
const HOST = '0.0.0.0';
const WEBHOOK_TIMEOUT_MS = 5000;
const DEGRADED_WEBHOOK_DETAILS = 'PostgreSQL unreachable';
function readEnv(name, defaultValue) {
    const value = process.env[name];
    return value !== undefined && value !== '' ? value : defaultValue;
}
function parsePort(raw) {
    const port = Number.parseInt(raw, 10);
    if (!Number.isFinite(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid DB_PORT: ${raw}`);
    }
    return port;
}
async function checkDatabase(pool, log) {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database check timeout')), DB_CHECK_TIMEOUT_MS);
    });
    try {
        await Promise.race([pool.query('SELECT 1'), timeout]);
        return true;
    }
    catch (error) {
        log.warn({ err: error }, 'Database health check failed');
        return false;
    }
}
async function sendDegradedWebhook(timestamp, log) {
    const webhookUrl = process.env.HEALTH_WEBHOOK_URL;
    if (webhookUrl === undefined || webhookUrl === '') {
        return;
    }
    const body = {
        service: 'ecotrack-health',
        status: 'degraded',
        timestamp,
        details: DEGRADED_WEBHOOK_DETAILS,
    };
    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
        });
        if (!response.ok) {
            log.warn({ statusCode: response.status, webhookUrl }, 'Degraded health webhook returned non-OK status');
        }
        else {
            log.info({ webhookUrl }, 'Degraded health webhook sent');
        }
    }
    catch (error) {
        log.warn({ err: error, webhookUrl }, 'Failed to send degraded health webhook');
    }
}
function degradedPayload() {
    return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        services: {
            db: 'down',
            auth: 'up',
        },
    };
}
async function buildHealthPayload(pool, log) {
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
function respondDegraded(reply, log, httpStatus) {
    const payload = degradedPayload();
    void sendDegradedWebhook(payload.timestamp, log);
    return reply.code(httpStatus).send(payload);
}
async function main() {
    const pool = new Pool({
        host: readEnv('DB_HOST', 'supabase-db'),
        port: parsePort(readEnv('DB_PORT', '5432')),
        user: readEnv('DB_USER', 'postgres'),
        password: readEnv('DB_PASSWORD', ''),
        database: readEnv('DB_NAME', 'postgres'),
        connectionTimeoutMillis: DB_CHECK_TIMEOUT_MS,
        max: 5,
    });
    pool.on('error', (error) => {
        console.error('PostgreSQL pool error:', error.message);
    });
    const app = Fastify({
        logger: true,
    });
    await app.register(cors, { origin: true });
    app.get('/health', async (request, reply) => {
        try {
            const payload = await buildHealthPayload(pool, request.log);
            if (payload.status === 'degraded') {
                void sendDegradedWebhook(payload.timestamp, request.log);
            }
            const statusCode = payload.status === 'ok' ? 200 : 503;
            return reply.code(statusCode).send(payload);
        }
        catch (error) {
            request.log.error({ err: error }, 'Unhandled error in /health');
            return respondDegraded(reply, request.log, 503);
        }
    });
    app.get('/ready', async (request, reply) => {
        try {
            const payload = await buildHealthPayload(pool, request.log);
            return reply.code(200).send(payload);
        }
        catch (error) {
            request.log.error({ err: error }, 'Unhandled error in /ready');
            return respondDegraded(reply, request.log, 200);
        }
    });
    await app.listen({ port: PORT, host: HOST });
    app.log.info({ port: PORT, host: HOST }, 'Health server listening');
    let shuttingDown = false;
    const shutdown = async (signal) => {
        if (shuttingDown) {
            return;
        }
        shuttingDown = true;
        app.log.info({ signal }, 'Graceful shutdown started');
        try {
            await app.close();
            await pool.end();
            app.log.info('Graceful shutdown complete');
            process.exit(0);
        }
        catch (error) {
            app.log.error({ err: error }, 'Error during shutdown');
            process.exit(1);
        }
    };
    process.on('SIGTERM', () => {
        void shutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
        void shutdown('SIGINT');
    });
}
main().catch((error) => {
    console.error('Failed to start health server:', error);
    process.exit(1);
});
