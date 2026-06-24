-- ============================================================
-- MIGRATION 009 (aline): Planejamentos Estratégicos (Skills 2/3/5)
-- ============================================================
-- Paridade com o app das franquias: Mecanismo Único (2), Posicionamento &
-- Oferta (3) e Funil Orgânico (5) pros 2 perfis do Studio Aline.

CREATE TABLE IF NOT EXISTS aline.planejamentos_estrategicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,

  tipo TEXT NOT NULL CHECK (tipo IN (
    'skill_2_mecanismo_unico',
    'skill_3_posicionamento_oferta',
    'skill_5_funil_organico'
  )),

  input JSONB NOT NULL,
  output JSONB NOT NULL,

  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  status TEXT DEFAULT 'novo' CHECK (status IN (
    'novo', 'visualizado', 'em_uso', 'arquivado'
  )),
  vigente_ate DATE,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planejamentos_perfil_tipo
  ON aline.planejamentos_estrategicos(perfil_id, tipo, criado_em DESC);
