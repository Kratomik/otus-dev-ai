import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { SECURITY_HEADERS } from './vite.security'

const YANDEX_METRIKA_SCRIPT_RE =
  /\s*<!-- Yandex\.Metrika: ID из import\.meta\.env\.VITE_YANDEX_METRIKA_ID \(см\. src\/lib\/yandexMetrikaInit\.ts\) -->\s*<script type="module" src="\/src\/lib\/yandexMetrikaInit\.ts"><\/script>/
const YANDEX_METRIKA_NOSCRIPT_MARKER = /<!-- vite:yandex-metrika-noscript -->/

function buildMetrikaNoscript(counterId: string): string {
  return `    <noscript><div><img src="https://mc.yandex.ru/watch/${counterId}" style="position:absolute; left:-9999px;" alt="" /></div></noscript>`
}

/** Убирает Метрику из index.html без ID; подставляет noscript при наличии ID. */
function yandexMetrikaHtmlPlugin(): Plugin {
  let metrikaId = ''

  return {
    name: 'ecotrack-yandex-metrika-html',
    config(_, { mode }) {
      const env = loadEnv(mode, process.cwd(), '')
      metrikaId = env.VITE_YANDEX_METRIKA_ID?.trim() ?? ''
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!metrikaId) {
          return html
            .replace(YANDEX_METRIKA_SCRIPT_RE, '')
            .replace(YANDEX_METRIKA_NOSCRIPT_MARKER, '')
        }
        return html.replace(
          YANDEX_METRIKA_NOSCRIPT_MARKER,
          buildMetrikaNoscript(metrikaId),
        )
      },
    },
  }
}

/** CSP в index.html для GitHub Pages (нет произвольных HTTP-заголовков). */
function securityMetaPlugin(): Plugin {
  const csp = SECURITY_HEADERS['Content-Security-Policy']
  const escaped = csp.replace(/"/g, '&quot;')
  const meta = [
    `<meta http-equiv="Content-Security-Policy" content="${escaped}" />`,
    '<meta http-equiv="X-Content-Type-Options" content="nosniff" />',
  ].join('\n    ')

  return {
    name: 'ecotrack-security-meta',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace('</head>', `    ${meta}\n  </head>`)
      },
    },
  }
}

// CSP на dev-сервер не вешаем: ломает Vite HMR (белый экран).
export default defineConfig({
  plugins: [react(), yandexMetrikaHtmlPlugin(), securityMetaPlugin()],
  preview: { headers: SECURITY_HEADERS },
})
