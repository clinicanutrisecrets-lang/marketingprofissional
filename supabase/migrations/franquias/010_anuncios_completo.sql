-- ============================================================
-- MIGRATION 010: Anuncios (Meta Ads) + Conversoes + Audit + Budget Caps
-- ============================================================
-- Bloqueador antigo: codigo em /lib/anuncios/actions.ts referencia
-- tabela 'anuncios' que nunca foi criada em migration. Agora cria.
--
-- Inclui tambem tabelas auxiliares do Agente de Ads:
--   conversoes_registradas: eventos Schedule (R$650) e Purchase (R$1.800)
--     enviados via Conversions API pro Meta
--   ads_audit_log: quem mexeu, quando, o que fez
-- E campos de guarda-rail em franqueadas:
--   budget_diario_maximo: cap duro diario
--   budget_alerta_percentual: em que % do mes alertar (default 80)

-- =============== BUDGET CAPS EM FRANQUEADAS ===============
ALTER TABLE franqueadas
  ADD COLUMN IF NOT EXISTS budget_diario_maximo       DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS budget_alerta_percentual   INTEGER DEFAULT 80;

-- =============== ANUNCIOS (tabela principal) ===============
CREATE TABLE IF NOT EXISTS anuncios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,

  nome TEXT NOT NULL,
  tema_criativo TEXT,
  funil_destino_id UUID,

  -- Mapeamento Meta
  objetivo_negocio TEXT,
  meta_objective TEXT,
  meta_optimization TEXT,
  meta_destination TEXT,
  meta_campaign_id TEXT,
  meta_adset_id TEXT,
  meta_ad_id TEXT,

  status TEXT DEFAULT 'rascunho' CHECK (status IN (
    'rascunho',
    'aguardando_aprovacao',
    'ativo',
    'pausado',
    'pausado_pela_nutri',
    'pausado_pelo_budget_cap',
    'pausado_por_performance_ruim',
    'encerrado'
  )),
  pausado_automaticamente BOOLEAN DEFAULT FALSE,
  motivo_pausa TEXT,
  pausado_em TIMESTAMPTZ,

  -- Publico e criativo
  publico_descricao TEXT,
  publico_meta_json JSONB,
  copy_headline TEXT,
  copy_texto TEXT,
  copy_cta_botao TEXT,
  url_midia TEXT,
  url_destino TEXT,

  -- 3 variacoes A/B (geradas pelo agente)
  variacoes JSONB,              -- [{headline, primary_text, eyebrow}]
  variacao_vencedora INTEGER,   -- indice da vencedora (1-3)

  -- Budget
  budget_diario DECIMAL(10, 2),
  budget_total DECIMAL(10, 2),
  data_inicio DATE,
  data_fim DATE,

  -- Metricas coletadas pelo cron
  gasto_total DECIMAL(10, 2) DEFAULT 0,
  gasto_hoje DECIMAL(10, 2) DEFAULT 0,
  impressoes INTEGER DEFAULT 0,
  cliques INTEGER DEFAULT 0,
  ctr DECIMAL(5, 2),
  cpm DECIMAL(10, 2),
  frequency DECIMAL(5, 2),
  leads INTEGER DEFAULT 0,
  cpl DECIMAL(10, 2),
  schedules INTEGER DEFAULT 0,      -- consultas agendadas via Sofia
  purchases INTEGER DEFAULT 0,      -- testes comprados no Kiwify
  valor_schedules DECIMAL(10, 2) DEFAULT 0,
  valor_purchases DECIMAL(10, 2) DEFAULT 0,
  roas DECIMAL(10, 2),
  avaliacao_vs_benchmark TEXT,

  ultima_coleta_metricas TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anuncios_franqueada_status
  ON anuncios(franqueada_id, status);
CREATE INDEX IF NOT EXISTS idx_anuncios_meta_campaign
  ON anuncios(meta_campaign_id) WHERE meta_campaign_id IS NOT NULL;

ALTER TABLE anuncios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada CRUD proprios anuncios"
  ON anuncios FOR ALL
  USING (franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admin ve todos"
  ON anuncios FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

CREATE POLICY "Admin atualiza qualquer anuncio"
  ON anuncios FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

-- =============== CONVERSOES REGISTRADAS ===============
-- Audit trail de tudo que foi enviado pra CAPI + reconciliacao
-- com webhook Kiwify (event_id dedupavel).
CREATE TABLE IF NOT EXISTS conversoes_registradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  anuncio_id UUID REFERENCES anuncios(id) ON DELETE SET NULL,

  tipo TEXT NOT NULL CHECK (tipo IN (
    'Lead',           -- clicou no CTA WhatsApp
    'Schedule',       -- Sofia/secretaria marcou consulta R$650
    'InitiateCheckout', -- Sofia enviou link Kiwify
    'Purchase'        -- Kiwify webhook confirmou compra R$1800
  )),

  event_id TEXT UNIQUE NOT NULL,  -- UUID pra dedup com pixel
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value DECIMAL(10, 2),
  currency TEXT DEFAULT 'BRL',

  -- Identificadores pra matching server-side
  fbclid TEXT,
  fbp TEXT,
  email_hash TEXT,           -- SHA256
  phone_hash TEXT,           -- SHA256
  external_id_hash TEXT,     -- SHA256 (email ou user_id)

  -- Contexto do origem
  origem TEXT NOT NULL CHECK (origem IN ('sofia', 'kiwify_webhook', 'admin_manual', 'pixel_client')),
  payload_origem JSONB,      -- webhook completo pra auditoria

  -- Status do envio pro Meta
  capi_enviado BOOLEAN DEFAULT FALSE,
  capi_resposta JSONB,
  capi_erro TEXT,
  capi_tentativas INTEGER DEFAULT 0,

  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversoes_franqueada_tipo
  ON conversoes_registradas(franqueada_id, tipo, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_conversoes_anuncio
  ON conversoes_registradas(anuncio_id) WHERE anuncio_id IS NOT NULL;

-- =============== ADS AUDIT LOG ===============
-- Toda acao em anuncios (pausa, reativa, ajusta budget, cria) fica auditada.
CREATE TABLE IF NOT EXISTS ads_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  anuncio_id UUID REFERENCES anuncios(id) ON DELETE SET NULL,
  ator TEXT NOT NULL CHECK (ator IN ('nutri', 'admin', 'sistema_cron', 'sistema_kill_switch')),
  ator_user_id UUID,
  acao TEXT NOT NULL,         -- 'criar', 'pausar', 'reativar', 'ajustar_budget', 'kill_switch', 'pausa_auto_cpl', 'pausa_auto_budget'
  estado_antes JSONB,
  estado_depois JSONB,
  motivo TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_franqueada
  ON ads_audit_log(franqueada_id, criado_em DESC);

COMMENT ON TABLE anuncios IS 'Campanhas Meta Ads — gerenciadas pelo Agente de Ads.';
COMMENT ON TABLE conversoes_registradas IS 'Eventos Lead/Schedule/Purchase enviados via Conversions API pro Meta.';
COMMENT ON TABLE ads_audit_log IS 'Audit trail — quem, quando, o que fez em anuncios.';
