/**
 * CI: убедиться, что VITE_SUPABASE_* заданы до `vite build`.
 * Запуск: node scripts/verify-supabase-build-env.mjs
 */

const url = process.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

const missing = []
if (!url) missing.push('VITE_SUPABASE_URL')
if (!key) missing.push('VITE_SUPABASE_ANON_KEY')

if (missing.length > 0) {
  console.error(
    [
      `Missing required env for production build: ${missing.join(', ')}`,
      '',
      'GitHub: Settings → Secrets and variables → Actions',
      '  - Secret  VITE_SUPABASE_ANON_KEY  = ANON_KEY from backend/.env',
      '  - Secret or Variable VITE_SUPABASE_URL = public Kong URL (e.g. https://api.example.com)',
      '',
      'Local Pages build:',
      '  VITE_SUPABASE_URL=http://localhost:8000 VITE_SUPABASE_ANON_KEY=<anon> npm run build:pages',
    ].join('\n'),
  )
  process.exit(1)
}

try {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('protocol')
  }
} catch {
  console.error(`VITE_SUPABASE_URL is not a valid URL: ${url}`)
  process.exit(1)
}

console.log(`Supabase build env OK (url=${url})`)
