-- ============================================================
-- 017: Fix RLS recursiva em admins
--
-- Bug: a policy admins_self_read chamava is_admin() que faz
--   SELECT FROM admins → recursao infinita ao tentar ler admins
--   via cliente authenticated (Studio gerador de pack falha com
--   "infinite recursion detected in policy for relation 'admins'").
--
-- Fix: simplifica a policy de leitura pra so 'auth_user_id = auth.uid()'.
-- Service_role (usado pelo backend e SQL Editor) bypassa RLS por default,
-- entao gerenciamento de admins por super_admin acontece via backend ou
-- direto no SQL Editor.
-- ============================================================

DROP POLICY IF EXISTS "admins_self_read" ON admins;
DROP POLICY IF EXISTS "admins_super_manage" ON admins;

CREATE POLICY "admins_self_read" ON admins
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- Comentario na funcao pra deixar claro que ela NAO deve ser usada em
-- policies da propria tabela admins (causa recursao).
COMMENT ON FUNCTION is_admin() IS
  'Helper pra checar se auth.uid() esta em admins. NAO USAR em policies da tabela admins (recursao infinita). Usar so em policies de outras tabelas.';
