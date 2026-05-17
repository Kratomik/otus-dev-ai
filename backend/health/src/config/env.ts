export function readEnv(name: string, defaultValue: string): string {
  const value = process.env[name];
  return value !== undefined && value !== '' ? value : defaultValue;
}

export function parsePort(raw: string): number {
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${raw}`);
  }
  return port;
}

function parsePositiveInt(raw: string, defaultValue: number): number {
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 1) {
    return defaultValue;
  }
  return value;
}

export const env = {
  nodeEnv: readEnv('NODE_ENV', 'development'),
  logLevel: readEnv('LOG_LEVEL', 'info'),
  port: parsePort(readEnv('HEALTH_PORT', '3002')),
  host: readEnv('HEALTH_HOST', '0.0.0.0'),
  corsOrigins: readEnv('CORS_ORIGINS', '*'),
  rateLimitGlobalMax: parsePositiveInt(readEnv('RATE_LIMIT_GLOBAL_MAX', '200'), 200),
  rateLimitLogsMax: parsePositiveInt(readEnv('RATE_LIMIT_LOGS_MAX', '30'), 30),
  rateLimitRecommendationsMax: parsePositiveInt(
    readEnv('RATE_LIMIT_RECOMMENDATIONS_MAX', '60'),
    60,
  ),
  rateLimitWindowMs: parsePositiveInt(readEnv('RATE_LIMIT_WINDOW_MS', '60000'), 60_000),
  recommendationsCacheTtlMs: parsePositiveInt(
    readEnv('RECOMMENDATIONS_CACHE_TTL_MS', '300000'),
    300_000,
  ),
  db: {
    host: readEnv('DB_HOST', 'supabase-db'),
    port: parsePort(readEnv('DB_PORT', '5432')),
    user: readEnv('DB_USER', 'postgres'),
    password: readEnv('DB_PASSWORD', ''),
    database: readEnv('DB_NAME', 'postgres'),
  },
  healthWebhookUrl: readEnv('HEALTH_WEBHOOK_URL', ''),
} as const;
