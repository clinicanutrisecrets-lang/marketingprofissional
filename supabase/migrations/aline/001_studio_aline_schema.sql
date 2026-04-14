-- ============================================================
-- STUDIO ALINE — schema separado (pessoal, isolado do SaaS das franquias)
-- Apenas Aline acessa. Auth por 1 usuário único.
-- Tabelas: perfis (2 registros fixos), posts, anuncios, ideias, relatorios
-- ============================================================

CREATE SCHEMA IF NOT EXISTS aline;

-- =============== PERFIS ===============
CREATE TABLE aline.perfis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT UNIQUE NOT NULL,       -- 'scannerdasaude' | 'nutrisecrets'
  nome                  TEXT NOT NULL,
  instagram_handle      TEXT NOT NULL,
  instagram_conta_id    TEXT,
  instagram_access_token BYTEA,                     -- criptografado (usa encrypt_token)
  instagram_token_expiry TIMESTAMPTZ,
  facebook_pagina_id    TEXT,
  meta_ads_account_id   TEXT,
  meta_ads_access_token BYTEA,                      -- criptografado
  meta_ads_token_expiry TIMESTAMPTZ,
  bannerbear_project_id TEXT,

  -- HeyGen (apenas este sistema usa)
  heygen_avatar_id      TEXT,
  heygen_voice_id       TEXT,
  heygen_ativo          BOOLEAN DEFAULT FALSE,

  objetivo              TEXT,
  tom                   TEXT,
  pilares               JSONB,
  instrucoes_ia         TEXT,
  regras_especiais      TEXT,
  cor_primaria          TEXT,
  cor_secundaria        TEXT,

  -- Benchmarks específicos
  cpl_benchmark         DECIMAL(10,2),
  roas_minimo           DECIMAL(10,2),
  ctr_minimo            DECIMAL(5,2),

  ativo                 BOOLEAN DEFAULT TRUE,
  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- Seed dos 2 perfis fixos
INSERT INTO aline.perfis (slug, nome, instagram_handle, objetivo, tom, pilares, regras_especiais, cor_primaria) VALUES
(
  'scannerdasaude',
  'Scanner da Saúde',
  'scannerdasaude',
  'Vender o software Scanner da Saúde para nutricionistas',
  'cientifico_acessivel',
  '[
    {"nome":"educacao_precisao","pct":30},
    {"nome":"transformacao_carreira","pct":30},
    {"nome":"bastidores_software","pct":20},
    {"nome":"prova_social","pct":10},
    {"nome":"venda_direta","pct":10}
  ]'::jsonb,
  'Público exclusivo: nutricionistas clínicas',
  '#0BB8A8'
),
(
  'nutrisecrets',
  'Nutri Secrets',
  'nutrisecrets',
  'Educar sobre nutrição de precisão — 70% paciente final, 30% profissional',
  'empatico_acolhedor',
  '[
    {"nome":"sinergias_nutricionais","pct":35},
    {"nome":"precisao_leigos","pct":25},
    {"nome":"conteudo_pessoal","pct":15},
    {"nome":"profissionais_saude","pct":15},
    {"nome":"scanner_menção","pct":10}
  ]'::jsonb,
  'Máx 1 em cada 5 posts menciona Scanner da Saúde. Split 70/30 paciente/profissional.',
  '#D946EF'
);

-- =============== POSTS ===============
CREATE TABLE aline.posts (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id                  UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  semana_ref                 DATE,

  tipo                       TEXT NOT NULL CHECK (tipo IN (
    'feed_imagem','feed_carrossel','reels','stories','stories_sequencia'
  )),

  status                     TEXT DEFAULT 'gerando' CHECK (status IN (
    'gerando','aguardando_midia','aguardando_aprovacao','aprovado','agendado','postado','erro','cancelado'
  )),

  -- ORIGEM
  origem                     TEXT DEFAULT 'ia' CHECK (origem IN ('ia','manual_aline','repost')),
  aprovacao_tipo             TEXT DEFAULT 'bloco_semanal' CHECK (aprovacao_tipo IN (
    'bloco_semanal','individual','automatico'
  )),
  midia_pendente             BOOLEAN DEFAULT FALSE,
  semana_aprovada_em         TIMESTAMPTZ,

  -- CONTEÚDO GERADO
  copy_legenda               TEXT,
  copy_cta                   TEXT,
  hashtags                   TEXT[],
  pilar                      TEXT,
  angulo                     TEXT,
  prompt_usado               TEXT,

  -- VERSÃO IA ORIGINAL (loop de aprendizado)
  copy_legenda_ia_original   TEXT,
  copy_cta_ia_original       TEXT,
  hashtags_ia_original       TEXT[],
  ia_model_usado             TEXT,
  ia_tokens_input            INTEGER,
  ia_tokens_output           INTEGER,
  ia_tokens_cached           INTEGER,

  -- HEYGEN (reels com avatar)
  heygen_video_id            TEXT,
  heygen_script              TEXT,
  gerado_por_ia_video        BOOLEAN DEFAULT FALSE,

  -- CRIATIVO
  bannerbear_design_id       TEXT,
  bannerbear_preview_url     TEXT,

  -- AGENDAMENTO
  data_hora_agendada         TIMESTAMPTZ,
  data_hora_postada          TIMESTAMPTZ,
  instagram_post_id          TEXT,

  aprovado_em                TIMESTAMPTZ,
  nota_edicao                TEXT,

  -- PERFORMANCE
  alcance                    INTEGER,
  impressoes                 INTEGER,
  curtidas                   INTEGER,
  comentarios                INTEGER,
  compartilhamentos          INTEGER,
  salvamentos                INTEGER,
  plays_video                INTEGER,
  avg_watch_time_seg         DECIMAL(6,2),
  total_watch_time_seg       INTEGER,
  shares_externos            INTEGER,
  cliques_link               INTEGER,

  criado_em                  TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_aline_posts_perfil_status ON aline.posts(perfil_id, status);
CREATE INDEX idx_aline_posts_agendamento ON aline.posts(data_hora_agendada)
  WHERE status IN ('agendado','aprovado');

-- Múltiplas mídias (carrossel)
CREATE TABLE aline.post_midias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES aline.posts(id) ON DELETE CASCADE,
  ordem           INTEGER NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('imagem','video')),
  url             TEXT NOT NULL,
  largura_px      INTEGER,
  altura_px       INTEGER,
  duracao_seg     INTEGER,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, ordem)
);

