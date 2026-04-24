-- ============================================================
-- BUNDLE V2 — migrations pendentes após bundle inicial
-- ============================================================
-- Aplicar APÓS já ter rodado o primeiro bundle + migrations 011 e 012.
-- Esta rodada adiciona:
--   - Skill 7 Tração (Marketing + Aline)
--   - Infra A/B test de funil (Sofia URL + lp_bridge)
--
-- COMO USAR:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cola TUDO deste arquivo
--   3. Run
--   4. Confirma "Success"
-- ============================================================


-- =====================================================
-- supabase/migrations/franquias/013_tracao_conteudo.sql
-- =====================================================
-- ============================================================
-- MIGRATION 013: Tracao de Conteudo (Skill 7)
-- ============================================================
-- Crescimento de seguidor qualificado via conteudo viralizavel.
-- 5 sub-rotinas diferentes (tipo = 7a_hooks, 7b_pilares, etc)
-- unificadas numa tabela com output JSONB variavel.

CREATE TABLE IF NOT EXISTS tracao_conteudo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,

  tipo TEXT NOT NULL CHECK (tipo IN (
    '7a_hooks_alta_tracao',
    '7b_pilares_tracao',
    '7c_plano_misto',
    '7d_bio_destaques',
    '7e_analise_viralidade'
  )),

  input JSONB NOT NULL,
  output JSONB NOT NULL,

  -- Campos extraidos pra busca/filtro rapido
  hooks_gerados JSONB,                -- array de hooks (7a)
  pilares_tracao JSONB,               -- array de pilares (7b)
  plano_semanal JSONB,                -- estrutura semanal (7c)

  -- Metricas do agente
  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  -- Validacao automatica de vocabulario (banimento de "protocolo")
  vocabulario_violacoes JSONB DEFAULT '[]'::jsonb,
  regerado_apos_violacao BOOLEAN DEFAULT FALSE,

  status TEXT DEFAULT 'novo' CHECK (status IN (
    'novo', 'visualizado', 'em_uso', 'arquivado', 'rejeitado_vocabulario'
  )),
  vigente_ate DATE,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracao_franqueada_tipo
  ON tracao_conteudo(franqueada_id, tipo, criado_em DESC);

ALTER TABLE tracao_conteudo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada CRUD proprio tracao"
  ON tracao_conteudo FOR ALL
  USING (
    franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admin ve todos"
  ON tracao_conteudo FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

COMMENT ON TABLE tracao_conteudo IS
  'Skill 7 do Agente Organico: crescimento de seguidor via conteudo viralizavel. 5 sub-rotinas.';


-- =====================================================
-- supabase/migrations/franquias/014_ab_test_funil.sql
-- =====================================================
-- ============================================================
-- MIGRATION 014: A/B test de funil (sofia_slug + funil_variante)
-- ============================================================
-- Duas variantes de funil a testar:
--   1. Ad → URL Sofia direto (scannerdasaude.com/sofia/[sofia_slug])
--   2. Ad → LP /nutri/[slug] (app.scannerdasaude.com) com CTA pra Sofia
--
-- sofia_slug: codigo/hash que identifica a nutri na Sofia do SaaS
-- funil_variante: qual funil o anuncio especifico esta testando

ALTER TABLE franqueadas
  ADD COLUMN IF NOT EXISTS sofia_slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_franqueadas_sofia_slug
  ON franqueadas(sofia_slug) WHERE sofia_slug IS NOT NULL;

ALTER TABLE anuncios
  ADD COLUMN IF NOT EXISTS funil_variante TEXT CHECK (funil_variante IN (
    'sofia_direto',        -- ad → URL Sofia
    'lp_bridge',           -- ad → LP → Sofia
    null
  ));

CREATE INDEX IF NOT EXISTS idx_anuncios_funil_variante
  ON anuncios(funil_variante, franqueada_id)
  WHERE funil_variante IS NOT NULL;

-- Adiciona funil_variante em conversoes_registradas pra filtrar
-- eventos por variante de teste e comparar performance (CPL, CPA, ROAS).
ALTER TABLE conversoes_registradas
  ADD COLUMN IF NOT EXISTS funil_variante TEXT;

CREATE INDEX IF NOT EXISTS idx_conversoes_funil_variante
  ON conversoes_registradas(franqueada_id, funil_variante, tipo, event_time DESC)
  WHERE funil_variante IS NOT NULL;

COMMENT ON COLUMN franqueadas.sofia_slug IS
  'Slug/hash da nutri no SaaS Sofia. URL completa: scannerdasaude.com/sofia/[sofia_slug].';
COMMENT ON COLUMN anuncios.funil_variante IS
  'A/B test — sofia_direto ou lp_bridge. Null = ainda sem variante definida.';


-- =====================================================
-- supabase/migrations/franquias/015_tracao_novos_tipos.sql
-- =====================================================
-- ============================================================
-- MIGRATION 015: Sub-rotinas 7f + 7g da Skill Tracao
-- ============================================================
-- 7f_compartilhamento_lateral: conteudo desenhado pra ser compartilhado
--   lateralmente (nutri-manda-pra-nutri, mulher-manda-pra-amiga).
--   Principal mecanica de crescimento quando nao tem budget de ads.
-- 7g_plano_reativacao: plano de 14 dias pra ressuscitar perfil que
--   perdeu tracao (pattern interrupt + reacender audiencia dormente).

ALTER TABLE tracao_conteudo
  DROP CONSTRAINT IF EXISTS tracao_conteudo_tipo_check;

ALTER TABLE tracao_conteudo
  ADD CONSTRAINT tracao_conteudo_tipo_check CHECK (tipo IN (
    '7a_hooks_alta_tracao',
    '7b_pilares_tracao',
    '7c_plano_misto',
    '7d_bio_destaques',
    '7e_analise_viralidade',
    '7f_compartilhamento_lateral',
    '7g_plano_reativacao'
  ));


-- =====================================================
-- supabase/migrations/aline/005_tracao_conteudo.sql
-- =====================================================
-- ============================================================
-- MIGRATION 005 (aline): Tracao de Conteudo (Skill 7)
-- ============================================================
-- Crescimento organico qualificado para os 2 perfis do Studio Aline
-- (@scannerdasaude + @nutrisecrets). 7 sub-rotinas.

CREATE TABLE IF NOT EXISTS aline.tracao_conteudo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,

  tipo TEXT NOT NULL CHECK (tipo IN (
    '7a_hooks_alta_tracao',
    '7b_pilares_tracao',
    '7c_plano_misto',
    '7d_bio_destaques',
    '7e_analise_viralidade',
    '7f_compartilhamento_lateral',
    '7g_plano_reativacao'
  )),

  input JSONB NOT NULL,
  output JSONB NOT NULL,

  hooks_gerados JSONB,
  pilares_tracao JSONB,
  plano_semanal JSONB,

  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  vocabulario_violacoes JSONB DEFAULT '[]'::jsonb,
  regerado_apos_violacao BOOLEAN DEFAULT FALSE,

  status TEXT DEFAULT 'novo' CHECK (status IN (
    'novo', 'visualizado', 'em_uso', 'arquivado', 'rejeitado_vocabulario'
  )),
  vigente_ate DATE,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aline_tracao_perfil_tipo
  ON aline.tracao_conteudo(perfil_id, tipo, criado_em DESC);

COMMENT ON TABLE aline.tracao_conteudo IS
  'Skill 7 do Agente Organico no Studio Aline: crescimento qualificado via conteudo compartilhavel.';

