import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'

// If user opens "/login" or "/register" directly, HashRouter won't see it.
// Normalize to the hash-based route to avoid blank screens / redirect loops.
const path = window.location.pathname
if ((path === '/login' || path === '/register') && !window.location.hash) {
  window.location.replace(`/#${path}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)
