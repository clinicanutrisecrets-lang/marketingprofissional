-- ============================================================
-- 016: Revisoes IA de campanhas Meta Ads
-- Cron 2x/sem analisa todas as campanhas ativas e gera recomendacoes
-- ============================================================

CREATE TABLE IF NOT EXISTS franqueadas_revisoes_ads (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id            UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  periodo_inicio           DATE NOT NULL,
  periodo_fim              DATE NOT NULL,

  -- Snapshot do que foi analisado
  campanhas_analisadas     INTEGER DEFAULT 0,
  gasto_total              DECIMAL(10, 2) DEFAULT 0,
  leads_totais             INTEGER DEFAULT 0,
  cpl_medio                DECIMAL(10, 2),

  -- Avaliacao IA
  status_geral             TEXT CHECK (status_geral IN (
    'excelente', 'bom', 'mediano', 'preocupante', 'critico', 'sem_dados'
  )),
  resumo_executivo         TEXT,         -- 1-2 paragrafos
  recomendacoes            JSONB,        -- [{prioridade, acao, justificativa, impacto_estimado}]
  alertas                  JSONB,        -- [{tipo, mensagem, campanha_id}]

  -- Custo IA + metadados
  ia_model_usado           TEXT,
  ia_tokens_input          INTEGER,
  ia_tokens_output         INTEGER,
  ia_custo_usd             DECIMAL(10, 6),

  enviado_email            BOOLEAN DEFAULT FALSE,
  enviado_em               TIMESTAMPTZ,
  visualizado_em           TIMESTAMPTZ,

  criado_em                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(franqueada_id, periodo_inicio)
);

CREATE INDEX idx_revisoes_ads_franqueada ON franqueadas_revisoes_ads(franqueada_id, criado_em DESC);
CREATE INDEX idx_revisoes_ads_status ON franqueadas_revisoes_ads(status_geral)
  WHERE status_geral IN ('preocupante', 'critico');

-- RLS: franqueada le so as proprias revisoes
ALTER TABLE franqueadas_revisoes_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "franqueada_le_proprias_revisoes" ON franqueadas_revisoes_ads
  FOR SELECT USING (
    franqueada_id IN (
      SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()
    )
  );

-- Admin/super_admin acessa tudo
CREATE POLICY "admin_acesso_total_revisoes" ON franqueadas_revisoes_ads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE auth_user_id = auth.uid()
        AND papel IN ('admin', 'super_admin')
    )
  );

COMMENT ON TABLE franqueadas_revisoes_ads IS
  'Revisoes IA das campanhas Meta Ads (cron 2x/sem). Cada execucao do agente revisor gera 1 linha por franqueada com campanhas ativas.';
