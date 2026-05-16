-- Дополнительный патч безопасности EcoTrack (выполнить один раз в SQL Editor на существующей БД).
-- Идемпотентен: безопасно повторять.

-- 1. Убрать избыточные права anon на персональные таблицы (RLS остаётся основной защитой)
REVOKE ALL ON calculations FROM anon;
REVOKE ALL ON user_progress FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON calculations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_progress TO authenticated;

-- 2. Ограничить размер полей при INSERT в client_errors (защита от спама)
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
