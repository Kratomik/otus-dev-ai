import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '../dist')
const indexPath = resolve(distDir, 'index.html')

// SPA fallback для GitHub Pages (HashRouter)
copyFileSync(indexPath, resolve(distDir, '404.html'))
writeFileSync(resolve(distDir, '.nojekyll'), '')

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const indexHtml = readFileSync(indexPath, 'utf8')
if (repoName && !indexHtml.includes(`/${repoName}/`)) {
  console.warn(
    `Warning: index.html may be missing base path /${repoName}/. Set VITE_BASE_PATH=/${repoName}/ in CI.`,
  )
}

console.log('GitHub Pages: added 404.html and .nojekyll')
