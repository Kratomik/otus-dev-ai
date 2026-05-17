import type { Pool } from 'pg';
import type { HealthPayload } from '../types/health.js';
import type { ServiceLogger } from '../types/logger.js';
import { checkDatabase } from './database.js';

export function degradedPayload(): HealthPayload {
  return {
    status: 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      db: 'down',
      auth: 'up',
    },
  };
}

export async function buildHealthPayload(pool: Pool, log: ServiceLogger): Promise<HealthPayload> {
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
