-- ============================================================
-- MIGRATION 003 (aline): Skill 4 — Auditoria de Conteudo + 20 Ideias
-- ============================================================

CREATE TABLE IF NOT EXISTS aline.auditorias_conteudo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,

  padroes_conteudo_prende JSONB DEFAULT '[]'::jsonb,
  padroes_conteudo_converte JSONB DEFAULT '[]'::jsonb,
  erros_recorrentes JSONB DEFAULT '[]'::jsonb,

  temas_saturados JSONB DEFAULT '[]'::jsonb,
  temas_subexplorados JSONB DEFAULT '[]'::jsonb,
  lacunas_narrativa JSONB DEFAULT '[]'::jsonb,
  lacunas_autoridade JSONB DEFAULT '[]'::jsonb,

  oportunidades_viralizacao JSONB DEFAULT '[]'::jsonb,
  oportunidades_prova JSONB DEFAULT '[]'::jsonb,

  ideias_por_gap JSONB DEFAULT '[]'::jsonb,

  fonte_dados_posts JSONB,
  qtd_posts_analisados INTEGER,
  periodo_inicio TIMESTAMPTZ,
  periodo_fim TIMESTAMPTZ,

  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  ideias_aproveitadas JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'novo'
    CHECK (status IN ('novo', 'visualizado', 'aproveitado_parcial', 'aproveitado_total', 'descartado')),

  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aline_auditorias_perfil
  ON aline.auditorias_conteudo(perfil_id, criado_em DESC);

COMMENT ON TABLE aline.auditorias_conteudo IS
  'Skill 4 do Agente Organico: auditoria + 20 ideias baseadas em gaps.';
