-- ============================================================
-- MIGRATION 011: Integracao cross-projeto Scanner SaaS ↔ Marketing
-- ============================================================
-- A tela de admin do Scanner SaaS gerencia o mapeamento nutri → produto
-- Kiwify. Quando a Aline salva ID lá, webhook sincroniza pro Marketing
-- (endpoint /api/webhooks/scanner-saas/produto-kiwify-sync).
--
-- Marketing guarda localmente pra resolver franqueada no webhook Kiwify
-- sem precisar de lookup sincrono cross-DB a cada venda.
--
-- Tambem adiciona tabela franquia_onboardings que recebe upgrade "virar
-- franqueada" do SaaS (via /api/onboarding/iniciar).

-- =============== kiwify_product_id na tabela franqueadas ===============
ALTER TABLE franqueadas
  ADD COLUMN IF NOT EXISTS kiwify_product_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS scanner_saas_user_id TEXT,
  ADD COLUMN IF NOT EXISTS exame_precisao_ativo BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kiwify_product_synced_em TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_franqueadas_kiwify_product
  ON franqueadas(kiwify_product_id) WHERE kiwify_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_franqueadas_scanner_saas_user
  ON franqueadas(scanner_saas_user_id) WHERE scanner_saas_user_id IS NOT NULL;

-- =============== franquia_onboardings ===============
-- Tabela que recebe POST /api/onboarding/iniciar do Scanner SaaS
-- quando uma nutri clica "Virar franqueada" no painel dela.
CREATE TABLE IF NOT EXISTS franquia_onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  scanner_user_id TEXT NOT NULL UNIQUE,     -- id da nutri no Scanner SaaS
  onboarding_token TEXT UNIQUE NOT NULL,    -- UUID vindo do SaaS
  franqueada_id UUID REFERENCES franqueadas(id) ON DELETE SET NULL,

  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  whatsapp TEXT,
  plano_anterior TEXT,                      -- 'premium' | 'basico' etc

  status TEXT DEFAULT 'token_gerado' CHECK (status IN (
    'token_gerado',
    'email_enviado',
    'onboarding_iniciado',
    'onboarding_concluido',
    'cancelado'
  )),

  email_enviado_em TIMESTAMPTZ,
  onboarding_iniciado_em TIMESTAMPTZ,
  onboarding_concluido_em TIMESTAMPTZ,

  origem_payload JSONB,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_franquia_onboardings_token
  ON franquia_onboardings(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_franquia_onboardings_status
  ON franquia_onboardings(status, criado_em DESC);

COMMENT ON TABLE franquia_onboardings IS
  'Recebe upgrade "virar franqueada" do Scanner SaaS. Token permite acesso ao onboarding sem reauth.';
COMMENT ON COLUMN franqueadas.kiwify_product_id IS
  'Sincronizado via webhook do Scanner SaaS quando nutri salva ID la.';
