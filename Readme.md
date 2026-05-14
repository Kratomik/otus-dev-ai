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

Схема таблиц, RLS и начальные данные для EcoTrack лежат в **`backend/supabase_migration.sql`**.

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
| `backend/.env.example` | Шаблон переменных для Compose |
| `backend/supabase_migration.sql` | Основная SQL-миграция приложения |
| `backend/supabase_profile_trigger.sql` | Триггер `profiles` + бэкфилл для уже созданных пользователей |
| `backend/supabase_security_patch.sql` | Патч RLS/GRANT для уже существующих БД |
| `frontend/` | SPA EcoTrack |

---

## Сброс окружения Supabase

В каталоге `backend/` есть скрипт **`reset.sh`**: полностью очищает контейнеры и данные (использовать осознанно). После сброса снова выполните шаги с `.env`, `docker compose up` и SQL-миграцией.
