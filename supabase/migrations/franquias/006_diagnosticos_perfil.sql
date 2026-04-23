-- ============================================================
-- MIGRATION 006: Diagnosticos de Perfil (Skill 1 - Agente Organico)
-- ============================================================
-- Salva o diagnostico estrategico gerado pelo Agente de Marketing
-- Organico pra cada franqueada. Pode ser executado sob demanda
-- (botao no dashboard) ou em cadencia mensal via cron.

CREATE TABLE IF NOT EXISTS diagnosticos_perfil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,

  -- Diagnostico principal
  diagnostico_primeira_impressao TEXT,
  clareza_posicionamento TEXT,
  linha_editorial_atual TEXT,

  -- Arrays de insights (JSONB pra flexibilidade)
  forcas JSONB DEFAULT '[]'::jsonb,
  fraquezas JSONB DEFAULT '[]'::jsonb,
  gargalos_crescimento JSONB DEFAULT '[]'::jsonb,
  gargalos_conversao JSONB DEFAULT '[]'::jsonb,
  erros_percepcao JSONB DEFAULT '[]'::jsonb,
  oportunidades_rapidas JSONB DEFAULT '[]'::jsonb,
  ideias_reposicionamento JSONB DEFAULT '[]'::jsonb,

  -- Sugestoes acionaveis
  sugestoes_bio JSONB DEFAULT '[]'::jsonb,
  sugestoes_destaques JSONB DEFAULT '[]'::jsonb,
  sugestoes_linha_editorial TEXT,

  -- Principal output: 10 mudancas priorizadas por impacto
  mudancas_priorizadas JSONB DEFAULT '[]'::jsonb,

  -- Snapshot dos dados que alimentaram a analise (auditavel)
  fonte_dados_ig JSONB,
  fonte_dados_onboarding JSONB,

  -- Metricas de execucao do agente
  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  -- Feedback da nutri (alimenta saude do agente)
  status TEXT DEFAULT 'novo'
    CHECK (status IN ('novo', 'visualizado', 'aprovado', 'editado', 'descartado')),
  feedback_nutri TEXT,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  visualizado_em TIMESTAMPTZ,
  acao_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_diagnosticos_franqueada
  ON diagnosticos_perfil(franqueada_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_diagnosticos_status
  ON diagnosticos_perfil(status, criado_em DESC);

-- RLS: franqueada ve o proprio, admin ve tudo
ALTER TABLE diagnosticos_perfil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada ve o proprio diagnostico"
  ON diagnosticos_perfil FOR SELECT
  USING (
    franqueada_id IN (
      SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Franqueada atualiza feedback do proprio"
  ON diagnosticos_perfil FOR UPDATE
  USING (
    franqueada_id IN (
      SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin ve todos"
  ON diagnosticos_perfil FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid())
  );

COMMENT ON TABLE diagnosticos_perfil IS
  'Diagnostico estrategico gerado pelo Agente Organico. Skill 1.';
