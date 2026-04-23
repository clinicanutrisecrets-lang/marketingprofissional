-- ============================================================
-- MIGRATION 004 (aline): Skill 6 — Storytellings gerados
-- ============================================================
-- aline.depoimentos já existe (criada na migration 002).
-- Aqui adiciona aline.storytellings_gerados pra guardar output da Skill 6.

CREATE TABLE IF NOT EXISTS aline.storytellings_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  depoimento_id UUID REFERENCES aline.depoimentos(id) ON DELETE SET NULL,

  modo TEXT NOT NULL CHECK (modo IN ('6a_depoimento', '6b_publico_se_ve', '6c_ideia_historia')),

  input JSONB NOT NULL,
  output JSONB NOT NULL,

  versao_post_longo TEXT,
  versao_post_curto TEXT,
  versao_reels_script TEXT,
  versao_ad_125 TEXT,

  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  status TEXT DEFAULT 'novo'
    CHECK (status IN ('novo', 'aprovado', 'postado', 'usado_em_ad', 'descartado')),

  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aline_storytellings_perfil
  ON aline.storytellings_gerados(perfil_id, criado_em DESC);

COMMENT ON TABLE aline.storytellings_gerados IS
  'Skill 6: output dos 3 modos de storytelling. Reuso entre organico e ads.';
