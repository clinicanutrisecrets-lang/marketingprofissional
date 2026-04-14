-- ============================================================
-- CONTEÚDO: aprovações semanais, posts, relatórios
-- ============================================================

CREATE TABLE aprovacoes_semanais (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id        UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  semana_ref           DATE NOT NULL,
  status               TEXT DEFAULT 'aguardando'
    CHECK (status IN ('aguardando','aprovada_integral','aprovada_com_edicoes','recusada','expirada')),
  total_posts          INTEGER DEFAULT 0,
  enviada_em           TIMESTAMPTZ,
  aprovada_em          TIMESTAMPTZ,
  deadline             TIMESTAMPTZ,
  link_acesso          TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  edicoes_feitas       JSONB DEFAULT '[]'::jsonb,
  comentario_geral     TEXT,
  criado_em            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(franqueada_id, semana_ref)
);

CREATE INDEX idx_aprovacoes_status ON aprovacoes_semanais(franqueada_id, status);
CREATE INDEX idx_aprovacoes_token ON aprovacoes_semanais(link_acesso);

CREATE TABLE posts_agendados (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id           UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  aprovacao_semanal_id    UUID REFERENCES aprovacoes_semanais(id) ON DELETE SET NULL,
  semana_ref              DATE,
  tipo_post               TEXT CHECK (tipo_post IN ('feed_imagem','feed_carrossel','reels','stories','anuncio')),
  status                  TEXT DEFAULT 'gerando'
    CHECK (status IN ('gerando','aguardando_aprovacao','aprovado','postado','erro','cancelado')),
  origem                  TEXT DEFAULT 'ia_automatico'
    CHECK (origem IN ('ia_automatico','manual_nutri','manual_admin')),
  criado_por              UUID,
  prioridade              INTEGER DEFAULT 50,
  bloqueado_horario       BOOLEAN DEFAULT FALSE,
  briefing_nutri          TEXT,
  legenda_gerada_ia       BOOLEAN DEFAULT FALSE,
  copy_legenda            TEXT,
  copy_cta                TEXT,
  hashtags                TEXT[],
  angulo_copy             TEXT,
  bannerbear_design_id    TEXT,
  bannerbear_template_id  TEXT,
  video_upload_url        TEXT,
  imagem_upload_url       TEXT,
  url_imagem_final        TEXT,
  url_video_final         TEXT,
  data_hora_agendada      TIMESTAMPTZ,
  data_hora_postado       TIMESTAMPTZ,
  instagram_post_id       TEXT,
  redistribuido_de        TIMESTAMPTZ,
  aprovado_individual     BOOLEAN DEFAULT FALSE,
  editado_pela_nutri      BOOLEAN DEFAULT FALSE,
  edicoes_log             JSONB DEFAULT '[]'::jsonb,
  alcance                 INTEGER,
  impressoes              INTEGER,
  engajamento             INTEGER,
  curtidas                INTEGER,
  comentarios             INTEGER,
  compartilhamentos       INTEGER,
  salvamentos             INTEGER,
  cliques_link            INTEGER,
  metricas_atualizadas_em TIMESTAMPTZ,
  criado_em               TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_franqueada_status ON posts_agendados(franqueada_id, status);
CREATE INDEX idx_posts_agendamento ON posts_agendados(data_hora_agendada) WHERE status IN ('aprovado','aguardando_aprovacao');
CREATE INDEX idx_posts_semana ON posts_agendados(franqueada_id, semana_ref);

CREATE TRIGGER trg_posts_atualizado
  BEFORE UPDATE ON posts_agendados
  FOR EACH ROW EXECUTE FUNCTION tg_set_atualizado_em();

CREATE TABLE relatorios_semanais (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id            UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  semana_inicio            DATE NOT NULL,
  semana_fim               DATE NOT NULL,
  total_posts              INTEGER DEFAULT 0,
  total_alcance            INTEGER DEFAULT 0,
  total_engajamento        INTEGER DEFAULT 0,
  taxa_engajamento         DECIMAL(5,2),
  melhor_post_id           UUID REFERENCES posts_agendados(id) ON DELETE SET NULL,
  melhor_formato           TEXT,
  melhor_horario           TIME,
  melhor_dia_semana        INTEGER,
  posts_manual_performance JSONB,
  posts_ia_performance     JSONB,
  insight_manual_vs_ia     TEXT,
  analise_claude           TEXT,
  recomendacoes            TEXT[],
  gasto_anuncio            DECIMAL(10,2),
  leads_gerados            INTEGER,
  custo_por_lead           DECIMAL(10,2),
  testes_vendidos          INTEGER,
  receita_comissao         DECIMAL(10,2),
  enviado_nutri            BOOLEAN DEFAULT FALSE,
  criado_em                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(franqueada_id, semana_inicio)
);

CREATE INDEX idx_relatorios_franqueada ON relatorios_semanais(franqueada_id, semana_inicio DESC);
