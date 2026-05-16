/** HTTP security headers (не импортировать из src — только для Vite config). */

const CSP_PRODUCTION = [
  "default-src 'self'",
  "script-src 'self' https://mc.yandex.ru",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https://mc.yandex.ru",
  "connect-src 'self' https: http: https://mc.yandex.ru",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

/** Dev: разрешаем Vite HMR (ws) и inline/eval для React Refresh. */
const CSP_DEVELOPMENT = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https://mc.yandex.ru",
  "connect-src 'self' https: http: ws: wss: https://mc.yandex.ru",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const BASE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  ...BASE_HEADERS,
  'Content-Security-Policy': CSP_PRODUCTION,
}

export const DEV_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  ...BASE_HEADERS,
  'Content-Security-Policy': CSP_DEVELOPMENT,
}
