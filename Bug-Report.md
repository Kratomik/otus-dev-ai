# Bug-Report — аудит безопасности EcoTrack

**Дата аудита:** 2026-05-15  
**Проект:** EcoTrack v1.0 (MVP)  
**Область:** frontend (React 18 + Vite + Supabase), схема БД (Postgres / RLS), CI

---

## Краткое резюме

| Категория | Найдено | Исправлено |
|-----------|---------|------------|
| Уязвимости в зависимостях (`npm audit`) | 0 | — |
| Проблемы OWASP / код | 12 | 12 |
| XSS / CSRF / SQL injection (меры защиты) | — | внедрены |
| Регрессии после правок (dev / тесты) | 3 | 3 |

**Проверка:** `cd frontend && npm run test` — **37/37** тестов; `npm run build` — успешно.

---

## 1. Зависимости

### 1.1 `npm audit`

| Путь | Результат |
|------|-----------|
| `frontend/` | **0** уязвимостей |
| корень репозитория | **0** уязвимостей |

Выполнено `npm update` (patch/minor в пределах semver): `@supabase/supabase-js`, `vite`, `vitest`, `react-router-dom`, `jsdom`, `postcss`, `lucide-react` и др.

**Не обновлялось (риск поломки MVP):** React 19, Tailwind 4, ESLint 10.

### 1.2 `safety` (Python)

Не применимо: в репозитории нет `requirements.txt` / Python-приложения. Backend — Docker Compose (Supabase).

---

## 2. Найденные проблемы и исправления (OWASP Top 10)

### A01 — Broken Access Control (нарушение контроля доступа)

| # | Проблема | Риск | Исправление | Файлы |
|---|----------|------|---------------|-------|
| 1 | `GRANT SELECT, INSERT, UPDATE, DELETE ON calculations, user_progress TO anon` — избыточные права; при отключённом RLS данные доступны шире задуманного | **Средний** | `REVOKE ALL … FROM anon`; права только для `authenticated` | `backend/supabase_migration.sql`, `supabase_security_patch.sql`, `supabase_security_hardening.sql` |
| 2 | Маршруты `/calculator`, `/progress`, `/recommendations` без проверки сессии | **Средний** | Компонент `ProtectedRoute` + редирект на `/login` | `App.tsx`, `ProtectedRoute.tsx` |
| 3 | Fallback `path="*"` вёл на `/calculator` без авторизации | **Низкий** | Редирект на `/login` | `App.tsx` |

**Действие на уже развёрнутой БД:** один раз выполнить в Supabase SQL Editor:

```text
backend/supabase_security_hardening.sql
```

---

### A02 — Cryptographic Failures

| # | Проблема | Риск | Исправление | Файлы |
|---|----------|------|---------------|-------|
| 4 | Черновик расчёта в `localStorage` разбирался через небезопасный `as CalculationRow` | **Низкий** | `parseCalculationDraft()` с проверкой структуры | `validation.ts`, `useEcoData.ts` |
| 5 | `VITE_SUPABASE_ANON_KEY` в клиентском бандле | **Инфо** | Ожидаемо для Supabase; защита через **RLS**, не сокрытие ключа | — |

Сессия: `persistSession: false` — JWT не сохраняется в `localStorage`.

---

### A03 — Injection

| # | Проблема | Риск | Исправление | Файлы |
|---|----------|------|---------------|-------|
| 6 | Потенциальный stored XSS через поля `recommendations.text` | **Низкий** | React экранирует JSX; дополнительно `sanitizeDisplayText()` | `Recommendations.tsx`, `security.ts` |
| 7 | Спам в `client_errors` (INSERT для `anon` без лимитов) | **Средний** | RLS `WITH CHECK` с `char_length` для полей | SQL-миграции |
| 8 | SQL injection через фронт | **Низкий** | Только Supabase SDK (параметризованные запросы); валидация чисел перед INSERT | `security.ts`, `useEcoData.ts` |

Сырого SQL и `dangerouslySetInnerHTML` / `eval` в коде **нет**.

---

### A04 — Insecure Design

