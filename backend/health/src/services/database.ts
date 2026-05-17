import { Pool } from 'pg';
import { env } from '../config/env.js';
import { logger as rootLogger } from '../lib/logger.js';
import type { ServiceLogger } from '../types/logger.js';

export const DB_CHECK_TIMEOUT_MS = 3000;

const loggerForPool = rootLogger.child({ component: 'pg-pool' });

export function createDatabasePool(): Pool {
  const pool = new Pool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    connectionTimeoutMillis: DB_CHECK_TIMEOUT_MS,
    max: 5,
  });

  pool.on('error', (error: Error) => {
    loggerForPool.error({ err: error }, 'PostgreSQL pool error');
  });

  return pool;
}

export async function checkDatabase(pool: Pool, log: ServiceLogger): Promise<boolean> {
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
