-- ============================================================
-- MIGRATION 008: Storytelling (Skill 6) — Franquias
-- ============================================================
-- Depoimentos coletados via UI + storytellings gerados pelo Agente.
-- Alimenta orgânico (posts) e ads (copy de anúncio com história real).

-- =============== DEPOIMENTOS ===============
CREATE TABLE IF NOT EXISTS depoimentos_franqueada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,

  titulo TEXT NOT NULL,
  quem_era TEXT,                      -- "Marina, 42, histórico familiar de diabetes"
  problema_inicial TEXT NOT NULL,
  ponto_ruptura TEXT,
  solucao_aplicada TEXT NOT NULL,
  resultado TEXT NOT NULL,
  objecoes_relatadas TEXT,

  anonimo BOOLEAN DEFAULT TRUE,
  idade_aproximada INTEGER,
  genero TEXT,
  regiao TEXT,

  autorizacao_uso BOOLEAN DEFAULT TRUE,
  fonte TEXT DEFAULT 'relato_nutri'
    CHECK (fonte IN ('relato_nutri', 'screenshot_whatsapp', 'video', 'audio')),
  midia_url TEXT,

  usado_em_posts JSONB DEFAULT '[]'::jsonb,
  usado_em_ads JSONB DEFAULT '[]'::jsonb,

  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_depoimentos_franqueada
  ON depoimentos_franqueada(franqueada_id, ativo);

ALTER TABLE depoimentos_franqueada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada CRUD proprios depoimentos"
  ON depoimentos_franqueada FOR ALL
  USING (
    franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admin ve todos"
  ON depoimentos_franqueada FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

-- =============== STORYTELLINGS GERADOS ===============
-- Guarda output do Agente (modos 6a/6b/6c) pra reuso
CREATE TABLE IF NOT EXISTS storytellings_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  depoimento_id UUID REFERENCES depoimentos_franqueada(id) ON DELETE SET NULL,

  modo TEXT NOT NULL CHECK (modo IN ('6a_depoimento', '6b_publico_se_ve', '6c_ideia_historia')),

  -- Input do usuário (pra auditoria)
  input JSONB NOT NULL,

  -- Output do Claude (estrutura varia por modo)
  output JSONB NOT NULL,

  -- Versões extraídas (busca rápida)
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

CREATE INDEX IF NOT EXISTS idx_storytellings_franqueada
  ON storytellings_gerados(franqueada_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_storytellings_modo
  ON storytellings_gerados(modo);

ALTER TABLE storytellings_gerados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada ve proprio storytelling"
  ON storytellings_gerados FOR SELECT
  USING (
    franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admin ve todos"
  ON storytellings_gerados FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

COMMENT ON TABLE depoimentos_franqueada IS
  'Casos/depoimentos coletados pela nutri. Alimenta Skill 6a.';
COMMENT ON TABLE storytellings_gerados IS
  'Output da Skill 6 (3 modos). Reuso entre organico e ads.';
