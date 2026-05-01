import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'

// If user opens "/login" directly, HashRouter won't see it.
// Normalize to the hash-based route to avoid blank screens / redirect loops.
if (window.location.pathname === '/login' && !window.location.hash) {
  window.location.replace('/#/login')
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
