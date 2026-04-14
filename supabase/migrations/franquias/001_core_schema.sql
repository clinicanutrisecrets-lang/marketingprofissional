-- ============================================================
-- SCANNER DA SAÚDE — SCHEMA CORE
-- Tabelas: franqueadas, arquivos_franqueada
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============== FRANQUEADAS ===============
CREATE TABLE franqueadas (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id                  UUID UNIQUE,
  criado_em                     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em                 TIMESTAMPTZ DEFAULT NOW(),
  status                        TEXT DEFAULT 'onboarding'
    CHECK (status IN ('onboarding','ativo','pausado','cancelado')),
  plano                         TEXT DEFAULT 'franquia_basico'
    CHECK (plano IN ('franquia_basico','franquia_avancado','franquia_premium')),
  nome_completo                 TEXT NOT NULL,
  email                         TEXT UNIQUE NOT NULL,
  whatsapp                      TEXT,
  cpf                           TEXT,
  crn_numero                    TEXT,
  crn_estado                    TEXT,
  nome_clinica                  TEXT,
  nome_comercial                TEXT,
  tagline                       TEXT,
  bio_instagram                 TEXT,
  descricao_longa               TEXT,
  historia_pessoal              TEXT,
  nicho_principal               TEXT,
  nicho_secundario              TEXT,
  especializacoes               TEXT[],
  anos_experiencia              INTEGER,
  publico_alvo_descricao        TEXT,
  diferenciais                  TEXT,
  modalidade_atendimento        TEXT CHECK (modalidade_atendimento IN ('presencial','online','hibrido')),
  cidade                        TEXT,
  estado                        TEXT,
  pais                          TEXT DEFAULT 'Brasil',
  endereco_clinica              TEXT,
  bairro                        TEXT,
  link_agendamento              TEXT,
  plataforma_agendamento        TEXT,
  valor_consulta_inicial        DECIMAL(10,2),
  valor_consulta_retorno        DECIMAL(10,2),
  valor_pacote_mensal           DECIMAL(10,2),
  aceita_plano_saude            BOOLEAN DEFAULT FALSE,
  planos_aceitos                TEXT[],
  cor_primaria_hex              TEXT,
  cor_secundaria_hex            TEXT,
  cor_terciaria_hex             TEXT,
  cor_texto_hex                 TEXT DEFAULT '#1A2E45',
  cor_fundo_hex                 TEXT DEFAULT '#FFFFFF',
  estilo_visual                 TEXT,
  fonte_titulo                  TEXT,
  instagram_handle              TEXT,
  instagram_conta_id            TEXT,
  instagram_tipo_conta          TEXT,
  facebook_pagina_id            TEXT,
  tiktok_handle                 TEXT,
  youtube_canal                 TEXT,
  site_proprio                  TEXT,
  linktree_ou_similar           TEXT,
  tom_comunicacao               TEXT,
  palavras_evitar               TEXT,
  palavras_chave_usar           TEXT[],
  hashtags_favoritas            TEXT[],
  concorrentes_nao_citar        TEXT,
  tem_depoimentos               BOOLEAN DEFAULT FALSE,
  depoimentos_formato           TEXT,
  numero_pacientes_atendidos    INTEGER,
  resultado_transformacao       TEXT,
  aprovacao_modo                TEXT DEFAULT 'semanal_bloco'
    CHECK (aprovacao_modo IN ('semanal_bloco','individual_por_post','automatico_total')),
  aprovacao_dia_envio           INTEGER DEFAULT 0,
  aprovacao_hora_envio          TIME DEFAULT '08:00',
  aprovacao_deadline_hora       TIME DEFAULT '22:00',
  fallback_sem_aprovacao        TEXT DEFAULT 'postar_automatico'
    CHECK (fallback_sem_aprovacao IN ('postar_automatico','pausar_semana','usar_semana_anterior')),
  horario_preferido_post        TIME DEFAULT '08:00',
  dias_post_semana              INTEGER[] DEFAULT '{1,3,5}',
  frequencia_stories            TEXT DEFAULT 'diario',
  frequencia_reels              TEXT DEFAULT 'semanal',
  faz_anuncio_pago              BOOLEAN DEFAULT FALSE,
  budget_anuncio_mensal         DECIMAL(10,2),
  objetivo_anuncio              TEXT,
  link_cta_anuncio              TEXT,
  tipo_cta_anuncio              TEXT CHECK (tipo_cta_anuncio IN ('whatsapp_sofia','whatsapp_direto','landing_page','agendamento')),
  texto_cta_botao               TEXT DEFAULT 'Falar agora',
  mensagem_inicial_whatsapp     TEXT,
  instagram_access_token        TEXT,
  instagram_token_expiry        TIMESTAMPTZ,
  meta_ads_access_token         TEXT,
  meta_ads_account_id           TEXT,
  meta_ads_token_expiry         TIMESTAMPTZ,
  bannerbear_project_id         TEXT,
  onboarding_completo           BOOLEAN DEFAULT FALSE,
  onboarding_percentual         INTEGER DEFAULT 0,
  nota_interna_admin            TEXT,
  responsavel_admin             TEXT DEFAULT 'aline',
  data_inicio_servico           DATE,
  data_proxima_revisao          DATE,
  notificacao_canais            TEXT[] DEFAULT '{email}'
);

CREATE INDEX idx_franqueadas_status ON franqueadas(status);
CREATE INDEX idx_franqueadas_auth_user ON franqueadas(auth_user_id);

CREATE TABLE arquivos_franqueada (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id        UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  tipo                 TEXT NOT NULL,
  nome_arquivo         TEXT NOT NULL,
  url_storage          TEXT NOT NULL,
  tamanho_bytes        INTEGER,
  formato              TEXT,
  largura_px           INTEGER,
  altura_px            INTEGER,
  fundo_transparente   BOOLEAN,
  descricao            TEXT,
  aprovado_admin       BOOLEAN DEFAULT FALSE,
  criado_em            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_arquivos_franqueada ON arquivos_franqueada(franqueada_id, tipo);

CREATE OR REPLACE FUNCTION tg_set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_franqueadas_atualizado
  BEFORE UPDATE ON franqueadas
  FOR EACH ROW EXECUTE FUNCTION tg_set_atualizado_em();
