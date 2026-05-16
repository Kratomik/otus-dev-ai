import { getYandexMetrikaId } from './yandexMetrika'

const TAG_URL = 'https://mc.yandex.ru/metrika/tag.js'

function loadMetrikaTag(): void {
  const w = window as Window & { ym?: YmQueue }
  type YmQueue = {
    (...args: unknown[]): void
    a?: unknown[]
    l?: number
  }

  const m = w as unknown as Record<string, YmQueue>
  const i = 'ym'
  m[i] =
    m[i] ??
    function (...args: unknown[]) {
      ;(m[i].a = m[i].a ?? []).push(args)
    }
  m[i].l = Date.now()

  for (let j = 0; j < document.scripts.length; j += 1) {
    if (document.scripts[j]?.src === TAG_URL) return
  }

  const script = document.createElement('script')
  const first = document.getElementsByTagName('script')[0]
  script.async = true
  script.src = TAG_URL
  first?.parentNode?.insertBefore(script, first)
}

const counterId = getYandexMetrikaId()

if (counterId === null) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      '[EcoTrack] VITE_YANDEX_METRIKA_ID is not set — Yandex Metrika disabled. Restart `npm run dev` after editing .env.local.',
    )
  }
} else {
  loadMetrikaTag()
  window.ym?.(counterId, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
    trackHash: true,
  })
}
