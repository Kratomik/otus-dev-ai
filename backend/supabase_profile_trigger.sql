-- Выполните один раз в SQL Editor (Studio), если profiles пустая после регистрации пользователей.
-- Для новых установок этот блок уже включён в конец supabase_migration.sql.

-- Триггер: при INSERT в auth.users создаётся строка public.profiles
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

-- Бэкфилл: пользователи, созданные до появления триггера
INSERT INTO public.profiles (id, location)
SELECT u.id, 'RU'
FROM auth.users AS u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles AS p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
