-- ============================================================
-- NOTIFICAÇÕES + ROW LEVEL SECURITY
-- ============================================================

CREATE TABLE notificacoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id     UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  tipo              TEXT NOT NULL,
  titulo            TEXT NOT NULL,
  mensagem          TEXT NOT NULL,
  cta_label         TEXT,
  cta_url           TEXT,
  prioridade        TEXT DEFAULT 'normal' CHECK (prioridade IN ('urgente','normal','info')),
  lida              BOOLEAN DEFAULT FALSE,
  arquivada         BOOLEAN DEFAULT FALSE,
  enviada_email     BOOLEAN DEFAULT FALSE,
  enviada_whatsapp  BOOLEAN DEFAULT FALSE,
  criado_em         TIMESTAMPTZ DEFAULT NOW(),
  lida_em           TIMESTAMPTZ
);

CREATE INDEX idx_notif_franqueada_nao_lida
  ON notificacoes(franqueada_id, lida)
  WHERE lida = FALSE;

CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID UNIQUE NOT NULL,
  nome          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  papel         TEXT DEFAULT 'onboarder' CHECK (papel IN ('super_admin','onboarder','suporte')),
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE franqueadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "franqueadas_self_read" ON franqueadas FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "franqueadas_self_update" ON franqueadas FOR UPDATE USING (auth_user_id = auth.uid());
CREATE POLICY "franqueadas_admin_all" ON franqueadas FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE arquivos_franqueada ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arquivos_self" ON arquivos_franqueada FOR ALL USING (
  franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()) OR is_admin()
);

ALTER TABLE posts_agendados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_self" ON posts_agendados FOR ALL USING (
  franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()) OR is_admin()
);

ALTER TABLE aprovacoes_semanais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aprovacoes_self" ON aprovacoes_semanais FOR ALL USING (
  franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()) OR is_admin()
);

ALTER TABLE relatorios_semanais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "relatorios_self" ON relatorios_semanais FOR ALL USING (
  franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()) OR is_admin()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notificacoes_self" ON notificacoes FOR ALL USING (
  franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()) OR is_admin()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_self_read" ON admins FOR SELECT USING (auth_user_id = auth.uid() OR is_admin());
CREATE POLICY "admins_super_manage" ON admins FOR ALL USING (
  EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid() AND papel = 'super_admin')
);
