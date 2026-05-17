import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'
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
const pagesBase =
  process.env.VITE_BASE_PATH ??
  (process.env.GITHUB_ACTIONS === 'true'
    ? `/${process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''}/`
    : '/')

export default defineConfig({
  base: pagesBase,
  plugins: [
    react(),
    yandexMetrikaHtmlPlugin(),
    securityMetaPlugin(),
    viteCompression({ algorithm: 'gzip', threshold: 1024 }),
    viteCompression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts')) return 'recharts'
          if (id.includes('react-router')) return 'router'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react-dom') || /\/react\//.test(id)) return 'react-vendor'
        },
      },
    },
  },
  preview: { headers: SECURITY_HEADERS },
})
