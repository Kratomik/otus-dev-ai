import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProgress } from '../hooks/useEcoData'
import { useSession } from '../hooks/useSession'

interface ProgressData {
  level: number
  xpCurrent: number
  xpTarget: number
  badges: string[]
}

const DEFAULT_BADGES: ProgressData['badges'] = ['🌱', '🚲', '🔋']
const DEFAULT_XP_TARGET = 1000

function Progress() {
  const { currentUser } = useSession()
  const { data: progressRow, loading, error, success, upsert } = useProgress()
  const didAlertRef = useRef(false)
  const [xpDraft, setXpDraft] = useState<string>('')
  const [levelDraft, setLevelDraft] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!error) {
      didAlertRef.current = false
      return
    }
    if (didAlertRef.current) return
    window.alert(error)
    didAlertRef.current = true
  }, [error])

  const data = useMemo<ProgressData | null>(() => {
    if (!currentUser) return null
    if (!success) return null

    if (!progressRow) {
      return {
        level: 1,
        xpCurrent: 0,
        xpTarget: DEFAULT_XP_TARGET,
        badges: DEFAULT_BADGES,
      }
    }

    return {
      level: Math.max(1, Math.floor(progressRow.level)),
      xpCurrent: Math.max(0, Math.floor(progressRow.xp)),
      xpTarget: DEFAULT_XP_TARGET,
      badges: progressRow.badges?.length ? progressRow.badges : DEFAULT_BADGES,
    }
  }, [currentUser, progressRow, success])

  useEffect(() => {
    if (!data) return
    setXpDraft(String(data.xpCurrent))
    setLevelDraft(String(data.level))
  }, [data?.level, data?.xpCurrent])

  const onSave = useCallback(async () => {
    if (!currentUser) {
      window.alert('Нужно войти в аккаунт, чтобы сохранить прогресс.')
      return
    }

    const xp = Number(xpDraft)
    const level = Number(levelDraft)
    if (!Number.isFinite(xp) || xp < 0) {
      window.alert('XP должен быть неотрицательным числом.')
      return
    }
    if (!Number.isInteger(level) || level < 1) {
      window.alert('Уровень должен быть целым числом ≥ 1.')
      return
    }

    setSaving(true)
    try {
      await upsert({ xp, level, badges: data?.badges ?? DEFAULT_BADGES })
    } finally {
      setSaving(false)
    }
  }, [currentUser, data?.badges, levelDraft, upsert, xpDraft])

  const progressPercent = useMemo(
    () => (data ? Math.round((data.xpCurrent / data.xpTarget) * 100) : 0),
    [data],
  )

  return (
    <section aria-live="polite" className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">Progress</h2>
        <p className="mt-1 text-sm text-[#0D1B2A]/75">
          Follow trends and celebrate consistent improvements.
        </p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-[#2979FF]/20 bg-white p-4">
          <p className="inline-flex items-center gap-2 font-medium text-[#2979FF]">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-[#2979FF]/30 border-t-[#2979FF]"
            />
            Loading progress insights...
          </p>
        </div>
      )}

      {!!error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="font-medium text-red-700">Progress data is unavailable.</p>
        </div>
      )}

      {!loading && !error && !data && (
        <div className="rounded-2xl border border-[#2979FF]/20 bg-white p-4">
          <p className="font-medium text-[#0D1B2A]">Progress data is not available yet.</p>
          <p className="mt-1 text-sm text-[#0D1B2A]/75">
            Keep using EcoTrack and your stats will appear here.
          </p>
        </div>
      )}

      {!loading && !error && data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl border border-[#2979FF]/20 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-3">
            <p className="text-sm text-[#0D1B2A]/70">Сохранить прогресс</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="progress-xp" className="block text-sm font-medium">
                  XP
                </label>
                <input
                  id="progress-xp"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={xpDraft}
                  onChange={(e) => setXpDraft(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#2979FF]/30 px-3 py-2 text-base text-[#0D1B2A] outline-none ring-[#2979FF] focus:ring-2"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="progress-level" className="block text-sm font-medium">
                  Level
                </label>
                <input
                  id="progress-level"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={levelDraft}
                  onChange={(e) => setLevelDraft(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#2979FF]/30 px-3 py-2 text-base text-[#0D1B2A] outline-none ring-[#2979FF] focus:ring-2"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={saving || loading}
              className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2979FF] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1E67E6] active:bg-[#1757BD] disabled:opacity-70 motion-reduce:transition-none"
            >
              {(saving || loading) && (
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
              )}
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </article>

          <article className="rounded-2xl border border-[#00E676]/30 bg-white p-4 shadow-sm">
            <p className="text-sm text-[#0D1B2A]/70">Level</p>
            <p className="mt-2 text-3xl font-bold text-[#2979FF]">{data.level}</p>
          </article>

          <article className="rounded-2xl border border-[#00E676]/30 bg-white p-4 shadow-sm sm:col-span-2">
            <p className="text-sm text-[#0D1B2A]/70">XP Progress</p>
            <p className="mt-2 text-lg font-semibold text-[#0D1B2A]">
              {data.xpCurrent}/{data.xpTarget}
            </p>
            <div
              className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[#0D1B2A]/15"
              aria-label={`XP progress ${progressPercent}%`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuenow={data.xpCurrent}
              aria-valuemax={data.xpTarget}
            >
              <div
                style={{ width: `${progressPercent}%` }}
                className={[
                  'h-full rounded-full bg-[#00E676]',
                  'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                  'motion-reduce:transition-none',
                ].join(' ')}
              />
            </div>
          </article>

          <article className="rounded-2xl border border-[#00E676]/30 bg-white p-4 shadow-sm lg:col-span-2">
            <p className="text-sm text-[#0D1B2A]/70">Badges</p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="User badges">
              {data.badges.map((badge) => (
                <li
                  key={badge}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-[#F5F9F7] px-3 text-2xl"
                  aria-label={`Badge ${badge}`}
                >
                  <span aria-hidden="true">{badge}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-[#2979FF]/20 bg-white p-4 shadow-sm">
            <p className="text-sm text-[#0D1B2A]/70">Export</p>
            <button
              type="button"
              disabled
              aria-label="Экспорт PDF недоступен"
              className={[
                'mt-3 min-h-[44px] w-full rounded-xl border border-[#2979FF]/40',
                'bg-[#2979FF]/20 px-4 py-2 font-semibold text-[#0D1B2A]',
                'transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'hover:bg-[#2979FF]/30 active:bg-[#2979FF]/35',
                'disabled:cursor-not-allowed disabled:opacity-70',
                'motion-reduce:transition-none',
              ].join(' ')}
            >
              Экспорт PDF
            </button>
          </article>
        </div>
      )}
    </section>
  )
}

export default memo(Progress)
