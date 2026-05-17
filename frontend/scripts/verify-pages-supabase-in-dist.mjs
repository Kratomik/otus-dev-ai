/**
 * CI: после сборки проверить, что Vite встроил Supabase URL/ключ в бандл.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const distAssets = resolve(import.meta.dirname, '../dist/assets')
const url = process.env.VITE_SUPABASE_URL?.trim() ?? ''
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

if (!url || !key) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY must be set')
  process.exit(1)
}

const jsFiles = readdirSync(distAssets).filter((name) => name.endsWith('.js'))
const bundle = jsFiles.map((name) => readFileSync(resolve(distAssets, name), 'utf8')).join('\n')

if (!bundle.includes(url)) {
  console.error(
    `Built assets do not contain VITE_SUPABASE_URL (${url}). Env was not applied during vite build.`,
  )
  process.exit(1)
}

if (!bundle.includes(key)) {
  console.error(
    'Built assets do not contain VITE_SUPABASE_ANON_KEY. Secret was not applied during vite build.',
  )
  process.exit(1)
}

console.log('dist/assets contain inlined Supabase config')
