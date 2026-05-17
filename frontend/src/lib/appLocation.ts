/**
 * URL приложения с учётом Vite `base` (GitHub Pages: `/otus-dev-ai/`, локально: `/`).
 */

function normalizeHash(hashPath: string): string {
  if (hashPath.startsWith('#')) return hashPath
  const trimmed = hashPath.replace(/^\//, '')
  return `#/${trimmed}`
}

/** Базовый путь из `import.meta.env.BASE_URL` (со слэшем в конце, кроме корня `/`). */
export function getAppBasePath(): string {
  const raw = import.meta.env.BASE_URL || '/'
  if (raw === '/') return '/'
  return raw.endsWith('/') ? raw : `${raw}/`
}

/** Полный URL: origin + base + hash (`#/login`, `/calculator` → `#/calculator`). */
export function buildAppLocationUrl(
  hashPath: string,
  origin: string = window.location.origin,
): string {
  const hash = normalizeHash(hashPath)
  const base = import.meta.env.BASE_URL || '/'
  const url = new URL(base, origin)
  url.hash = hash
  return url.toString()
}

/** Pathname для Supabase OAuth redirect (без `#`). */
export function getOAuthCallbackPathname(): string {
  const base = import.meta.env.BASE_URL || '/'
  if (base === '/') return '/auth/callback'
  return `${base.replace(/\/$/, '')}/auth/callback`
}

export function getOAuthCallbackUrl(origin: string = window.location.origin): string {
  return `${origin}${getOAuthCallbackPathname()}`
}

export function assignAppLocation(hashPath: string): void {
  window.location.assign(buildAppLocationUrl(hashPath))
}

export function replaceAppLocation(hashPath: string): void {
  window.location.replace(buildAppLocationUrl(hashPath))
}
