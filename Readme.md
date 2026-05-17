# EcoTrack (MVP)

Локальный каркас приложения: **React 18 + TypeScript + Vite** (frontend) и **Supabase** (PostgreSQL, Auth, PostgREST) как бэкенд данных.

## Вариант развёртывания: **B — self-hosted / локально**

Выбран **вариант B**: Supabase и PostgreSQL поднимаются **в Docker Compose** в каталоге `backend/`, без облачного проекта Supabase. Запросы из приложения идут на локальный шлюз Kong (по умолчанию порт **8000**).

Подробное описание HTTP/API по таблицам см. в [`backend/backend_documentation.md`](backend/backend_documentation.md) (разделы про PostgREST и Auth); сценарий установки ниже — **единый воспроизводимый путь** для локальной машины.

---

## Требования

| Компонент | Назначение |
|-----------|------------|
| **Docker Engine** + **Docker Compose v2** | Запуск стека Supabase |
| **OpenSSL** | Скрипт генерации секретов `backend/utils/generate-keys.sh` |
| **Node.js** 20+ и **npm** | Сборка и dev-сервер frontend |

---

## 1. Установка Docker

Официальные инструкции (выберите ОС и дистрибутив): [Install Docker Engine](https://docs.docker.com/engine/install/).

Кратко:

- **Linux**: пакетный менеджер дистрибутива или скрипт [get.docker.com](https://get.docker.com/) (по документации Docker), затем включите сервис `docker` и при необходимости добавьте пользователя в группу `docker`, чтобы не запускать Compose только от root.
- **macOS / Windows**: [Docker Desktop](https://docs.docker.com/desktop/).

Проверка:

```bash
docker --version
docker compose version
```

Если привыкли к команде **`docker-compose`** (с дефисом) и видите **`KeyError: 'ContainerConfig'`** — один раз из `backend/`:

```bash
./setup-compose.sh
```

Скрипт ставит обёртку в `~/.local/bin/docker-compose`, которая вызывает Compose V2. Либо используйте только `docker compose` или `./compose.sh`.

---

## 2. Конфигурация backend (Supabase)

Все команды ниже выполняются из каталога **`backend/`** репозитория.

### 2.1. Создать `.env` из шаблона

Файл **`backend/.env`** в git не хранится (см. корневой `.gitignore`). Его нужно создать локально:

```bash
cd backend
cp .env.example .env
```

### 2.2. Обязательно заменить секреты перед первым запуском

В шапке `backend/.env.example` указано: нельзя оставлять дефолтные пароли и ключи для реального окружения. Для **локального** стенда проще всего один раз сгенерировать значения скриптом Supabase из этого репозитория (нужен `openssl`):

```bash
cd backend
sh utils/generate-keys.sh --update-env
```

Скрипт обновит в `.env`, в частности: **`JWT_SECRET`**, **`ANON_KEY`**, **`SERVICE_ROLE_KEY`**, **`POSTGRES_PASSWORD`**, **`DASHBOARD_PASSWORD`**, **`SECRET_KEY_BASE`**, **`VAULT_ENC_KEY`**, **`PG_META_CRYPTO_KEY`**, токены Logflare, ключи S3-протокола и др. (см. вывод и комментарии в `utils/generate-keys.sh`).

Дополнительно проверьте по необходимости:

- **`SUPABASE_PUBLIC_URL`** и **`API_EXTERNAL_URL`** — для доступа с хоста обычно `http://localhost:8000` (если не меняли **`KONG_HTTP_PORT`** в `.env`).
- **`POOLER_TENANT_ID`** — для локального запуска часто оставляют значение из примера, но оно должно быть осмысленной строкой (не пустое «заглушка», если сервис pooler ругается).
- Регистрация по email: в примере задано **`ENABLE_EMAIL_AUTOCONFIRM=true`**, чтобы не зависеть от реального SMTP при разработке (иначе смотрите Inbucket на `http://127.0.0.1:9000` и настройки `mail` в Compose).

После смены **`ANON_KEY`** его же нужно будет прописать во frontend (см. шаг 4).

---

## 3. Запуск Docker Compose

Из **`backend/`**:

```bash
docker compose up -d
# то же: docker-compose up -d  (после ./setup-compose.sh)
```

Дождитесь готовности сервисов (при первом запуске образы скачиваются дольше). Остановка:

```bash
docker compose down
```

Полезные URL по умолчанию:

| URL | Назначение |
|-----|------------|
| `http://localhost:8000` | Kong: API, Studio (через маршруты Kong), точка входа для `VITE_SUPABASE_URL` |
| `http://127.0.0.1:9000` | Inbucket (просмотр писем), если отключён автоподтверждение email |

---

## 4. Применение SQL-миграции схемы приложения

Схема таблиц, RLS и начальные данные для EcoTrack лежат в **`backend/supabase_migration.sql`**. После основной миграции выполните **`backend/supabase_performance_indexes.sql`** (индексы для `calculations`, `recommendations`, `client_errors`).

**Новая база (первый подъём стека):**

1. Откройте в браузере **`http://localhost:8000`**. Kong запросит **HTTP Basic Auth**: логин и пароль из **`backend/.env`** — переменные **`DASHBOARD_USERNAME`** и **`DASHBOARD_PASSWORD`** (после `generate-keys.sh` пароль сгенерирован случайно; смотрите актуальное значение в `.env`).
2. В **Supabase Studio** откройте **SQL Editor**, вставьте содержимое файла **`backend/supabase_migration.sql`**, выполните запрос целиком.

В конце миграции создаётся триггер: при регистрации пользователя в **`auth.users`** автоматически добавляется строка в **`public.profiles`** (раньше таблица оставалась пустой, потому что ни SQL, ни фронт не делали `INSERT` в `profiles`).

**Уже есть пользователи, а `profiles` пустая:** один раз выполните **`backend/supabase_profile_trigger.sql`** (триггер + бэкфилл для существующих `auth.users`).

Альтернатива — выполнить SQL через `psql` в контейнере БД (если знакомы с `docker compose exec` и паролем `POSTGRES_PASSWORD`).

**Уже развёрнутая БД без полного RLS:** в Studio на таблицах `profiles`, `calculations`, `user_progress`, `recommendations`, `client_errors` должна быть включена **Row Level Security** на всех пяти. Если RLS выключена (частый случай после старых фрагментов SQL: политика на `recommendations` без `ENABLE ROW LEVEL SECURITY`, или `profiles` без RLS), один раз выполните **`backend/supabase_security_patch.sql`** — он идемпотентен и выравнивает RLS/политики/GRANT с актуальной миграцией.

---

## 5. Frontend

Из каталога **`frontend/`**:

```bash
cd frontend
cp .env.example .env.local
```

Отредактируйте **`frontend/.env.local`**:

- **`VITE_SUPABASE_URL`** — тот же базовый URL, что и **`SUPABASE_PUBLIC_URL`** (часто `http://localhost:8000`).
- **`VITE_SUPABASE_ANON_KEY`** — значение **`ANON_KEY`** из **`backend/.env`** (после `generate-keys.sh` оно уже уникальное).
- **`VITE_YANDEX_METRIKA_ID`** — номер счётчика Яндекс.Метрики (опционально для локальной разработки; см. раздел **📊 Аналитика** ниже).

Установка зависимостей и dev-сервер:

```bash
npm install
npm run dev
```

По умолчанию Vite: **`http://localhost:5173`**.

Тесты (Vitest):

```bash
npm run test
```

### GitHub Pages (production)

Сборка и деплой: workflow [`.github/workflows/deploy-frontend-pages.yml`](.github/workflows/deploy-frontend-pages.yml) (ветка `master`).

**URL приложения** (project site, не корень `github.io`):

`https://kratomik.github.io/otus-dev-ai/#/login`

| Неверно | Верно |
|---------|--------|
| `https://kratomik.github.io/#/login` | `https://kratomik.github.io/otus-dev-ai/#/login` |

В **Settings → Secrets and variables → Actions** задайте (значения попадают в бандл **на этапе сборки** в workflow):

| Имя | Тип | Значение |
|-----|-----|----------|
| `VITE_SUPABASE_ANON_KEY` | **Secret** | `ANON_KEY` из `backend/.env` |
| `VITE_SUPABASE_URL` | Secret или **Variable** | публичный URL Kong (`SUPABASE_PUBLIC_URL`), например `https://your-api.example.com` |
| `VITE_YANDEX_METRIKA_ID` | Secret | опционально |

Локально те же переменные — в `frontend/.env.local`:

```env
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=<ANON_KEY из backend/.env>
```

> **Важно:** `http://localhost:8000` в secrets GitHub **не сработает** для посетителей Pages с других устройств — браузер обращается к их localhost, а не к вашему. Для демо на Pages нужен **доступный из интернета** URL (VPS, туннель ngrok/cloudflared к порту 8000 и т.п.).

После добавления secrets перезапустите деплой: **Actions → Deploy Frontend to GitHub Pages → Run workflow** (или push в `master` с изменением `frontend/**`).

В **Settings → Pages** источник: **GitHub Actions**.

---

## Оптимизация frontend

Применённые оптимизации производительности SPA (React 18 + Vite): уменьшение initial bundle, отложенная загрузка тяжёлых модулей, мемоизация ререндеров, разбиение vendor-чанков, сжатие артефактов сборки.

### Анализ тяжёлых мест

| Компонент / модуль | Нагрузка | Решение |
|--------------------|----------|---------|
| **recharts** (`EmissionsPieChart`) | Крупнейший vendor (~318 KB, gzip ~94 KB) | `React.lazy` в Calculator; отдельный chunk `recharts` |
| **@supabase/supabase-js** | ~203 KB | Chunk `supabase`, не тянется на страницах без API |
| **Recommendations** | Список + `sanitizeDisplayText` в `useMemo` | Lazy-route, отдельный chunk ~3.7 KB |
| **Progress** | Форма XP, бейджи, несколько эффектов | Lazy-route + `memo(ProgressSaveForm)` |
| **Calculator** | Стартовый маршрут после логина | Eager import (основной экран) |

Списки рекомендаций небольшие — виртуализация не требуется. Узкое место — график и Supabase-клиент.

### 1. Code splitting (`React.lazy` + `Suspense`)

Маршруты **Recommendations** и **Progress** подгружаются только при переходе:

```tsx
// frontend/src/App.tsx
const Recommendations = lazy(() => import('./pages/Recommendations'))
const Progress = lazy(() => import('./pages/Progress'))

<Route
  path="recommendations"
  element={
    <Suspense fallback={<RoutePageFallback label="recommendations" />}>
      <Recommendations />
    </Suspense>
  }
/>
```

График в калькуляторе — отдельный чанк до успешного расчёта:

```tsx
// frontend/src/pages/Calculator.tsx
const EmissionsPieChart = lazy(() => import('../components/EmissionsPieChart'))

<Suspense fallback={<div className="h-64 …">Loading chart…</div>}>
  <EmissionsPieChart data={chartData} />
</Suspense>
```

**Preload по намерению** — при наведении/фокусе на пункт меню чанк начинает грузиться до клика:

```tsx
// frontend/src/components/Layout.tsx
const preloadRecommendations = (): void => {
  void import('../pages/Recommendations')
}

<NavLink to={to} onMouseEnter={() => preloadRoute(to)} onFocus={() => preloadRoute(to)} … />
```

Fallback: `frontend/src/components/RoutePageFallback.tsx` (доступный спиннер, `aria-busy`).

### 2. `useMemo` и `useCallback`

| Место | Зачем |
|-------|--------|
| `Recommendations` | `viewItems` — санитизация списка один раз при смене `items`; `handleRecommendationClick` — стабильный обработчик для кнопок |
| `Progress` | `data`, `progressPercent` — производные от ответа API; `handleSaveProgress` — не ломает `memo` у формы |
| `ProgressSaveForm` | `memo(...)` — ввод цели (`goalType`) не перерисовывает форму XP |
| `Calculator` | `fields` для полей ввода; `handleCalculate` для submit |
| `useAnalytics` / `useEcoData` | Стабильные ссылки на методы в зависимостях `useEffect` |

Пример на странице рекомендаций:

```tsx
const viewItems = useMemo(
  () => items.map((item) => ({
    id: item.id,
    text: sanitizeDisplayText(item.text, 500),
    co2Savings: sanitizeDisplayText(item.co2_saving, 64),
    difficulty: sanitizeDisplayText(item.difficulty ?? 'Средне', 32),
    impact: item.impact ?? 5,
  })),
  [items],
)

const handleRecommendationClick = useCallback(
  (recommendationId: number, difficulty: string, impact: number) => {
    trackEvent('RecommendationClicked', { recommendation_id: recommendationId, difficulty, impact })
  },
  [trackEvent],
)
```

### 3. Импорты библиотек

| Библиотека | Практика в проекте |
|------------|-------------------|
| **lodash** | Не используется |
| **recharts** | Именованные импорты: `Pie`, `PieChart`, `Cell`, `Tooltip` |
| **lucide-react** | Только нужные иконки: `Calculator`, `Leaf`, `BarChart3` |
| **@supabase/supabase-js** | Точечный импорт клиента из `lib/supabase.ts` |

Полные импорты вида `import _ from 'lodash'` или `import * as Recharts from 'recharts'` в коде отсутствуют.

### 4. Сборка Vite (`frontend/vite.config.ts`)

| Настройка | Эффект |
|-----------|--------|
| `minify: 'terser'` + `drop_console` | Меньший prod-bundle, без `console.*` |
| `vite-plugin-compression` (gzip + brotli) | `.gz` / `.br` для статики > 1 KB (CDN/nginx) |
| `chunkSizeWarningLimit: 600` | Контроль крупных чанков при сборке |
| `manualChunks` | Отдельные файлы: `react-vendor`, `router`, `supabase`, `recharts` |

```ts
build: {
  minify: 'terser',
  terserOptions: {
    compress: { drop_console: true, drop_debugger: true },
  },
  chunkSizeWarningLimit: 600,
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (!id.includes('node_modules')) return
        if (id.includes('recharts')) return 'recharts'
        if (id.includes('react-router')) return 'router'
        if (id.includes('@supabase')) return 'supabase'
        if (id.includes('react-dom') || /\/react\//.test(id)) return 'react-vendor'
      },
    },
  },
},
```

Dev-зависимости: `terser`, `vite-plugin-compression`.

**Пример вывода `npm run build`** (отдельные чанки страниц):

```text
dist/assets/Recommendations-….js    3.74 kB │ gzip:  1.42 kB
dist/assets/Progress-….js          8.84 kB │ gzip:  2.74 kB
dist/assets/EmissionsPieChart-….js   0.68 kB │ gzip:  0.46 kB
dist/assets/recharts-….js         318.35 kB │ gzip: 94.03 kB
```

До перехода на `/recommendations` или `/progress` их JS не загружается; recharts — только после расчёта в Calculator.

### Проверка

```bash
cd frontend
npm run build    # размеры чанков в консоли
npm run test     # 91 тест, регрессии lazy/Suspense
npm run preview  # prod-сборка локально
```

### Связанные файлы

| Файл | Назначение |
|------|------------|
| `frontend/src/App.tsx` | Lazy-роуты Recommendations / Progress |
| `frontend/src/components/RoutePageFallback.tsx` | UI загрузки для Suspense |
| `frontend/src/components/Layout.tsx` | Preload чанков по hover/focus |
| `frontend/src/pages/Calculator.tsx` | Lazy `EmissionsPieChart` |
| `frontend/vite.config.ts` | Terser, compression, `manualChunks` |

---

## Оптимизация backend

Оптимизации для **PostgreSQL (Supabase/PostgREST)** и **Fastify health-сервера** (`backend/health/`). Prisma в проекте нет: доменные данные читаются через PostgREST с фронта; health-сервер — health-check, приём логов и опциональный кэшированный API рекомендаций.

### Архитектура и анализ запросов

| Слой | Доступ к БД | N+1 |
|------|-------------|-----|
| **PostgREST** (Kong :8000) | `calculations`, `recommendations`, `user_progress` с фронта | Риск при запросах в цикле на клиенте; сейчас рекомендации — **один** `select` |
| **Fastify health** (`pg`) | `SELECT 1` для `/health`, один `SELECT` для `/recommendations` | **Нет** запросов в циклах |

Пример запроса рекомендаций с фронта (PostgREST):

```ts
// frontend/src/hooks/useEcoData.ts
const { data } = await supabase
  .from('recommendations')
  .select('*')
  .eq('is_active', true)
  .order('id', { ascending: false })
  .limit(50)
```

### 1. Индексы для часто фильтруемых полей

Файл **`backend/supabase_performance_indexes.sql`** (после `supabase_migration.sql`):

```sql
-- calculations: RLS auth.uid() = user_id, история расчётов
CREATE INDEX IF NOT EXISTS idx_calculations_user_id
  ON public.calculations (user_id);

CREATE INDEX IF NOT EXISTS idx_calculations_user_created_at
  ON public.calculations (user_id, created_at DESC);

-- recommendations: WHERE is_active = true ORDER BY id DESC
CREATE INDEX IF NOT EXISTS idx_recommendations_active_id
  ON public.recommendations (id DESC)
  WHERE is_active = true;

-- client_errors: отчёты по времени / user_id
CREATE INDEX IF NOT EXISTS idx_client_errors_created_at
  ON public.client_errors (created_at DESC);
```

RLS для справочника рекомендаций приведён к фильтру на фронте:

```sql
CREATE POLICY "Public read recommendations" ON public.recommendations
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
```

| Таблица | Поля фильтра | Индекс |
|---------|--------------|--------|
| `calculations` | `user_id`, сортировка `created_at` | `(user_id)`, `(user_id, created_at DESC)` |
| `recommendations` | `is_active`, `id` | partial index `WHERE is_active` |
| `client_errors` | `created_at`, `user_id` | `(created_at DESC)`, `(user_id)` |
| `user_progress` | `user_id` | PK уже покрывает |

### 2. GZIP / deflate ответов (Fastify)

Плагин **`@fastify/compress`** — сжатие JSON/HTML ответов ≥ 1 KB:

```ts
// backend/health/src/plugins/security.ts
await fastify.register(compress, {
  global: true,
  encodings: ['gzip', 'deflate'],
  threshold: 1024,
});
```

Проверка:

```bash
curl -s -H 'Accept-Encoding: gzip' -D - http://localhost:3002/health -o /dev/null
# ожидается: Content-Encoding: gzip
```

### 3. In-memory кэш рекомендаций

Справочник рекомендаций меняется редко → TTL-кэш (по умолчанию **5 мин**, `RECOMMENDATIONS_CACHE_TTL_MS`).

```ts
// backend/health/src/lib/memoryCache.ts
export function createMemoryCache<T>(ttlMs: number): MemoryCache<T> {
  // get() / set() с expiresAt
}

// backend/health/src/services/recommendations.ts
const cache = createMemoryCache<RecommendationRow[]>(env.recommendationsCacheTtlMs);

export async function getActiveRecommendations(pool: Pool) {
  const cached = cache.get();
  if (cached !== null) return { items: cached, cached: true };
  const result = await pool.query(SELECT_ACTIVE_RECOMMENDATIONS);
  cache.set(result.rows);
  return { items: result.rows, cached: false };
}
```

Эндпоинт **`GET /recommendations`** (опциональный BFF; фронт может по-прежнему использовать PostgREST):

```bash
curl -s -D - http://localhost:3002/recommendations | head -15
# первый раз: X-Cache: MISS
# повтор в течение TTL: X-Cache: HIT, Cache-Control: public, max-age=300
```

### 4. Безопасность и rate limit

Плагины в **`backend/health/src/plugins/security.ts`**, регистрация в `app.ts`:

| Плагин | Назначение |
|--------|------------|
| **`@fastify/helmet`** | Security-заголовки; CSP в `NODE_ENV=production` |
| **`@fastify/rate-limit`** | Лимит по IP; `/health` и `/ready` в allowList |
| **`@fastify/cors`** | `CORS_ORIGINS` — `*` в dev, список origin в prod |

Лимиты по маршрутам:

```ts
// Глобально (security.ts)
await fastify.register(rateLimit, {
  global: true,
  max: env.rateLimitGlobalMax,        // по умолчанию 200 / мин
  timeWindow: env.rateLimitWindowMs,
  allowList: (request) =>
    request.url === '/ready' || request.url === '/health',
});

// POST /logs — жёстче (routes/logs.ts)
config: {
  rateLimit: { max: env.rateLimitLogsMax, timeWindow: env.rateLimitWindowMs },
  bodyLimit: 8192,
}
```

| Маршрут | Лимит (по умолчанию) |
|---------|----------------------|
| Глобально | 200 req / 60 с |
| `POST /logs` | 30 req / 60 с, body ≤ 8 KB |
| `GET /recommendations` | 60 req / 60 с |
| `GET /health`, `GET /ready` | без глобального лимита (allowList) |

Переменные — **`backend/health/.env.example`**:

```env
CORS_ORIGINS=*
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_GLOBAL_MAX=200
RATE_LIMIT_LOGS_MAX=30
RATE_LIMIT_RECOMMENDATIONS_MAX=60
RECOMMENDATIONS_CACHE_TTL_MS=300000
```

### Проверка

```bash
cd backend/health
npm install
npm run build
npm run dev   # или контейнер health-check в docker compose

# Health + сжатие
curl -s http://localhost:3002/ready

# Кэш рекомендаций
curl -s -D - http://localhost:3002/recommendations | grep -i x-cache
```

SQL-индексы — в Supabase Studio: **`backend/supabase_performance_indexes.sql`**.

### Связанные файлы

| Файл | Назначение |
|------|------------|
| `backend/supabase_performance_indexes.sql` | Индексы + RLS рекомендаций |
| `backend/health/src/plugins/security.ts` | helmet, compress, rate-limit |
| `backend/health/src/lib/memoryCache.ts` | TTL in-memory кэш |
| `backend/health/src/services/recommendations.ts` | Запрос + кэш справочника |
| `backend/health/src/routes/recommendations.ts` | `GET /recommendations` |
| `backend/health/src/routes/logs.ts` | `POST /logs` + лимиты |
| `backend/health/src/app.ts` | Регистрация плагинов и маршрутов |
| `backend/health/.env.example` | CORS, rate limit, TTL кэша |

---

## 📊 Аналитика

### Сервис

В EcoTrack используется **[Яндекс.Метрика](https://metrika.yandex.ru)** для сбора событий, конверсий и анализа поведения пользователей. Отправка реализована в `frontend/src/hooks/useAnalytics.ts`, глобальный перехват ошибок — в `frontend/src/lib/errorTracking.ts`.

### Настройка

1. Создайте счётчик на [metrika.yandex.ru](https://metrika.yandex.ru) (тип: для сайта / SPA).
2. Скопируйте **номер счётчика** (например, `109250000`).
3. Добавьте в **`frontend/.env.local`**:

   ```env
   VITE_YANDEX_METRIKA_ID=109250000
   ```

4. Перезапустите dev-сервер (`npm run dev`). Без переменной скрипт Метрики не подключается — удобно для локальной разработки без аналитики.
5. В интерфейсе Метрики создайте цели типа **JavaScript-событие** с идентификаторами, совпадающими с именами в `trackEvent()` (подробнее — [`frontend/analytics_goals.md`](frontend/analytics_goals.md)).

**Пример цели в Метрике:** *Настройки → Цели → Добавить цель → Тип: JavaScript-событие → Идентификатор:* `CalculatorCalculated`.

### Отслеживаемые события

| Событие | Описание |
|---------|----------|
| `CalculatorCalculated` | Успешный расчёт углеродного следа |
| `CalculationSaved` | Автосохранение расчёта в БД |
| `RecommendationClicked` | Клик по рекомендации |
| `RecommendationsViewed` | Загрузка списка рекомендаций |
| `ProgressViewed` | Просмотр страницы прогресса |
| `BadgeEarned` | Получен новый бейдж |
| `GoalSet` | Установлена пользовательская цель |
| `ProgressExported` | Экспорт отчёта (PDF / печать) |
| `UserLoggedIn` | Успешный вход (`email` / `yandex`) |
| `UserRegistered` | Успешная регистрация |
| `SPA_Navigation` | Переход между маршрутами |
| `ErrorOccurred` | Ошибки UI, auth и глобальные (с санитизацией PII) |

### Просмотр данных

- **Отчёты → Стандартные отчёты → События** — статистика по `reachGoal` и параметрам.
- **Цели** — конверсии по настроенным JavaScript-целям.
- **Вебвизор** — записи сессий и карта кликов (включён при инициализации счётчика).

### Privacy

- Обработка аналитики должна соответствовать требованиям **152-ФЗ** (согласие пользователя, политика конфиденциальности, минимизация персональных данных в параметрах событий).
- Данные Яндекс.Метрики для счётчиков в РФ обрабатываются и хранятся на инфраструктуре в **Российской Федерации** (актуальные условия — в [документации Яндекса](https://yandex.ru/legal/metrica_termsofuse/)).
- В коде перед отправкой ошибок применяется санитизация email, токенов и чувствительных query-параметров (`frontend/src/lib/errorTracking.ts`).

---

## 📊 Мониторинг и Health Checks

### Сервис мониторинга

Внешний uptime-мониторинг: **[Uptime by Better Stack](https://betterstack.com/uptime)** (бесплатный тариф, интервал проверки **5 минут**). Контейнер **`health-check`** в `backend/docker-compose.yml` — Fastify-сервер `backend/health/` (Pino, `src/server.ts`).

| Параметр | Значение |
|----------|----------|
| **Health endpoint** | `GET /health` |
| **Порт** | **3002** (`http://localhost:3002`) |

**Проверяет:**

- **PostgreSQL connectivity** — `SELECT 1` с таймаутом 3 с (хост `supabase-db` в Compose).
- **API readiness** — `services.auth: "up"` в JSON; при недоступной БД — `status: "degraded"`, HTTP **503**.

### Алерты

В Better Stack настройте уведомления **Email** при переходах монитора **DOWN** / **UP** (URL монитора: `http://<хост>:3002/health`, критерий UP — HTTP 200 и `"status":"ok"`).

Перед первым запуском health-сервера:

```bash
cd backend/health && npm install && npm run build
```

### Локальный тест

Из каталога **`backend/`**:

```bash
docker-compose up -d
curl http://localhost:3002/health
```

Ожидание: HTTP **200** и `"status":"ok"`. При остановленной БД (`docker stop supabase-db`) — **503** и `"status":"degraded"`.

### Соответствие ТЗ

| Требование | Реализация |
|------------|------------|
| Мониторинг | Better Stack Uptime + `GET /health` (порт 3002) |
| Алерты | Email при DOWN/UP (Better Stack) |
| Graceful degradation | `status: "degraded"`, HTTP 503; health-сервис продолжает отвечать |

---

## Логирование (отчёт для ДЗ)

Централизованная схема: **структурированные логи** на фронтенде и в health-сервисе, **JSON-файлы Docker** для всего Compose-стека, опционально **Better Stack Logtail** для агрегации контейнерных логов.

### 1. Уровни логирования

| Слой | Уровни | Где задаётся |
|------|--------|--------------|
| **Frontend** (`frontend/src/lib/logger.ts`) | `debug`, `info`, `warn`, `error` | Поведение по `import.meta.env.DEV` / `PROD` |
| **Health-сервер** (Pino) | `trace`, `debug`, `info`, `warn`, `error`, `fatal` | `LOG_LEVEL` в `backend/.env` (по умолчанию `info`) |
| **Docker / Supabase-стек** | Зависит от образа (`info` / `warning` / `error` в stdout) | Не унифицировано; собирается как текст/JSON в json-file |
| **Supabase `client_errors`** | Фактически `warn` и `error` с фронта | `logWarn` / `logError` → дублирование в таблицу |

**Правила EcoTrack (frontend):**

- **dev** — все уровни в консоль (цветной вывод), `warn`/`error` additionally → `client_errors`.
- **prod** — `info`/`debug` только локально в консоль не уходят на сервер; **`warn` и `error`** → `POST /logs`, Supabase `client_errors`, при сбое сети — буфер в **localStorage**.

### 2. Структура логов (JSON-схема)

#### Frontend — запись приложения

Тип `StructuredLogRecord` (`frontend/src/lib/logger.ts`):

```json
{
  "level": "warn",
  "timestamp": "2026-05-16T13:07:43.000Z",
  "message": "Текст сообщения (санитизирован)",
  "context": "auth.login",
  "metadata": { "httpStatus": 401, "code": "invalid_credentials" },
  "userAgent": "Mozilla/5.0 ...",
  "url": "http://localhost:5173/#/login"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `level` | `"debug" \| "info" \| "warn" \| "error"` | Уровень |
| `timestamp` | ISO 8601 string | Время события |
| `message` | string | Краткое описание (до 2000 символов) |
| `context` | string? | Модуль/сценарий (`sanitizeLogContext`) |
| `metadata` | object? | Произвольные поля **без PII** (`sanitizeLogMetadata`) |
| `userAgent` | string | UA браузера |
| `url` | string | Текущий URL (без секретов в query) |

Перед отправкой из `metadata` удаляются ключи `email`, `password`, `token`, `authorization` и т.п.; строки проходят маскирование email/JWT.

#### Health-сервер — HTTP (Pino + pino-http)

Пример строки access-log:

```json
{
  "level": 30,
  "time": 1778937750065,
  "pid": 1,
  "hostname": "87c95860fbf2",
  "reqId": "req-29",
  "req": { "method": "GET", "url": "/ready", "remoteAddress": "127.0.0.1" },
  "res": { "statusCode": 200 },
  "responseTime": 10.53,
  "msg": "request completed"
}
```

Дополнительные поля HTTP-логгера: `method`, `url`, `statusCode`, `responseTime`, `reqId`.

Клиентские логи с фронта принимаются `POST /logs` и пишутся в Pino с полями `client`, `context`, `metadata`, `userAgent`, `url`, `timestamp`.

#### Docker json-file (stdout контейнера)

Каждая строка — JSON или текст сервиса (Kong, GoTrue, PostgREST, Elixir). Метаданные драйвера: `tag` / `labels` = имя контейнера (`{{.Name}}`).

#### Таблица `client_errors` (Supabase)

| Колонка | Содержимое |
|---------|------------|
| `message` | Текст ошибки |
| `stack` | Stack / JSON metadata |
| `component_stack` | React component stack (Error Boundary) |
| `url`, `user_agent` | Контекст браузера |
| `user_id` | При наличии сессии |

### 3. Где хранятся логи

| Хранилище | Что попадает | Срок / объём |
|-----------|--------------|--------------|
| **Docker json-file** | stdout/stderr всех сервисов Compose (`logging: json-file`, 3×10 MB на контейнер) | Локально на хосте: `/var/lib/docker/containers/<id>/*-json.log` |
| **Консоль браузера** | Frontend в dev: цветные `logInfo` / `logWarn` / … | Только сессия разработчика |
| **localStorage** | Ключ `ecotrack-log-buffer`, до **50** записей FIFO | Только prod, если `POST /logs` недоступен |
| **Health `POST /logs`** | `warn`/`error` с фронта (prod) | Pino stdout контейнера `health-check` |
| **PostgreSQL `client_errors`** | `warn`/`error` с клиента (dev и prod) | Постоянно, RLS для authenticated |
| **Better Stack Logtail** (опционально) | Агрегация Docker JSON-логов | Облако; профиль `monitoring`, сервис `log-aggregator` |

Переменные (`backend/.env.example`, `frontend/.env.example`):

```env
LOG_LEVEL=info
NODE_ENV=development
LOGTAIL_SOURCE_TOKEN=          # обязателен для log-aggregator
LOGTAIL_HOST=in.logs.betterstack.com
VITE_LOGS_API_URL=http://localhost:3002/logs   # prod-отправка с фронта
```

Команды:

```bash
# Все сервисы, последние 100 строк
docker compose logs -f --tail=100

# Опционально: отправка Docker-логов в Better Stack
docker compose --profile monitoring up -d log-aggregator
```

### 4. Как AI помогает анализировать логи

| Подход | Пример |
|--------|--------|
| **Фильтрация в терминале** | `docker compose logs --tail=500 2>&1 \| grep -iE 'error\|warn\|PGRST\|timeout'` |
| **Структурированный экспорт** | Сохранить вывод в файл → приложить к чату Cursor / приложению `@File` |
| **Запрос к AI** | «Найди повторяющиеся ошибки, root cause, предложи fix в коде» — AI группирует `PGRST000`, таймауты deno.land, `Database check timeout` |
| **JSON-логи Pino** | AI парсит поля `level`, `msg`, `responseTime`, `err` без ручного разбора |
| **Better Stack Live tail** | Поиск по `service:supabase-auth`, алерты по паттернам |
| **Кодовая база** | `@Codebase` + описание симптома → AI находит `logger.ts`, `logClientError.ts`, маршруты OAuth |

Рекомендуемый промпт для ДЗ:

```text
@Codebase Проанализируй docker compose logs --tail=200:
1) повторяющиеся ошибки 2) root cause 3) правки в коде 4) какие логи добавить
```

### 5. Типовые ошибки и как их искать

| Симптом | Где искать | Паттерн / команда | Действие |
|---------|------------|-------------------|----------|
| БД недоступна при старте | `rest`, `health-check` | `PGRST000`, `Connection refused`, `Database check timeout` | `docker compose up -d db`, дождаться healthy, перезапуск `rest` / увеличить `DB_CHECK_TIMEOUT_MS` |
| OAuth / JWT | `auth`, Kong | `"status":401`, `invalid`, `JWT` | Проверить `SITE_URL`, `ANON_KEY`, перелогин; смотреть `client_errors` |
| PKCE / Яндекс | Frontend, `auth` | `PKCE`, `code verifier`, `flow_state` | `force_confirm=yes`, `authStorage`, не обновлять страницу callback |
| Edge Functions не стартуют | `functions` | `deno.land`, `worker boot error`, `timed out` | Vendor/`npm:jose`, доступ в интернет, `deno-cache` |
| Медленный health-check | `health-check` | `"responseTime":` > 1000, `Database health check failed` | Нагрузка на Postgres, таймаут пула |
| Ошибки API PostgREST | Kong + браузер Network | HTTP 403/400, `PGRST` в теле | RLS, валидация payload, `interpretPostgrestError` |
| Потеря логов в prod | Browser Application → localStorage | ключ `ecotrack-log-buffer` | Проверить `VITE_LOGS_API_URL`, поднять `health-check`, `flushBufferedLogs` при `online` |

**Ложные срабатывания grep** (не путать с HTTP 500):

- `responseTime` с подстрокой `500` в дробной части (`22.134625000006054`).
- Порт `5000` у storage/realtime (`listening at :5000`).
- `ErlSysMon long_schedule` — предупреждения BEAM при старте, не ошибка приложения.

**Полезные файлы в репозитории:**

| Файл | Назначение |
|------|------------|
| `frontend/src/lib/logger.ts` | Клиентский логгер |
| `frontend/src/hooks/useLogger.ts` | Хук для компонентов |
| `frontend/src/lib/logClientError.ts` | Запись в `client_errors` |
| `backend/health/src/lib/logger.ts` | Pino |
| `backend/health/src/plugins/pino-http.ts` | HTTP access log |
| `backend/docker-compose.yml` | `x-logging`, `log-aggregator` |

---

## 6. Как убедиться, что всё работает

Выполняйте по порядку на чистом профиле браузера или в приватном окне.

1. **Регистрация**  
   Откройте приложение → страница регистрации (`/#/register` или маршрут «Регистрация» из интерфейса). Создайте пользователя с новым email и паролем. При **`ENABLE_EMAIL_AUTOCONFIRM=true`** подтверждение письмом не требуется.

2. **Вход**  
   Выйдите (если есть пункт выхода) или откройте новое окно → **Вход** с теми же учётными данными.

3. **Чтение данных**  
   На экранах с рекомендациями/дашбордом должны подгружаться строки из таблицы **`recommendations`** (миграция добавляет примеры). Ошибок в консоли браузера по 401/403 на чтение быть не должно после входа.

4. **Запись данных**  
   Выполните сценарий с сохранением расчёта (калькулятор / сохранение прогресса — как в вашем UI). Данные должны появиться в таблицах **`calculations`** / **`user_progress`** (проверка через **Studio → Table Editor** или повторный заход в приложение: списки и прогресс обновляются).

Если шаг падает с ошибкой Auth или PostgREST — сверьте **`VITE_SUPABASE_*`** с **`backend/.env`**, перезапустите `npm run dev` после правки `.env.local`.

---

## Структура репозитория (кратко)

| Путь | Роль |
|------|------|
| `backend/docker-compose.yml` | Локальный Supabase (Postgres, Auth, REST, Studio, …) |
| `backend/health/` | Fastify: `/health`, `/ready`, `POST /logs`, `GET /recommendations` (кэш), helmet/compress/rate-limit |
| `backend/supabase_performance_indexes.sql` | Индексы Postgres для PostgREST |
| `frontend/src/lib/logger.ts` | Структурированное логирование SPA |
| `backend/.env.example` | Шаблон переменных для Compose (`HEALTH_WEBHOOK_URL`, `DB_*`) |
| `backend/supabase_migration.sql` | Основная SQL-миграция приложения |
| `backend/supabase_profile_trigger.sql` | Триггер `profiles` + бэкфилл для уже созданных пользователей |
| `backend/supabase_security_patch.sql` | Патч RLS/GRANT для уже существующих БД |
| `frontend/` | SPA EcoTrack |
| `frontend/vite.config.ts` | Сборка: terser, compression, `manualChunks` |
| `frontend/src/components/RoutePageFallback.tsx` | Fallback для lazy-роутов |
| `frontend/analytics_goals.md` | Описание целей и событий Метрики |

---

## Сброс окружения Supabase

В каталоге `backend/` есть скрипт **`reset.sh`**: полностью очищает контейнеры и данные (использовать осознанно). После сброса снова выполните шаги с `.env`, `docker compose up` и SQL-миграцией.
