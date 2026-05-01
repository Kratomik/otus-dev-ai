# 📚 Backend Documentation — EcoTrack v1.0

> Версия: 1.0  
> Дата: Май 2026  
> Автор: [Ваше Имя]  
> Инфраструктура: Supabase (BaaS) + Vite Frontend

---

## 🏗 Архитектура решения

### Общая схема

┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Supabase Cloud    │     │   External      │
│   (Vite+React)  │────▶│   • PostgreSQL 15   │────▶│   Services      │
│   • TS Strict   │     │   • Auth (JWT)      │     │   • IPCC API    │
│   • Tailwind    │◀────│   • Realtime        │     │   • Geocoding   │
│   • RTL Tests   │     │   • Storage         │     │                 │
└─────────────────┘     │   • Row Level Sec   │     └─────────────────┘
                        │   • Auto REST API   │
                        └─────────────────────┘


### Компоненты
| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| **Database** | PostgreSQL 15 | Хранение пользователей, расчётов, прогресса |
| **Auth** | Supabase Auth (GoTrue) | Регистрация, вход, JWT-сессии, email-верификация |
| **API Layer** | Supabase Auto-REST | Автоматическая генерация CRUD endpoints из схемы БД |
| **Security** | Row Level Security (RLS) | Изоляция данных пользователей на уровне БД |
| **Client** | @supabase/supabase-js v2 | Типизированный клиент для React-хуков |
| **Logging** | Supabase Dashboard Logs | Мониторинг запросов, ошибок, аутентификации |

### Почему Supabase (а не self-hosted)?
✅ **Скорость разработки**: готовая БД + Auth + API из коробки  
✅ **Безопасность**: RLS предотвращает утечки данных даже при ошибке в коде  
✅ **Масштабируемость**: автоматическое масштабирование, бэкапы, CDN  
✅ **Бесплатный tier**: 500MB БД, 50k MAU, 2GB bandwidth — достаточно для MVP  
✅ **Интеграция с AI**: чёткая схема БД позволяет генерировать код через промпты  

---

## 🚀 Инструкции по развёртыванию

### Предварительные требования
- Аккаунт на [ttps://localhost:8000](https://localhost:8000)
- Node.js 20 LTS, npm 10+
- Доступ к репозиторию `otus-dev-ai`

### Шаг 1: Создание проекта Supabase
1. Перейдите в [Dashboard](https://localhost:8000) → `New Project`
2. Использовал дефолтный проект

### Шаг 2: Применение миграции БД
1. В проекте откройте **SQL Editor** → `New query`
2. Вставьте содержимое файла `supabase_migration.sql` из репозитория
3. Нажмите `Run` (убедитесь, что выполнено 5 блоков: таблицы + RLS + seed-данные)

### Шаг 3: Настройка переменных окружения
1. В корне проекта создайте `.env.local`:
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Демонстрация работы приложения интегрированного с supabase**

<img src="screen/Ошибка авторизации.png" width="" height="500"/>

<img src="screen/Авторизация.png" width="" height="500"/>

<img src="screen/Сохранение данных.png" width="" height="500"/>

<img src="screen/Интеграция с supabase.png" width="" height="500"/>

<img src="screen/Данный в БД.png" width="" height="500"/>


**Описание API**

Документ описывает API-запросы, которые реально используются в текущем проекте.

## Базовая информация

- **Тип API:** Supabase (Auth + PostgREST), self-hosted через `backend/docker-compose.yml`
- **Базовый URL API:** `VITE_SUPABASE_URL` (frontend), обычно `http://localhost:8000`
- **Ключ клиента:** `VITE_SUPABASE_ANON_KEY`
- **Основные префиксы endpoint:**
  - `.../auth/v1/*` - авторизация
  - `.../rest/v1/*` - доступ к таблицам PostgreSQL
  - `.../realtime/v1/*` - realtime/websocket (косвенно через SDK)

## Авторизация (Supabase Auth)

### 1) Регистрация

- **Где в коде:** `frontend/src/lib/supabase.ts` (`signUp`)
- **SDK вызов:** `supabase.auth.signUp({ email, password })`
- **HTTP endpoint (под капотом):** `POST /auth/v1/signup`
- **Тело запроса:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 2) Вход

- **Где в коде:** `frontend/src/lib/supabase.ts` (`signIn`), используется на странице `frontend/src/pages/Login.tsx`
- **SDK вызов:** `supabase.auth.signInWithPassword({ email, password })`
- **HTTP endpoint (под капотом):** `POST /auth/v1/token?grant_type=password`
- **Тело запроса:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 3) Выход

