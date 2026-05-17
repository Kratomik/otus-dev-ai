import type { IncomingMessage, ServerResponse } from 'node:http';
import { pinoHttp } from 'pino-http';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { logger } from '../lib/logger.js';

interface HttpLogBindings {
  reqId: string | number | undefined;
  method: string | undefined;
  url: string | undefined;
  statusCode: number;
  responseTime: number;
}

function formatReqId(id: IncomingMessage['id']): string | number | undefined {
  if (id === undefined) {
    return undefined;
  }
  if (typeof id === 'string' || typeof id === 'number') {
    return id;
  }
  return String(id);
}

function readStatusCode(res: ServerResponse): number {
  return res.statusCode > 0 ? res.statusCode : 0;
}

const pinoHttpMiddleware = pinoHttp({
  logger,
  autoLogging: true,
  customSuccessObject: (
    req: IncomingMessage,
    res: ServerResponse,
    val: { responseTime: number },
  ): HttpLogBindings => ({
    reqId: formatReqId(req.id),
    method: req.method,
    url: req.url,
    statusCode: readStatusCode(res),
    responseTime: val.responseTime,
  }),
  customErrorObject: (
    req: IncomingMessage,
    res: ServerResponse,
    _error: Error,
    val: { responseTime: number },
  ): HttpLogBindings => ({
    reqId: formatReqId(req.id),
    method: req.method,
    url: req.url,
    statusCode: readStatusCode(res),
    responseTime: val.responseTime,
  }),
});

const pinoHttpPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', (request, reply, done) => {
    request.raw.id = request.id;
    pinoHttpMiddleware(request.raw, reply.raw, (err?: Error) => {
      if (err !== undefined) {
        done(err);
        return;
      }
      done();
    });
  });
};

export default fp(pinoHttpPlugin, { name: 'ecotrack-pino-http' });
