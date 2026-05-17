import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

interface ClientLogBody {
  level: string;
  timestamp: string;
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
}

function isClientLogBody(value: unknown): value is ClientLogBody {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.level === 'string' &&
    typeof record.timestamp === 'string' &&
    typeof record.message === 'string'
  );
}

export async function registerLogsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/logs',
    {
      config: {
        rateLimit: {
          max: env.rateLimitLogsMax,
          timeWindow: env.rateLimitWindowMs,
        },
      },
      bodyLimit: 8192,
    },
    async (request, reply) => {
      const body: unknown = request.body;

      if (!isClientLogBody(body)) {
        return reply.code(400).send({ error: 'Invalid log payload' });
      }

      const logLevel =
        body.level === 'error' ? 'error' : body.level === 'warn' ? 'warn' : 'info';

      logger[logLevel](
        {
          client: true,
          context: body.context,
          metadata: body.metadata,
          userAgent: body.userAgent,
          url: body.url,
          timestamp: body.timestamp,
        },
        body.message,
      );

      return reply.code(204).send();
    },
  );
}