| # | Проблема | Риск | Исправление | Файлы |
|---|----------|------|---------------|-------|
| 9 | `window.alert()` для ошибок API (плохой UX, теоретический вектор) | **Низкий** | Inline-блоки `role="alert"` / `role="status"` | `Calculator.tsx`, `Progress.tsx`, `Recommendations.tsx` |
| 10 | Нет rate limiting на Auth / `client_errors` | **Средний** | Не закрыто в MVP (см. раздел 6) | — |

---

### A05 — Security Misconfiguration

| # | Проблема | Риск | Исправление | Файлы |
|---|----------|------|---------------|-------|
| 11 | Отсутствие CSP и security headers | **Средний** | `vite.security.ts`; meta-теги CSP при `npm run build`; `public/_headers` для Cloudflare/Netlify; заголовки в `vite preview` | `vite.config.ts`, `index.html` |
| 12 | CSP на **dev-сервере** ломал Vite HMR → **белый экран** | **Высокий** | CSP **не** вешается на `server` в dev; только build + preview | `vite.config.ts` |

**Примечание:** GitHub Pages не задаёт произвольные HTTP-заголовки — CSP встраивается в `dist/index.html` при сборке.

---

### A07 — Identification and Authentication Failures

| # | Проблема | Риск | Исправление | Файлы |
|---|----------|------|---------------|-------|
| 13 | `isValidEmail` импортировался, но не вызывался в `signUp`/`signIn` | **Средний** | `isValidEmail()` + `normalizeEmail()` | `supabase.ts` |
| 14 | Proxy-клиент Supabase бросал исключение при любом обращении без `.env` | **Средний** | Stub-клиент + `isSupabaseConfigured()` в `useSession` | `supabase.ts`, `useSession.ts` |
| 15 | Пустой `location.hash` → маршруты HashRouter не срабатывали | **Средний** | Редирект на `/#/login` в `main.tsx` | `main.tsx` |

Auth: `flowType: 'pkce'`, сообщения об ошибках без лишних деталей для 401/403.

---

### A06 — Vulnerable Components

| Проверка | Результат |
|----------|-----------|
| `npm audit` после обновлений | **0** уязвимостей |

---

### Прочие исправления (инфраструктура / тесты)

| # | Проблема | Исправление | Файлы |
|---|----------|---------------|-------|
| 16 | `npm run dev` из **корня** репозитория — `Missing script: "dev"` | Скрипты-прокси в корневом `package.json` | `package.json` |
| 17 | `npm run test` падал: двойной `MSW server.listen()` | MSW только в `setupCiMsw.ts`; убран дубль из `supabaseApiEndpoints.test.ts` | `setupCiMsw.ts`, `supabaseApiEndpoints.test.ts` |
| 18 | `vitest` + `vite` в одном конфиге с MSW | Разделение: `vitest.config.ts` / `vite.config.ts` | `vitest.config.ts` |

---

## 3. Защита от XSS, CSRF, SQL injection

### 3.1 XSS

| Мера | Реализация |
|------|------------|
| Экранирование в React | Нет `dangerouslySetInnerHTML`, `innerHTML`, `eval` |
| Санитизация текста | `sanitizeDisplayText()` — управляющие символы, лимит длины |
| Применение | `Recommendations`, `ErrorBoundary`, `logClientError` |
| CSP | `object-src 'none'`, `frame-ancestors 'none'`, `script-src 'self'` (production) |
| Доставка CSP | Meta в `index.html` после build; `public/_headers`; `preview.headers` |

### 3.2 CSRF

| Мера | Реализация |
|------|------------|
| Не cookie-сессия приложения | JWT в заголовке `Authorization` (Supabase) |
| Память вкладки | `persistSession: false` |
| PKCE | `flowType: 'pkce'` в клиенте Auth |
| Идентификатор клиента | `X-Client-Info: ecotrack-web` |

Классический CSRF на API с низким риском: браузер не отправляет JWT автоматически на сторонние сайты.

### 3.3 SQL injection

| Мера | Реализация |
|------|------------|
| Запросы | PostgREST через `@supabase/supabase-js` (параметры, не конкатенация) |
| RLS | Политики `auth.uid() = user_id` на персональных таблицах |
| Права `anon` | Отозваны на `calculations`, `user_progress` |
| Валидация ввода | `buildCalculationInsertPayload()`, `clampLevel()`, `clampNonNegativeInt()`, `sanitizeBadges()` |
| Логи ошибок | `sanitizeLogContext()` для поля `context` |

