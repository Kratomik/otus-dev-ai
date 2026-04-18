import { memo, useEffect, useMemo, useState } from 'react'

type ViewState = 'loading' | 'error' | 'success'

interface ProgressData {
  level: number
  xpCurrent: number
  xpTarget: number
  badges: string[]
}

const MOCK_PROGRESS: ProgressData = {
  level: 4,
  xpCurrent: 650,
  xpTarget: 1000,
  badges: ['🌱', '🚲', '🔋'],
}

function Progress() {
  const [state, setState] = useState<ViewState>('loading')
  const [data, setData] = useState<ProgressData | null>(null)
  const progressData = useMemo(() => MOCK_PROGRESS, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setState('success')
      setData(progressData)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [progressData])

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

      {state === 'loading' && (
        <div className="rounded-2xl border border-[#2979FF]/20 bg-white p-4">
          <p className="font-medium text-[#2979FF]">Loading progress insights...</p>
        </div>
      )}

      {state === 'error' && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="font-medium text-red-700">Progress data is unavailable.</p>
        </div>
      )}

      {state === 'success' && !data && (
        <div className="rounded-2xl border border-[#2979FF]/20 bg-white p-4">
          <p className="font-medium text-[#0D1B2A]">Progress data is not available yet.</p>
          <p className="mt-1 text-sm text-[#0D1B2A]/75">
            Keep using EcoTrack and your stats will appear here.
          </p>
        </div>
      )}

      {state === 'success' && data && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