- **Где в коде:** `frontend/src/lib/supabase.ts` (`signOut`)
- **SDK вызов:** `supabase.auth.signOut()`
- **HTTP endpoint (под капотом):** `POST /auth/v1/logout`

### 4) Получение текущего пользователя/сессии

- **Где в коде:** `frontend/src/lib/supabase.ts` (`getCurrentUser`), `frontend/src/hooks/useSession.ts`
- **SDK вызов:** `supabase.auth.getUser()`
- **HTTP endpoint (под капотом):** `GET /auth/v1/user`
- **Авторизация:** `Authorization: Bearer <access_token>`

## Данные приложения (PostgREST)

Все запросы к таблицам идут через Supabase JS и транслируются в HTTP запросы к `.../rest/v1/*`.

### 1) Таблица `calculations`

#### 1.1 Получить последние расчеты пользователя

- **Где в коде:** `frontend/src/hooks/useEcoData.ts` (`useCalculations -> reload`)
- **SDK вызов:**
  - `.from('calculations').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)`
- **HTTP endpoint (эквивалент):**
  - `GET /rest/v1/calculations?select=*&user_id=eq.<user_id>&order=created_at.desc&limit=50`

#### 1.2 Сохранить расчет

- **Где в коде:** `frontend/src/hooks/useEcoData.ts` (`useCalculations -> saveCalculation`)
- **SDK вызов:**
  - `.from('calculations').insert({...}).select('*').single()`
- **HTTP endpoint (эквивалент):**
  - `POST /rest/v1/calculations?select=*`
- **Тело запроса (пример):**

```json
{
  "user_id": "uuid",
  "transport": 10,
  "food": 20,
  "energy": 30,
  "shopping": 40,
  "total_co2": "100.00"
}
```

### 2) Таблица `user_progress`

#### 2.1 Получить прогресс пользователя

- **Где в коде:** `frontend/src/hooks/useEcoData.ts` (`useProgress -> reload`)
- **SDK вызов:**
  - `.from('user_progress').select('*').eq('user_id', userId).maybeSingle()`
- **HTTP endpoint (эквивалент):**
  - `GET /rest/v1/user_progress?select=*&user_id=eq.<user_id>&limit=1`

#### 2.2 Создать/обновить прогресс (upsert)

- **Где в коде:** `frontend/src/hooks/useEcoData.ts` (`useProgress -> upsert`)
- **SDK вызов:**
  - `.from('user_progress').upsert({...}, { onConflict: 'user_id' }).select('*').single()`
- **HTTP endpoint (эквивалент):**
  - `POST /rest/v1/user_progress?on_conflict=user_id&select=*`
- **Тело запроса (пример):**

```json
{
  "user_id": "uuid",
  "xp": 120,
  "level": 2,
  "badges": ["first_calc"],
  "updated_at": "2026-05-01T16:00:00.000Z"
}
```

### 3) Таблица `recommendations`

#### 3.1 Получить активные рекомендации

- **Где в коде:** `frontend/src/hooks/useEcoData.ts` (`useRecommendations -> reload`)
- **SDK вызов:**
  - `.from('recommendations').select('*').eq('is_active', true).order('id', { ascending: false }).limit(50)`
- **HTTP endpoint (эквивалент):**
  - `GET /rest/v1/recommendations?select=*&is_active=eq.true&order=id.desc&limit=50`

### 4) Таблица `client_errors`

#### 4.1 Логирование клиентских ошибок

- **Где в коде:** `frontend/src/lib/logClientError.ts`
- **SDK вызов:**
  - `supabase.from('client_errors').insert({...})`
- **HTTP endpoint (эквивалент):**
  - `POST /rest/v1/client_errors`
- **Тело запроса (пример):**

```json
{
  "message": "TypeError: ...",
  "stack": "...",
  "component_stack": "...",
  "url": "http://localhost:5173/#/calculator",
  "user_agent": "Mozilla/5.0 ..."
}
```

## Заголовки и авторизация

Типовые заголовки, которые использует Supabase JS:

- `apikey: <VITE_SUPABASE_ANON_KEY>`
- `Authorization: Bearer <access_token>` (для запросов пользователя после входа)
- `Content-Type: application/json`

## Что важно по проекту

- В репозитории **нет** отдельного самописного backend API на Express/FastAPI с маршрутами вида `/api/...`.
- `backend` в этом проекте - это инфраструктура self-hosted Supabase (Docker Compose), а прикладные запросы идут напрямую из frontend в Supabase API.
