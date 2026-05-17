import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { createDatabasePool } from './services/database.js';
async function main() {
    const pool = createDatabasePool();
    const app = await buildApp(pool);
    await app.listen({ port: env.port, host: env.host });
    logger.info({ port: env.port, host: env.host, nodeEnv: env.nodeEnv }, 'Health server listening');
    let shuttingDown = false;
    const shutdown = async (signal) => {
        if (shuttingDown) {
            return;
        }
        shuttingDown = true;
        logger.info({ signal }, 'Graceful shutdown started');
        try {
            await app.close();
            await pool.end();
            logger.info('Graceful shutdown complete');
            process.exit(0);
        }
        catch (error) {
            logger.error({ err: error }, 'Error during shutdown');
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
    logger.fatal({ err: error }, 'Failed to start health server');
    process.exit(1);
});
