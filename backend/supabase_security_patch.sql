-- Патч RLS для уже существующих БД EcoTrack (выполнить один раз в SQL Editor).
--
-- Типичные проблемы старых скриптов (например, только policies без ENABLE на
-- recommendations, или profiles без RLS): политики существуют, но RLS выключен —
-- тогда PostgREST не применяет политики, и данные читаются шире, чем задумано.
--
-- Этот файл идемпотентен по смыслу: повторный запуск безопасен (ENABLE RLS
-- идемпотентен; политики пересоздаются через DROP IF EXISTS).
--
-- Новые инсталляции: достаточно `supabase_migration.sql` (RLS уже на всех таблицах).

-- 1. Таблица client_errors (если миграция была без неё)
CREATE TABLE IF NOT EXISTS client_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message TEXT,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Включить RLS на всех public-таблицах приложения
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_errors ENABLE ROW LEVEL SECURITY;

-- 3. Политики profiles
DROP POLICY IF EXISTS "Users can select own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can select own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Политики client_errors
DROP POLICY IF EXISTS "Anonymous and users can report client errors" ON client_errors;
CREATE POLICY "Anonymous and users can report client errors" ON client_errors
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (message IS NULL OR char_length(message) <= 1000)
    AND (stack IS NULL OR char_length(stack) <= 4000)
    AND (component_stack IS NULL OR char_length(component_stack) <= 4000)
    AND (url IS NULL OR char_length(url) <= 2000)
    AND (user_agent IS NULL OR char_length(user_agent) <= 500)
  );

-- 5. Политики calculations, user_progress, recommendations
DROP POLICY IF EXISTS "Users can CRUD own calculations" ON calculations;
CREATE POLICY "Users can CRUD own calculations" ON calculations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read/update own progress" ON user_progress;
CREATE POLICY "Users can read/update own progress" ON user_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public read recommendations" ON recommendations;
CREATE POLICY "Public read recommendations" ON recommendations
  FOR SELECT TO anon, authenticated
  USING (true);

-- 6. Права PostgREST (роли anon / authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
REVOKE ALL ON calculations FROM anon;
REVOKE ALL ON user_progress FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON calculations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_progress TO authenticated;
GRANT SELECT ON recommendations TO anon, authenticated;
GRANT INSERT ON client_errors TO anon, authenticated;

-- Проверка в Studio (опционально): все пять таблиц с relrowsecurity = true
-- SELECT c.relname, c.relrowsecurity AS rls_enabled
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r'
--   AND c.relname IN (
--     'profiles', 'calculations', 'user_progress', 'recommendations', 'client_errors'
--   )
-- ORDER BY c.relname;
