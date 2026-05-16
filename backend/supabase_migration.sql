-- 1. Профили пользователей (расширяет auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT DEFAULT 'RU',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Расчёты углеродного следа
CREATE TABLE calculations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transport INT DEFAULT 0,
  food INT DEFAULT 0,
  energy INT DEFAULT 0,
  shopping INT DEFAULT 0,
  total_co2 NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Трекер прогресса
CREATE TABLE user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  badges TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Рекомендации (справочник)
CREATE TABLE recommendations (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  co2_saving TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('Легко','Средне','Сложно')),
  impact INT CHECK (impact BETWEEN 1 AND 10),
  is_active BOOLEAN DEFAULT TRUE
);

-- Вставка базовых рекомендаций
INSERT INTO recommendations (text, co2_saving, difficulty, impact) VALUES
('Замените 2 поездки на авто на велосипед/пешую прогулку', '0.4 т CO₂/год', 'Легко', 9),
('Перейдите на LED-лампы и используйте умные розетки', '0.2 т CO₂/год', 'Средне', 6),
('Сократите потребление красного мяса на 50%', '0.6 т CO₂/год', 'Сложно', 10);

-- 5. Клиентские ошибки (лог из ErrorBoundary / best-effort)
CREATE TABLE client_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message TEXT,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  user_agent TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 6. Row Level Security (RLS) — на всех public-таблицах приложения
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_errors ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can CRUD own calculations" ON calculations
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read/update own progress" ON user_progress
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read recommendations" ON recommendations
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anonymous and users can report client errors" ON client_errors
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (message IS NULL OR char_length(message) <= 1000)
    AND (stack IS NULL OR char_length(stack) <= 4000)
    AND (component_stack IS NULL OR char_length(component_stack) <= 4000)
    AND (url IS NULL OR char_length(url) <= 2000)
    AND (user_agent IS NULL OR char_length(user_agent) <= 500)
  );

-- 7. Права для PostgREST (роли anon / authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON calculations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_progress TO authenticated;
GRANT SELECT ON recommendations TO anon, authenticated;
GRANT INSERT ON client_errors TO anon, authenticated;

-- 8. Строка в profiles при регистрации (иначе таблица остаётся пустой: фронт не делает insert)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, location)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'location', 'RU'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
