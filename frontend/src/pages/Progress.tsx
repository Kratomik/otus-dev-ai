import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAnalytics } from '../hooks/useAnalytics'
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

interface ProgressSaveFormProps {
  readonly initialXp: number
  readonly initialLevel: number
  readonly loading: boolean
  readonly onSave: (xp: number, level: number) => Promise<void>
}

const ProgressSaveForm = memo(function ProgressSaveForm({
  initialXp,
  initialLevel,
  loading,
  onSave,
}: ProgressSaveFormProps) {
  const [xpDraft, setXpDraft] = useState(String(initialXp))
  const [levelDraft, setLevelDraft] = useState(String(initialLevel))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = async () => {
    setFormError(null)
    const xp = Number(xpDraft)
    const level = Number(levelDraft)
    if (!Number.isFinite(xp) || xp < 0) {
      setFormError('XP должен быть неотрицательным числом.')
      return
    }
    if (!Number.isInteger(level) || level < 1) {
      setFormError('Уровень должен быть целым числом ≥ 1.')
      return
    }
    setSaving(true)
    try {
      await onSave(xp, level)
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="rounded-2xl border border-[#2979FF]/20 bg-white p-4 shadow-sm sm:col-span-2 lg:col-span-3">
      <p className="text-sm text-[#0D1B2A]/70">Сохранить прогресс</p>
      {!!formError && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {formError}
        </p>
      )}
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
        onClick={() => void handleSave()}
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
  )
})

const GOAL_TYPES = ['co2_reduction', 'xp', 'level'] as const

function Progress() {
  const { currentUser } = useSession()
  const { trackEvent } = useAnalytics()
  const { data: progressRow, loading, error, success, upsert } = useProgress()
  const [goalType, setGoalType] = useState<(typeof GOAL_TYPES)[number]>('co2_reduction')
  const [goalTarget, setGoalTarget] = useState('')
  const knownBadgesRef = useRef<string[] | null>(null)
  const progressViewedRef = useRef(false)

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

  const saveFormKey = progressRow?.updated_at ?? `default-${data?.xpCurrent ?? 0}-${data?.level ?? 1}`

  const handleSaveProgress = useCallback(
    async (xp: number, level: number) => {
      if (!currentUser) return
      await upsert({ xp, level, badges: data?.badges ?? DEFAULT_BADGES })
    },
    [currentUser, data?.badges, upsert],
  )

  const progressPercent = useMemo(
    () => (data ? Math.round((data.xpCurrent / data.xpTarget) * 100) : 0),
    [data],
  )

  useEffect(() => {
    if (!success || !data || progressViewedRef.current) return
    progressViewedRef.current = true
    trackEvent('ProgressViewed', {
      level: data.level,
      xp: data.xpCurrent,
      badges_count: data.badges.length,
    })
  }, [success, data, trackEvent])

  useEffect(() => {
    if (!data) return

    if (knownBadgesRef.current === null) {
      knownBadgesRef.current = [...data.badges]
      return
    }

    const known = knownBadgesRef.current
    const earnedAt = new Date().toISOString()
    data.badges.forEach((badgeName) => {
      if (!known.includes(badgeName)) {
        trackEvent('BadgeEarned', { badge_name: badgeName, earned_at: earnedAt })
      }
    })
    knownBadgesRef.current = [...data.badges]
  }, [data, trackEvent])

  const handleExportPdf = useCallback(() => {
    trackEvent('ProgressExported', { format: 'pdf' })
    window.print()
  }, [trackEvent])

  const handleSetGoal = useCallback(() => {
    const target_value = Number(goalTarget)
    if (!Number.isFinite(target_value) || target_value <= 0) return
    trackEvent('GoalSet', { goal_type: goalType, target_value })
    setGoalTarget('')
  }, [goalTarget, goalType, trackEvent])

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
        <div role="alert" className="rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="font-medium text-red-700">Progress data is unavailable.</p>
          <p className="mt-1 text-sm text-red-700/90">{error}</p>
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
          <ProgressSaveForm
            key={saveFormKey}
            initialXp={data.xpCurrent}
            initialLevel={data.level}
            loading={loading}
            onSave={handleSaveProgress}
          />

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

          <article className="rounded-2xl border border-[#2979FF]/20 bg-white p-4 shadow-sm sm:col-span-2">
            <p className="text-sm text-[#0D1B2A]/70">Цель</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="progress-goal-type" className="block text-sm font-medium">
                  Тип цели
                </label>
                <select
                  id="progress-goal-type"
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as (typeof GOAL_TYPES)[number])}
                  className="min-h-[44px] w-full rounded-xl border border-[#2979FF]/30 px-3 py-2 text-base text-[#0D1B2A] outline-none ring-[#2979FF] focus:ring-2"
                >
                  {GOAL_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="progress-goal-target" className="block text-sm font-medium">
                  Целевое значение
                </label>
                <input
                  id="progress-goal-target"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-[#2979FF]/30 px-3 py-2 text-base text-[#0D1B2A] outline-none ring-[#2979FF] focus:ring-2"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleSetGoal}
              className="mt-3 min-h-[44px] w-full rounded-xl bg-[#00E676] px-4 py-2 text-sm font-semibold text-[#0D1B2A] transition-colors hover:bg-[#00C853] motion-reduce:transition-none"
            >
              Установить цель
            </button>
          </article>

          <article className="rounded-2xl border border-[#2979FF]/20 bg-white p-4 shadow-sm">
            <p className="text-sm text-[#0D1B2A]/70">Export</p>
            <button
              type="button"
              onClick={handleExportPdf}
              aria-label="Экспорт прогресса в PDF"
              className={[
                'mt-3 min-h-[44px] w-full rounded-xl border border-[#2979FF]/40',
                'bg-[#2979FF]/20 px-4 py-2 font-semibold text-[#0D1B2A]',
                'transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
                'hover:bg-[#2979FF]/30 active:bg-[#2979FF]/35',
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
