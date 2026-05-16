import type { NavigateFunction } from 'react-router-dom'
import type { HandleApiErrorAction } from './supabase'

export function applyHandleApiErrorAction(
  action: HandleApiErrorAction,
  navigate: NavigateFunction,
  setError: (message: string) => void,
): 'continue' | 'stop' {
  switch (action.type) {
    case 'none':
    case 'session-refreshed':
      return 'continue'
    case 'toast':
      return 'stop'
    case 'redirect':
      navigate(action.to, { replace: true })
      return 'stop'
    case 'error':
      setError(action.message)
      return 'stop'
    default:
      return 'stop'
  }
}
