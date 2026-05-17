import { pinoHttp } from 'pino-http';
import fp from 'fastify-plugin';
import { logger } from '../lib/logger.js';
function formatReqId(id) {
    if (id === undefined) {
        return undefined;
    }
    if (typeof id === 'string' || typeof id === 'number') {
        return id;
    }
    return String(id);
}
function readStatusCode(res) {
    return res.statusCode > 0 ? res.statusCode : 0;
}
const pinoHttpMiddleware = pinoHttp({
    logger,
    autoLogging: true,
    customSuccessObject: (req, res, val) => ({
        reqId: formatReqId(req.id),
        method: req.method,
        url: req.url,
        statusCode: readStatusCode(res),
        responseTime: val.responseTime,
    }),
    customErrorObject: (req, res, _error, val) => ({
        reqId: formatReqId(req.id),
        method: req.method,
        url: req.url,
        statusCode: readStatusCode(res),
        responseTime: val.responseTime,
    }),
});
const pinoHttpPlugin = async (fastify) => {
    fastify.addHook('onRequest', (request, reply, done) => {
        request.raw.id = request.id;
        pinoHttpMiddleware(request.raw, reply.raw, (err) => {
            if (err !== undefined) {
                done(err);
                return;
            }
            done();
        });
    });
};
export default fp(pinoHttpPlugin, { name: 'ecotrack-pino-http' });
