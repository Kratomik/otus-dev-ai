import type { NavigateFunction } from 'react-router-dom'
import { trackEvent } from '../hooks/useAnalytics'
import { syncYandexProfile, supabase } from './supabase'

/** После успешного OAuth: синхронизация профиля Яндекса и переход в приложение. */
export async function finishAuthSession(
  navigate: NavigateFunction,
  isActive: () => boolean,
): Promise<void> {
  if (!isActive()) return
  const { data } = await supabase.auth.getUser()
  if (!isActive()) return
  await syncYandexProfile(data.user)
  if (!isActive()) return
  trackEvent('UserLoggedIn', { provider: 'yandex' })
  navigate('/calculator', { replace: true })
}
