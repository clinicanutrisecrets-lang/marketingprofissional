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
