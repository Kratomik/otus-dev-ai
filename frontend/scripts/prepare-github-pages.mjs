import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '../dist')
const indexPath = resolve(distDir, 'index.html')

function resolveRepoContext() {
  const full = process.env.GITHUB_REPOSITORY ?? ''
  const [owner, repo] = full.split('/')
  const isUserSite = Boolean(owner && repo && repo === `${owner}.github.io`)
  return { owner, repo, isUserSite }
}

// SPA fallback для GitHub Pages (HashRouter)
copyFileSync(indexPath, resolve(distDir, '404.html'))
writeFileSync(resolve(distDir, '.nojekyll'), '')

const { owner, repo, isUserSite } = resolveRepoContext()
let indexHtml = readFileSync(indexPath, 'utf8')

if (repo && !isUserSite && !indexHtml.includes(`/${repo}/`)) {
  console.warn(
    `Warning: index.html may be missing base path /${repo}/. Set VITE_BASE_PATH=/${repo}/ in CI.`,
  )
}

// Подсказка в консоли при открытии с неверного корня github.io (project site)
if (repo && owner && !isUserSite) {
  const hint = `<script>(function(){try{var r=${JSON.stringify(repo)};var need="/"+r+"/";if(location.hostname.endsWith("github.io")&&location.pathname!==need&&location.pathname!=="/"+r&&!location.pathname.startsWith(need)){console.warn("[EcoTrack] Откройте https://"+location.hostname+"/"+r+"/#/login (не корень github.io)");}}catch(e){}})();</script>`
  if (!indexHtml.includes('[EcoTrack]')) {
    indexHtml = indexHtml.replace('</head>', `    ${hint}\n  </head>`)
    writeFileSync(indexPath, indexHtml)
    copyFileSync(indexPath, resolve(distDir, '404.html'))
  }
}

console.log(
  `GitHub Pages: 404.html, .nojekyll (${isUserSite ? 'user site' : `project /${repo}/`})`,
)
