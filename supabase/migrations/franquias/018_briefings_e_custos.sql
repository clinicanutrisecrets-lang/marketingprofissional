-- ============================================================
-- MIGRATION 018: Briefings antecipados + log de custos
-- ============================================================
-- briefings_franqueada: a nutri pede temas durante a semana, o cron
-- de domingo consome esses pedidos antes de inventar temas próprios.
-- custos_geracao: cada chamada Claude/Bannerbear/Creatomate registra
-- tokens e USD pra fechar custo real por franqueada.

-- =============== BRIEFINGS ANTECIPADOS ===============
CREATE TABLE IF NOT EXISTS briefings_franqueada (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id      UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,

  tema               TEXT NOT NULL,
  angulo_sugerido    TEXT,
  formato_preferido  TEXT
    CHECK (formato_preferido IN ('feed_imagem','feed_carrossel','reels','stories','sem_preferencia')),
  observacoes        TEXT,

  status             TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','usado','cancelado','expirado')),
  semana_alvo        DATE,
  post_gerado_id     UUID REFERENCES posts_agendados(id) ON DELETE SET NULL,

  criado_em          TIMESTAMPTZ DEFAULT NOW(),
  usado_em           TIMESTAMPTZ,
  cancelado_em       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_briefings_franqueada
  ON briefings_franqueada(franqueada_id, status, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_briefings_pendentes
  ON briefings_franqueada(franqueada_id, criado_em DESC)
  WHERE status = 'pendente';

ALTER TABLE briefings_franqueada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada CRUD proprios briefings"
  ON briefings_franqueada FOR ALL
  USING (
    franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admin ve todos briefings"
  ON briefings_franqueada FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

COMMENT ON TABLE briefings_franqueada IS
  'Temas/pedidos que a nutri envia durante a semana. O cron de domingo prioriza esses temas antes de inventar próprios.';

-- =============== LOG DE CUSTOS ===============
CREATE TABLE IF NOT EXISTS custos_geracao (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id                 UUID REFERENCES franqueadas(id) ON DELETE SET NULL,

  servico                       TEXT NOT NULL
    CHECK (servico IN ('claude','bannerbear','creatomate','heygen','gemini','openai','pexels','outro')),
  operacao                      TEXT NOT NULL,
  modelo                        TEXT,

  input_tokens                  INTEGER,
  output_tokens                 INTEGER,
  cache_creation_input_tokens   INTEGER,
  cache_read_input_tokens       INTEGER,

  custo_usd                     DECIMAL(12, 6) NOT NULL DEFAULT 0,

  post_agendado_id              UUID REFERENCES posts_agendados(id) ON DELETE SET NULL,
  briefing_id                   UUID REFERENCES briefings_franqueada(id) ON DELETE SET NULL,
  aprovacao_semanal_id          UUID REFERENCES aprovacoes_semanais(id) ON DELETE SET NULL,

  sucesso                       BOOLEAN DEFAULT TRUE,
  erro                          TEXT,
  latencia_ms                   INTEGER,
  metadata                      JSONB DEFAULT '{}'::jsonb,

  criado_em                     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custos_franqueada_data
  ON custos_geracao(franqueada_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_custos_servico_data
  ON custos_geracao(servico, criado_em DESC);

ALTER TABLE custos_geracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve todos custos"
  ON custos_geracao FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

CREATE POLICY "Franqueada ve proprios custos"
  ON custos_geracao FOR SELECT
  USING (
    franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  );

COMMENT ON TABLE custos_geracao IS
  'Log de custo por chamada de API (Claude, Bannerbear, etc). Base pro fechamento real de custo por franqueada.';

-- =============== LINK BRIEFING → POST ===============
ALTER TABLE posts_agendados
  ADD COLUMN IF NOT EXISTS briefing_id UUID REFERENCES briefings_franqueada(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_posts_briefing
  ON posts_agendados(briefing_id)
  WHERE briefing_id IS NOT NULL;

-- Estende enum de origem pra incluir briefing antecipado
ALTER TABLE posts_agendados
  DROP CONSTRAINT IF EXISTS posts_agendados_origem_check;

ALTER TABLE posts_agendados
  ADD CONSTRAINT posts_agendados_origem_check
  CHECK (origem IN ('ia_automatico','manual_nutri','manual_admin','briefing_antecipado'));
