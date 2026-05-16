import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { supabase, syncYandexProfile } from '../lib/supabase'

const yandexUser = {
  id: 'user-1',
  app_metadata: { provider: 'yandex' },
  user_metadata: { avatar_url: 'https://avatars.yandex.net/u/1' },
  identities: [{ provider: 'yandex' }],
} as unknown as User

describe('syncYandexProfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('updates profiles.avatar_url on first Yandex login when metadata has avatar', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { avatar_url: null }, error: null }),
            }),
          }),
          update: () => ({ eq: updateEq }),
        } as ReturnType<typeof supabase.from>
      }
      if (table === 'client_errors') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        } as ReturnType<typeof supabase.from>
      }
      return {} as ReturnType<typeof supabase.from>
    })

    await syncYandexProfile(yandexUser)

    expect(updateEq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('skips update when profile already has avatar_url', async () => {
    const update = vi.fn()
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { avatar_url: 'https://existing.avatar' },
                error: null,
              }),
            }),
          }),
          update,
        } as ReturnType<typeof supabase.from>
      }
      return {} as ReturnType<typeof supabase.from>
    })

    await syncYandexProfile(yandexUser)

    expect(update).not.toHaveBeenCalled()
  })

  it('skips non-Yandex users', async () => {
    const fromSpy = vi.spyOn(supabase, 'from')

    await syncYandexProfile({
      ...yandexUser,
      app_metadata: { provider: 'email' },
      identities: [],
    } as unknown as User)

    expect(fromSpy).not.toHaveBeenCalledWith('profiles')
  })
})
