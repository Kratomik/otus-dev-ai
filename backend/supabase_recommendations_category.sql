-- Персонализация рекомендаций: категория + расширенный справочник (идемпотентно).
-- Выполнить в Supabase Studio после supabase_migration.sql.

ALTER TABLE public.recommendations
  ADD COLUMN IF NOT EXISTS category TEXT
  CHECK (category IS NULL OR category IN ('transport', 'food', 'energy', 'shopping'));

UPDATE public.recommendations
SET category = 'transport'
WHERE category IS NULL
  AND text LIKE '%велосипед%';

UPDATE public.recommendations
SET category = 'energy'
WHERE category IS NULL
  AND (text ILIKE '%LED%' OR text ILIKE '%ламп%');

UPDATE public.recommendations
SET category = 'food'
WHERE category IS NULL
  AND text ILIKE '%мяс%';

INSERT INTO public.recommendations (text, co2_saving, difficulty, impact, category)
SELECT v.text, v.co2_saving, v.difficulty, v.impact, v.category
FROM (
  VALUES
    (
      'Один день в неделю — только общественный транспорт или пешком',
      '0.3 т CO₂/год',
      'Средне',
      8,
      'transport'
    ),
    (
      'Снизьте температуру отопления на 1°C зимой',
      '0.15 т CO₂/год',
      'Легко',
      5,
      'energy'
    ),
    (
      'Выбирайте сезонные и местные продукты 2–3 раза в неделю',
      '0.25 т CO₂/год',
      'Легко',
      7,
      'food'
    ),
    (
      'Покупайте одежду и технику только по списку, без импульсных заказов',
      '0.2 т CO₂/год',
      'Средне',
      6,
      'shopping'
    ),
    (
      'Отдавайте приоритет ремонту и вторичному рынку вместо новых вещей',
      '0.35 т CO₂/год',
      'Средне',
      8,
      'shopping'
    )
) AS v(text, co2_saving, difficulty, impact, category)
WHERE NOT EXISTS (
  SELECT 1 FROM public.recommendations r WHERE r.text = v.text
);

CREATE INDEX IF NOT EXISTS idx_recommendations_active_category
  ON public.recommendations (category, impact DESC)
  WHERE is_active = true;
