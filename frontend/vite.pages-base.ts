/**
 * GitHub Pages base path:
 * - user/org site repo `owner.github.io` → `/`
 * - project site repo `owner/any-other` → `/repo-name/`
 */
export function resolveVitePagesBase(): string {
  const fromEnv = process.env.VITE_BASE_PATH?.trim()
  if (fromEnv) {
    return fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`
  }

  if (process.env.GITHUB_ACTIONS !== 'true') {
    return '/'
  }

  const full = process.env.GITHUB_REPOSITORY ?? ''
  const [owner, repo] = full.split('/')
  if (!repo) {
    return '/'
  }

  if (repo === `${owner}.github.io`) {
    return '/'
  }

  return `/${repo}/`
}
