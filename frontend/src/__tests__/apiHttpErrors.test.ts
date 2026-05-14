import type { PostgrestError } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { getPostgrestUserMessage, interpretPostgrestError } from '../lib/apiHttpErrors'

vi.mock('../lib/logClientError', () => ({
  logApiHttpErrorToSupabase: vi.fn(),
}))

function makeError(partial: Partial<PostgrestError> & { message: string }): PostgrestError {
  return partial as PostgrestError
}

describe('apiHttpErrors', () => {
  it('maps 403 to user-facing Russian message', () => {
    const err = makeError({
      message: 'Forbidden',
      details: null,
      hint: null,
      code: '42501',
    })
    Object.assign(err, { status: 403 })
    expect(getPostgrestUserMessage(err)).toMatch(/Недостаточно прав/)
  })

  it('returns redirect-login for 401', () => {
    const err = makeError({ message: 'JWT expired', code: 'PGRST301' })
    Object.assign(err, { status: 401 })
    expect(interpretPostgrestError(err, 'test.ctx')).toEqual({ kind: 'redirect-login' })
  })
})
