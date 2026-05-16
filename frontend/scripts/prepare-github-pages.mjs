import { copyFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '../dist')
const indexPath = resolve(distDir, 'index.html')

copyFileSync(indexPath, resolve(distDir, '404.html'))
writeFileSync(resolve(distDir, '.nojekyll'), '')

console.log('GitHub Pages: added 404.html and .nojekyll')
