-- EcoTrack: индексы для частых фильтров PostgREST / RLS (применить после supabase_migration.sql)
-- N+1 в custom Fastify нет; индексы ускоряют .eq('user_id'), .eq('is_active'), сортировки.

-- calculations: список по пользователю (useCalculations, RLS auth.uid() = user_id)
CREATE INDEX IF NOT EXISTS idx_calculations_user_id
  ON public.calculations (user_id);

CREATE INDEX IF NOT EXISTS idx_calculations_user_created_at
  ON public.calculations (user_id, created_at DESC);

-- recommendations: SELECT WHERE is_active = true ORDER BY id DESC
CREATE INDEX IF NOT EXISTS idx_recommendations_active_id
  ON public.recommendations (id DESC)
  WHERE is_active = true;

-- client_errors: отчёты / выборка по времени и пользователю
CREATE INDEX IF NOT EXISTS idx_client_errors_created_at
  ON public.client_errors (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_errors_user_id
  ON public.client_errors (user_id)
  WHERE user_id IS NOT NULL;

-- RLS: читать только активные рекомендации (как на фронте)
DROP POLICY IF EXISTS "Public read recommendations" ON public.recommendations;

CREATE POLICY "Public read recommendations" ON public.recommendations
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
