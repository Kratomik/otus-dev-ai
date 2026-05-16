import { memo } from 'react'
import { Link } from 'react-router-dom'

const YANDEX_PASSPORT_URL = 'https://passport.yandex.ru/profile'

function YandexAccountConfirm() {
  return (
    <section className="mx-auto w-full max-w-md space-y-4" aria-labelledby="yandex-confirm-title">
      <header>
        <h2 id="yandex-confirm-title" className="text-2xl font-bold">
          Подтвердите аккаунт Яндекса
        </h2>
        <p className="mt-2 text-sm text-[#0D1B2A]/75">
          Для входа в EcoTrack нужен подтверждённый профиль Яндекс ID (email или телефон).
        </p>
      </header>

      <a
        href={YANDEX_PASSPORT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-[#2979FF] px-4 py-2 font-semibold text-white transition-colors hover:bg-[#1E67E6] focus:outline-none focus:ring-2 focus:ring-[#2979FF] focus:ring-offset-2 motion-reduce:transition-none"
      >
        Открыть настройки Яндекс ID
      </a>

      <p className="text-center text-sm text-[#0D1B2A]/80">
        После подтверждения{' '}
        <Link to="/login" className="font-semibold text-[#2979FF] underline underline-offset-2">
          войдите снова
        </Link>
        .
      </p>
    </section>
  )
}

export default memo(YandexAccountConfirm)