-- =============== ANÚNCIOS ===============
CREATE TABLE aline.anuncios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id             UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,

  nome                  TEXT,
  objetivo_negocio      TEXT CHECK (objetivo_negocio IN (
    'ganhar_seguidores','receber_mensagens','agendar_consultas',
    'vender_teste_genetico','alcance','trafego_site'
  )),

  -- Mapeamento técnico Meta
  meta_objective        TEXT,
  meta_optimization     TEXT,
  meta_destination      TEXT,

  status                TEXT DEFAULT 'rascunho' CHECK (status IN (
    'rascunho','aguardando_aprovacao','ativo','pausado','encerrado'
  )),

  publico_descricao     TEXT,
  publico_meta_json     JSONB,

  budget_diario         DECIMAL(10,2),
  budget_total          DECIMAL(10,2),
  data_inicio           DATE,
  data_fim              DATE,

  copy_headline         TEXT,
  copy_texto            TEXT,
  copy_cta_botao        TEXT,
  url_destino           TEXT,
  bannerbear_design_id  TEXT,
  url_midia             TEXT,

  meta_campaign_id      TEXT,
  meta_adset_id         TEXT,
  meta_ad_id            TEXT,

  -- Performance + avaliação contra benchmark
  gasto_total           DECIMAL(10,2) DEFAULT 0,
  impressoes            INTEGER DEFAULT 0,
  cliques               INTEGER DEFAULT 0,
  leads                 INTEGER DEFAULT 0,
  cpl                   DECIMAL(10,2),
  roas                  DECIMAL(10,2),
  avaliacao_vs_benchmark TEXT CHECK (avaliacao_vs_benchmark IN (
    'excelente','bom','mediano','ruim'
  )),

  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_aline_anuncios_perfil ON aline.anuncios(perfil_id, status);

-- =============== RELATÓRIOS SEMANAIS ===============
CREATE TABLE aline.relatorios (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id                UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  semana_inicio            DATE NOT NULL,
  semana_fim               DATE NOT NULL,

  total_posts              INTEGER,
  alcance_total            INTEGER,
  impressoes_total         INTEGER,
  novos_seguidores         INTEGER,
  taxa_engajamento_media   DECIMAL(5,2),
  melhor_post_id           UUID REFERENCES aline.posts(id) ON DELETE SET NULL,
  melhor_formato           TEXT,
  melhor_horario           TIME,
  melhor_pilar             TEXT,

  -- IA vs manual (loop de aprendizado)
  posts_ia_count           INTEGER,
  posts_manual_count       INTEGER,
  ia_engajamento_medio     DECIMAL(5,2),
  manual_engajamento_medio DECIMAL(5,2),
  insight_manual_vs_ia     TEXT,

  gasto_anuncio            DECIMAL(10,2),
  leads_anuncio            INTEGER,
  cpl_medio                DECIMAL(10,2),
  cpl_vs_benchmark         TEXT,        -- 'excelente' | 'bom' | 'mediano' | 'ruim'

  analise_texto            TEXT,
  recomendacoes            TEXT[],

  criado_em                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(perfil_id, semana_inicio)
);

-- =============== BANCO DE IDEIAS ===============
CREATE TABLE aline.ideias_conteudo (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id     UUID REFERENCES aline.perfis(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL,
  descricao     TEXT,
  tipo_sugerido TEXT,
  pilar         TEXT,
  origem        TEXT DEFAULT 'ia' CHECK (origem IN ('ia','aline','performance')),
  usado         BOOLEAN DEFAULT FALSE,
  post_id       UUID REFERENCES aline.posts(id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- =============== RLS ===============
-- Apenas Aline (super_admin no schema public) acessa.
-- Reutiliza a função is_admin() do schema public.

ALTER TABLE aline.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.post_midias ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.ideias_conteudo ENABLE ROW LEVEL SECURITY;

-- Só super_admins do public.admins têm acesso
CREATE POLICY "aline_perfis_admin" ON aline.perfis FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND papel = 'super_admin')
);
CREATE POLICY "aline_posts_admin" ON aline.posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND papel = 'super_admin')
);
CREATE POLICY "aline_post_midias_admin" ON aline.post_midias FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND papel = 'super_admin')
);
CREATE POLICY "aline_anuncios_admin" ON aline.anuncios FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND papel = 'super_admin')
);
CREATE POLICY "aline_relatorios_admin" ON aline.relatorios FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND papel = 'super_admin')
);
CREATE POLICY "aline_ideias_admin" ON aline.ideias_conteudo FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND papel = 'super_admin')
);

CREATE TRIGGER trg_aline_perfis_atualizado BEFORE UPDATE ON aline.perfis
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();

CREATE TRIGGER trg_aline_posts_atualizado BEFORE UPDATE ON aline.posts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();

CREATE TRIGGER trg_aline_anuncios_atualizado BEFORE UPDATE ON aline.anuncios
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_atualizado_em();
