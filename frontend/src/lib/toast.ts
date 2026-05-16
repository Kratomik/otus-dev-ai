export interface ToastMessage {
  id: string
  message: string
}

type ToastListener = (toast: ToastMessage) => void

const listeners = new Set<ToastListener>()

export function subscribeToToasts(listener: ToastListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function showToast(message: string): void {
  const toast: ToastMessage = {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
    message,
  }
  listeners.forEach((listener) => listener(toast))
}
