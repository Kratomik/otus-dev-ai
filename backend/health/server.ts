import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Pool } from 'pg';

const DB_CHECK_TIMEOUT_MS = 3000;
const PORT = 3002;
const HOST = '0.0.0.0';

type ServiceStatus = 'up' | 'down';

interface HealthServices {
  db: ServiceStatus;
  auth: 'up';
}

interface HealthPayload {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: HealthServices;
}

interface DegradedWebhookBody {
  service: 'ecotrack-health';
  status: 'degraded';
  timestamp: string;
  details: 'PostgreSQL unreachable';
}

const WEBHOOK_TIMEOUT_MS = 5000;
const DEGRADED_WEBHOOK_DETAILS = 'PostgreSQL unreachable' as const;

function readEnv(name: string, defaultValue: string): string {
  const value = process.env[name];
  return value !== undefined && value !== '' ? value : defaultValue;
}

function parsePort(raw: string): number {
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid DB_PORT: ${raw}`);
  }
  return port;
}

async function checkDatabase(pool: Pool, log: Fastify.FastifyBaseLogger): Promise<boolean> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Database check timeout')), DB_CHECK_TIMEOUT_MS);
  });

  try {
    await Promise.race([pool.query('SELECT 1'), timeout]);
    return true;
  } catch (error: unknown) {
    log.warn({ err: error }, 'Database health check failed');
    return false;
  }
}

async function sendDegradedWebhook(
  timestamp: string,
  log: Fastify.FastifyBaseLogger,
): Promise<void> {
  const webhookUrl = process.env.HEALTH_WEBHOOK_URL;
  if (webhookUrl === undefined || webhookUrl === '') {
    return;
  }

  const body: DegradedWebhookBody = {
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
      log.warn(
        { statusCode: response.status, webhookUrl },
        'Degraded health webhook returned non-OK status',
      );
    } else {
      log.info({ webhookUrl }, 'Degraded health webhook sent');
    }
  } catch (error: unknown) {
    log.warn({ err: error, webhookUrl }, 'Failed to send degraded health webhook');
  }
}

function degradedPayload(): HealthPayload {
  return {
    status: 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      db: 'down',
      auth: 'up',
    },
  };
}

async function buildHealthPayload(
  pool: Pool,
  log: Fastify.FastifyBaseLogger,
): Promise<HealthPayload> {
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

function respondDegraded(
  reply: { code: (status: number) => { send: (payload: HealthPayload) => unknown } },
  log: Fastify.FastifyBaseLogger,
  httpStatus: number,
): unknown {
  const payload = degradedPayload();
  void sendDegradedWebhook(payload.timestamp, log);
  return reply.code(httpStatus).send(payload);
}

async function main(): Promise<void> {
  const pool = new Pool({
    host: readEnv('DB_HOST', 'supabase-db'),
    port: parsePort(readEnv('DB_PORT', '5432')),
    user: readEnv('DB_USER', 'postgres'),
    password: readEnv('DB_PASSWORD', ''),
    database: readEnv('DB_NAME', 'postgres'),
    connectionTimeoutMillis: DB_CHECK_TIMEOUT_MS,
    max: 5,
  });

  pool.on('error', (error: Error) => {
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
    } catch (error: unknown) {
      request.log.error({ err: error }, 'Unhandled error in /health');
      return respondDegraded(reply, request.log, 503);
    }
  });

  app.get('/ready', async (request, reply) => {
    try {
      const payload = await buildHealthPayload(pool, request.log);
      return reply.code(200).send(payload);
    } catch (error: unknown) {
      request.log.error({ err: error }, 'Unhandled error in /ready');
      return respondDegraded(reply, request.log, 200);
    }
  });

  await app.listen({ port: PORT, host: HOST });
  app.log.info({ port: PORT, host: HOST }, 'Health server listening');

  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
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
    } catch (error: unknown) {
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

main().catch((error: unknown) => {
  console.error('Failed to start health server:', error);
  process.exit(1);
});
