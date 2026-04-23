-- ============================================================
-- MIGRATION 007: Auditorias de Conteudo (Skill 4 - Agente Organico)
-- ============================================================
-- Agente analisa ultimos 30 posts + pilares + concorrentes (quando ha)
-- e entrega 20 ideias baseadas em gaps encontrados.
-- Alimenta direto o planejador semanal com ideias frescas.

CREATE TABLE IF NOT EXISTS auditorias_conteudo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,

  -- Analise dos padroes observados
  padroes_conteudo_prende JSONB DEFAULT '[]'::jsonb,
  padroes_conteudo_converte JSONB DEFAULT '[]'::jsonb,
  erros_recorrentes JSONB DEFAULT '[]'::jsonb,

  -- Gaps identificados
  temas_saturados JSONB DEFAULT '[]'::jsonb,
  temas_subexplorados JSONB DEFAULT '[]'::jsonb,
  lacunas_narrativa JSONB DEFAULT '[]'::jsonb,
  lacunas_autoridade JSONB DEFAULT '[]'::jsonb,

  -- Oportunidades
  oportunidades_viralizacao JSONB DEFAULT '[]'::jsonb,
  oportunidades_prova JSONB DEFAULT '[]'::jsonb,

  -- Principal output: 20 ideias de conteudo baseadas em gaps
  -- Cada item: { ordem, titulo, formato (feed|carrossel|reels|stories),
  --   angulo, hook, cta, justificativa, gap_que_preenche }
  ideias_por_gap JSONB DEFAULT '[]'::jsonb,

  -- Snapshot auditavel
  fonte_dados_posts JSONB,
  qtd_posts_analisados INTEGER,
  periodo_inicio TIMESTAMPTZ,
  periodo_fim TIMESTAMPTZ,

  -- Tracking do agente
  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  -- Feedback (alimenta saude do agente)
  ideias_aproveitadas JSONB DEFAULT '[]'::jsonb, -- IDs das ideias que viraram post real
  status TEXT DEFAULT 'novo'
    CHECK (status IN ('novo', 'visualizado', 'aproveitado_parcial', 'aproveitado_total', 'descartado')),

  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditorias_franqueada
  ON auditorias_conteudo(franqueada_id, criado_em DESC);

ALTER TABLE auditorias_conteudo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada ve a propria auditoria"
  ON auditorias_conteudo FOR SELECT
  USING (
    franqueada_id IN (
      SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Franqueada marca ideias aproveitadas"
  ON auditorias_conteudo FOR UPDATE
  USING (
    franqueada_id IN (
      SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin ve tudo"
  ON auditorias_conteudo FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

COMMENT ON TABLE auditorias_conteudo IS
  'Skill 4 do Agente Organico: auditoria de conteudo e 20 ideias por gaps.';