Модуль: `frontend/src/lib/security.ts`  
Тесты: `frontend/src/__tests__/security.test.ts`, `validation.test.ts`, `supabaseAuthValidation.test.ts`

---

## 4. Список изменённых и новых файлов

### Frontend

| Файл | Назначение |
|------|------------|
| `src/lib/security.ts` | Санитизация, безопасные payload для БД |
| `src/lib/validation.ts` | Email, разбор `localStorage` |
| `src/lib/supabase.ts` | Auth, PKCE, stub без конфига |
| `src/lib/logClientError.ts` | Безопасное логирование |
| `src/hooks/useEcoData.ts` | Валидация перед INSERT/UPSERT |
| `src/hooks/useSession.ts` | Проверка конфигурации Supabase |
| `src/components/ProtectedRoute.tsx` | Защита маршрутов |
| `src/components/ErrorBoundary.tsx` | Санитизация текста ошибки |
| `src/App.tsx` | Маршрутизация, ProtectedRoute |
| `src/main.tsx` | Нормализация hash-URL |
| `src/pages/Calculator.tsx`, `Progress.tsx`, `Recommendations.tsx` | UI без `alert` |
| `vite.config.ts` | Плагин CSP meta, preview headers |
| `vite.security.ts` | CSP и security headers |
| `vitest.config.ts` | Отдельный конфиг тестов |
| `public/_headers` | Заголовки для статического хостинга |
| `index.html` | `referrer` meta |
| `package.json` (корень) | `npm run dev/test/build` из корня |

### Backend (SQL)

| Файл | Назначение |
|------|------------|
| `supabase_migration.sql` | Схема + RLS + ограничения `client_errors` |
| `supabase_security_patch.sql` | Патч для старых БД |
| `supabase_security_hardening.sql` | REVOKE `anon`, лимиты (выполнить на проде) |

### Тесты

| Файл | Назначение |
|------|------------|
| `src/__tests__/security.test.ts` | Модуль `security.ts` |
| `src/__tests__/validation.test.ts` | Валидация email / draft |
| `src/__tests__/supabaseAuthValidation.test.ts` | Email в signIn/signUp |
| `src/__tests__/App.smoke.test.tsx` | Маршрутизация / login |
| `src/__tests__/setupCiMsw.ts` | Единый MSW для Vitest |

---

## 5. Проверка работоспособности

```bash
# из корня или frontend/
npm run test
npm run build
npm run dev          # http://localhost:5173 → редирект на /#/login
```

| Команда | Ожидаемый результат |
|---------|---------------------|
| `npm run test` | 10 файлов, **37** тестов, 0 failed |
| `npm run build` | `dist/` без ошибок TypeScript |
| `npm run dev` | Страница входа (не белый экран) |

**Переменные окружения** (`frontend/.env.local`):

```env
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_ANON_KEY=<ANON_KEY из backend/.env>
```

---

## 6. Остаточные риски (не закрыты в MVP)

| Риск | Рекомендация |
|------|--------------|
| Rate limiting на login / `client_errors` | Kong, Supabase Dashboard, Edge Function |
| MFA, CAPTCHA | Supabase Auth / внешний провайдер |
| Политика сложности пароля | Только длина ≥ 8 на клиенте |
| Сканирование Docker-образов | `trivy`, `docker scout` |
| CSP на GitHub Pages | Уже в `dist/index.html` после build; при кастомном CDN — дублировать заголовки |
| Зависимость от корректности RLS | Периодический аудит политик в Studio |

---

## 7. Хронология работ

1. `npm audit` — 0 уязвимостей; обновление patch-зависимостей.  
2. Статический анализ OWASP Top 10 — таблица проблем (раздел 2).  
3. RLS, REVOKE, лимиты `client_errors` — SQL.  
4. `ProtectedRoute`, валидация email, `parseCalculationDraft`.  
5. Модуль `security.ts`, CSP, защита XSS/CSRF/SQLi.  
6. Исправление белого экрана (CSP off на dev, hash redirect).  
7. Исправление `npm run test` (MSW), `npm run dev` из корня.  
8. Документирование в `Bug-Report.md` (этот файл).

---

*Документ отражает состояние репозитория на 2026-05-15.*
