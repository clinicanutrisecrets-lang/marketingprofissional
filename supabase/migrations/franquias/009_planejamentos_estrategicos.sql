-- ============================================================
-- MIGRATION 009: Planejamentos Estrategicos (Skills 2, 3, 5)
-- ============================================================
-- Consolidados numa tabela unica (tipo=skill_2/3/5) porque sao skills
-- de cadencia trimestral, output muito diferente mas natureza igual:
-- planejamento estrategico que vive por meses e informa decisoes.

CREATE TABLE IF NOT EXISTS planejamentos_estrategicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,

  tipo TEXT NOT NULL CHECK (tipo IN (
    'skill_2_mecanismo_unico',
    'skill_3_posicionamento_oferta',
    'skill_5_funil_organico'
  )),

  input JSONB NOT NULL,
  output JSONB NOT NULL,

  -- Campo extra especifico pro skill 2: qual dos 10 mecanismos foi eleito vencedor
  mecanismo_eleito TEXT,

  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  status TEXT DEFAULT 'novo'
    CHECK (status IN ('novo', 'visualizado', 'em_uso', 'arquivado')),
  vigente_ate DATE,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planejamentos_franqueada_tipo
  ON planejamentos_estrategicos(franqueada_id, tipo, criado_em DESC);

ALTER TABLE planejamentos_estrategicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada ve e atualiza proprio planejamento"
  ON planejamentos_estrategicos FOR ALL
  USING (
    franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admin ve tudo"
  ON planejamentos_estrategicos FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

COMMENT ON TABLE planejamentos_estrategicos IS
  'Skills 2 (Mecanismo), 3 (Posicionamento+Oferta), 5 (Funil) do Agente Organico. Cadencia trimestral.';
