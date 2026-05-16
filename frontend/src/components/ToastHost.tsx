import { memo, useEffect, useState } from 'react'
import { subscribeToToasts, type ToastMessage } from '../lib/toast'

const TOAST_DURATION_MS = 4500

function ToastHost() {
  const [toast, setToast] = useState<ToastMessage | null>(null)

  useEffect(() => {
    return subscribeToToasts((next) => {
      setToast(next)
    })
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (!toast) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-50 w-[min(100%-2rem,24rem)] -translate-x-1/2 rounded-xl border border-[#0D1B2A]/10 bg-[#0D1B2A] px-4 py-3 text-center text-sm font-medium text-white shadow-lg"
    >
      {toast.message}
    </div>
  )
}

export default memo(ToastHost)
