import pino from 'pino';
const nodeEnv = process.env.NODE_ENV ?? 'development';
const logLevel = process.env.LOG_LEVEL ?? 'info';
const isDevelopment = nodeEnv === 'development';
const baseOptions = {
    level: logLevel,
};
const loggerOptions = isDevelopment
    ? {
        ...baseOptions,
        transport: {
            target: 'pino-pretty',
            options: { colorize: true },
        },
    }
    : baseOptions;
/** Корневой логгер приложения (JSON в prod, pino-pretty в dev). */
export const logger = pino(loggerOptions);
