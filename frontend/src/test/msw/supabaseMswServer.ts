import { setupServer } from 'msw/node'
import { createDefaultSupabaseHandlers } from './supabaseApiHandlers'

/** Один инстанс MSW на процесс Vitest (CI + supabaseApiEndpoints). */
export const supabaseMswServer = setupServer(...createDefaultSupabaseHandlers())
