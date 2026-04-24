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
