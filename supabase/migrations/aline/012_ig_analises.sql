-- ============================================================
-- Raio-X do público (Studio Aline): análises da conta do Instagram
-- (posts × métricas, temas dos comentários e das DMs, ideias de posts).
-- Aditiva. Pode aplicar antes ou depois do deploy.
-- ============================================================
CREATE TABLE IF NOT EXISTS aline.ig_analises (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id     UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL DEFAULT 'publico',
  dados         JSONB NOT NULL,      -- tabelas: posts com métricas, temas, contagens
  relatorio     TEXT,                -- texto do raio-x, em markdown simples
  avisos        TEXT[] NOT NULL DEFAULT '{}',
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ig_analises_perfil_idx ON aline.ig_analises (perfil_id, criado_em DESC);
ALTER TABLE aline.ig_analises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aline_ig_analises_admin" ON aline.ig_analises;
CREATE POLICY "aline_ig_analises_admin" ON aline.ig_analises FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND papel = 'super_admin')
);
