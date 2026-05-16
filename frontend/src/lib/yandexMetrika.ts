/** Parsed counter ID from `VITE_YANDEX_METRIKA_ID`, or `null` when unset (e.g. local dev). */
export function getYandexMetrikaId(): number | null {
  const raw = import.meta.env.VITE_YANDEX_METRIKA_ID?.trim()
  if (!raw) return null
  const id = Number(raw)
  return Number.isFinite(id) ? id : null
}

export type YmFn = (counterId: number, method: string, ...args: unknown[]) => void

declare global {
  interface Window {
    ym?: YmFn
  }
}
