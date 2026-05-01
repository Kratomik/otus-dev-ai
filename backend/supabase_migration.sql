-- 1. Профили пользователей (расширяет auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  location TEXT DEFAULT 'RU',
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

-- 5. Row Level Security (RLS)
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own calculations" ON calculations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read/update own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read recommendations" ON recommendations
  FOR SELECT USING (true);
