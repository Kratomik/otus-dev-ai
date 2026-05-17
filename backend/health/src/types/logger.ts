/** Минимальный контракт логгера для services/routes (Fastify + Pino). */
export interface ServiceLogger {
  info: (obj: object, msg?: string) => void;
  warn: (obj: object, msg?: string) => void;
  error: (obj: object, msg?: string) => void;
  debug: (obj: object, msg?: string) => void;
}
