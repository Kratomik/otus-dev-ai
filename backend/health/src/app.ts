import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { Pool } from 'pg';
import { logger } from './lib/logger.js';
import pinoHttpPlugin from './plugins/pino-http.js';
import securityPlugin, { resolveCorsOrigin } from './plugins/security.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerLogsRoutes } from './routes/logs.js';
import { registerRecommendationsRoutes } from './routes/recommendations.js';

function resolveStatusCode(error: FastifyError): number {
  if (typeof error.statusCode === 'number' && error.statusCode >= 400) {
    return error.statusCode;
  }
  return 500;
}

export async function buildApp(pool: Pool): Promise<FastifyInstance> {
  const app = Fastify({
    logger,
    disableRequestLogging: true,
    genReqId: (request) => {
      const header = request.headers['x-request-id'];
      if (typeof header === 'string' && header.length > 0) {
        return header;
      }
      return crypto.randomUUID();
    },
  });

  await app.register(securityPlugin);
  await app.register(pinoHttpPlugin);
  await app.register(cors, { origin: resolveCorsOrigin() });
  await registerHealthRoutes(app, pool);
  await registerRecommendationsRoutes(app, pool);
  await registerLogsRoutes(app);

  app.setErrorHandler((error: FastifyError, request, reply) => {
    logger.error({ err: error, reqId: request.id }, 'Unhandled error');
    const statusCode = resolveStatusCode(error);
    void reply.status(statusCode).send({ error: 'Internal Server Error' });
  });

  return app;
}
