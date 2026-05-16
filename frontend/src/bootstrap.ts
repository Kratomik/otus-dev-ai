/**
 * Должен выполниться до первого обращения к Supabase (PKCE code в URL → hash-маршрут).
 */
import { clearLegacyPersistedAuthSessions } from './lib/authStorage'
import { normalizeAuthCallbackLocation } from './lib/authOAuth'

clearLegacyPersistedAuthSessions()
normalizeAuthCallbackLocation()
