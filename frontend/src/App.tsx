import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAnalytics } from './hooks/useAnalytics'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Calculator from './pages/Calculator'
import AuthLayout from './components/AuthLayout'
import AuthCallback from './pages/AuthCallback'
import ToastHost from './components/ToastHost'
import Login from './pages/Login'
import YandexAccountConfirm from './pages/YandexAccountConfirm'
import Register from './pages/Register'
import RoutePageFallback from './components/RoutePageFallback'

const Recommendations = lazy(() => import('./pages/Recommendations'))
const Progress = lazy(() => import('./pages/Progress'))

export default function App() {
  const location = useLocation()
  const { init, trackPageView } = useAnalytics()

  useEffect(() => {
    const raw = import.meta.env.VITE_YANDEX_METRIKA_ID?.trim()
    if (!raw) return
    const counterId = Number(raw)
    if (!Number.isFinite(counterId)) return
    init(counterId)
  }, [init])

  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname, trackPageView])

  return (
    <>
      <ToastHost />
      <Routes>
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/register"
        element={
          <AuthLayout>
            <Register />
          </AuthLayout>
        }
      />
      <Route
        path="/auth/callback"
        element={
          <AuthLayout>
            <AuthCallback />
          </AuthLayout>
        }
      />
      <Route
        path="/auth/yandex-confirm"
        element={
          <AuthLayout>
            <YandexAccountConfirm />
          </AuthLayout>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/calculator" replace />} />
          <Route path="calculator" element={<Calculator />} />
          <Route
            path="recommendations"
            element={
              <Suspense fallback={<RoutePageFallback label="recommendations" />}>
                <Recommendations />
              </Suspense>
            }
          />
          <Route
            path="progress"
            element={
              <Suspense fallback={<RoutePageFallback label="progress" />}>
                <Progress />
              </Suspense>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </>
  )
}
