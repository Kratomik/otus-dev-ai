import { afterAll, afterEach, beforeAll } from 'vitest'
import { supabaseMswServer } from '../test/msw/supabaseMswServer'

beforeAll(() => {
  supabaseMswServer.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  supabaseMswServer.resetHandlers()
})

afterAll(() => {
  supabaseMswServer.close()
})
