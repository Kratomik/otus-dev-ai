import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import type { HealthPayload } from '../types/health.js';
import { buildHealthPayload, degradedPayload } from '../services/health.js';
import { sendDegradedWebhook } from '../services/webhook.js';

function respondDegraded(
  reply: FastifyReply,
  log: FastifyInstance['log'],
  httpStatus: number,
): FastifyReply {
  const payload = degradedPayload();
  void sendDegradedWebhook(payload.timestamp, log);
  return reply.code(httpStatus).send(payload);
}

export async function registerHealthRoutes(app: FastifyInstance, pool: Pool): Promise<void> {
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
      const payload: HealthPayload = await buildHealthPayload(pool, request.log);
      return reply.code(200).send(payload);
    } catch (error: unknown) {
      request.log.error({ err: error }, 'Unhandled error in /ready');
      return respondDegraded(reply, request.log, 200);
    }
  });
}
