import { memo } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

function ProtectedRoute() {
  const { loading, currentUser } = useSession()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F9F7] p-4">
        <p className="text-sm font-medium text-[#2979FF]" role="status" aria-live="polite">
          Проверка сессии…
        </p>
      </div>
    )
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default memo(ProtectedRoute)
