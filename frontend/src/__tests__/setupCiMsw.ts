import { afterAll, afterEach, beforeAll } from 'vitest'
import { supabaseMswServer } from '../test/msw/supabaseMswServer'

type MswGlobal = typeof globalThis & { __ecotrackMswListening?: boolean }

const globalState = globalThis as MswGlobal

beforeAll(() => {
  if (!globalState.__ecotrackMswListening) {
    supabaseMswServer.listen({ onUnhandledRequest: 'error' })
    globalState.__ecotrackMswListening = true
  }
})

afterEach(() => {
  supabaseMswServer.resetHandlers()
})

afterAll(() => {
  if (globalState.__ecotrackMswListening) {
    supabaseMswServer.close()
    globalState.__ecotrackMswListening = false
  }
})
