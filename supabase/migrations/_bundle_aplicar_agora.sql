-- ============================================================
-- BUNDLE — aplicar TODAS as novas migrations de uma vez
-- ============================================================
-- Gerado automaticamente pela sessão de build dos agentes.
-- 6 migrations franquias (006-010) + 3 aline (002-004).
--
-- COMO USAR:
--   1. Abra o Supabase Dashboard → seu projeto
--   2. Vá em "SQL Editor" (ícone no menu esquerdo)
--   3. Clique "New query"
--   4. Copie TUDO deste arquivo e cole lá
--   5. Clique "Run" (ou Ctrl+Enter)
--   6. Confirme que retornou "Success" sem erros
--
-- IMPORTANTE: rode apenas 1 vez. Se já aplicou parcialmente antes,
-- pode dar erro em policies duplicadas — nesse caso, aplicar
-- arquivo por arquivo é mais seguro.
-- ============================================================



-- =====================================================
-- supabase/migrations/franquias/006_diagnosticos_perfil.sql
-- =====================================================
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


-- =====================================================
-- supabase/migrations/franquias/007_auditorias_conteudo.sql
-- =====================================================
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


-- =====================================================
-- supabase/migrations/franquias/008_storytelling.sql
-- =====================================================
-- ============================================================
-- MIGRATION 008: Storytelling (Skill 6) — Franquias
-- ============================================================
-- Depoimentos coletados via UI + storytellings gerados pelo Agente.
-- Alimenta orgânico (posts) e ads (copy de anúncio com história real).

-- =============== DEPOIMENTOS ===============
CREATE TABLE IF NOT EXISTS depoimentos_franqueada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,

  titulo TEXT NOT NULL,
  quem_era TEXT,                      -- "Marina, 42, histórico familiar de diabetes"
  problema_inicial TEXT NOT NULL,
  ponto_ruptura TEXT,
  solucao_aplicada TEXT NOT NULL,
  resultado TEXT NOT NULL,
  objecoes_relatadas TEXT,

  anonimo BOOLEAN DEFAULT TRUE,
  idade_aproximada INTEGER,
  genero TEXT,
  regiao TEXT,

  autorizacao_uso BOOLEAN DEFAULT TRUE,
  fonte TEXT DEFAULT 'relato_nutri'
    CHECK (fonte IN ('relato_nutri', 'screenshot_whatsapp', 'video', 'audio')),
  midia_url TEXT,

  usado_em_posts JSONB DEFAULT '[]'::jsonb,
  usado_em_ads JSONB DEFAULT '[]'::jsonb,

  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_depoimentos_franqueada
  ON depoimentos_franqueada(franqueada_id, ativo);

ALTER TABLE depoimentos_franqueada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada CRUD proprios depoimentos"
  ON depoimentos_franqueada FOR ALL
  USING (
    franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admin ve todos"
  ON depoimentos_franqueada FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

-- =============== STORYTELLINGS GERADOS ===============
-- Guarda output do Agente (modos 6a/6b/6c) pra reuso
CREATE TABLE IF NOT EXISTS storytellings_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  depoimento_id UUID REFERENCES depoimentos_franqueada(id) ON DELETE SET NULL,

  modo TEXT NOT NULL CHECK (modo IN ('6a_depoimento', '6b_publico_se_ve', '6c_ideia_historia')),

  -- Input do usuário (pra auditoria)
  input JSONB NOT NULL,

  -- Output do Claude (estrutura varia por modo)
  output JSONB NOT NULL,

  -- Versões extraídas (busca rápida)
  versao_post_longo TEXT,
  versao_post_curto TEXT,
  versao_reels_script TEXT,
  versao_ad_125 TEXT,

  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  status TEXT DEFAULT 'novo'
    CHECK (status IN ('novo', 'aprovado', 'postado', 'usado_em_ad', 'descartado')),

  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storytellings_franqueada
  ON storytellings_gerados(franqueada_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_storytellings_modo
  ON storytellings_gerados(modo);

ALTER TABLE storytellings_gerados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada ve proprio storytelling"
  ON storytellings_gerados FOR SELECT
  USING (
    franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admin ve todos"
  ON storytellings_gerados FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

COMMENT ON TABLE depoimentos_franqueada IS
  'Casos/depoimentos coletados pela nutri. Alimenta Skill 6a.';
COMMENT ON TABLE storytellings_gerados IS
  'Output da Skill 6 (3 modos). Reuso entre organico e ads.';


-- =====================================================
-- supabase/migrations/franquias/009_planejamentos_estrategicos.sql
-- =====================================================
-- ============================================================
-- MIGRATION 009: Planejamentos Estrategicos (Skills 2, 3, 5)
-- ============================================================
-- Consolidados numa tabela unica (tipo=skill_2/3/5) porque sao skills
-- de cadencia trimestral, output muito diferente mas natureza igual:
-- planejamento estrategico que vive por meses e informa decisoes.

CREATE TABLE IF NOT EXISTS planejamentos_estrategicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,

  tipo TEXT NOT NULL CHECK (tipo IN (
    'skill_2_mecanismo_unico',
    'skill_3_posicionamento_oferta',
    'skill_5_funil_organico'
  )),

  input JSONB NOT NULL,
  output JSONB NOT NULL,

  -- Campo extra especifico pro skill 2: qual dos 10 mecanismos foi eleito vencedor
  mecanismo_eleito TEXT,

  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  status TEXT DEFAULT 'novo'
    CHECK (status IN ('novo', 'visualizado', 'em_uso', 'arquivado')),
  vigente_ate DATE,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planejamentos_franqueada_tipo
  ON planejamentos_estrategicos(franqueada_id, tipo, criado_em DESC);

ALTER TABLE planejamentos_estrategicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franqueada ve e atualiza proprio planejamento"
  ON planejamentos_estrategicos FOR ALL
  USING (
    franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admin ve tudo"
  ON planejamentos_estrategicos FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

COMMENT ON TABLE planejamentos_estrategicos IS
  'Skills 2 (Mecanismo), 3 (Posicionamento+Oferta), 5 (Funil) do Agente Organico. Cadencia trimestral.';


-- =====================================================
-- supabase/migrations/franquias/010_anuncios_completo.sql
-- =====================================================
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


-- =====================================================
-- supabase/migrations/aline/002_diagnosticos_depoimentos.sql
-- =====================================================
-- ============================================================
-- MIGRATION 002 (aline): Skill 1 (Diagnóstico) + campos complementares
-- ============================================================
-- - Campos novos em aline.perfis (bio_atual, historia_pessoal)
-- - Nova tabela aline.diagnosticos_perfil (espelho do public.diagnosticos_perfil)
-- - Nova tabela aline.depoimentos (alimenta Skill 6 - Storytelling)

-- Campos novos em perfis
ALTER TABLE aline.perfis
  ADD COLUMN IF NOT EXISTS bio_atual           TEXT,
  ADD COLUMN IF NOT EXISTS historia_pessoal    TEXT,
  ADD COLUMN IF NOT EXISTS valor_consulta      DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS valor_teste         DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS publico_alvo        TEXT,
  ADD COLUMN IF NOT EXISTS diferenciais        TEXT,
  ADD COLUMN IF NOT EXISTS nicho_principal     TEXT,
  ADD COLUMN IF NOT EXISTS palavras_chave      TEXT[],
  ADD COLUMN IF NOT EXISTS palavras_evitar     TEXT,
  ADD COLUMN IF NOT EXISTS paleta_cores        JSONB,
  ADD COLUMN IF NOT EXISTS sistema_cor_regra   TEXT;

-- =============== CORES CORRETAS DOS 2 PERFIS ===============
-- Scanner da Saúde: paleta multicolor sólida (cores da logo S)
-- Nutri Secrets: verde tiffany da logo + magenta contrastante
--
-- IMPORTANTE: cor_primaria passa a ser o DEFAULT (1ª escolha)
-- e paleta_cores lista as opções pra rotacionar por post/peça.

UPDATE aline.perfis
  SET nicho_principal     = 'medicina_precisao_saas_nutricionistas',
      publico_alvo        = 'Nutricionistas clinicas brasileiras que querem escalar consultorio digital',
      cor_primaria        = '#8B5CF6',
      cor_secundaria      = '#3B82F6',
      paleta_cores        = '[
        {"nome": "roxo",    "hex": "#8B5CF6", "uso": "educacao_precisao"},
        {"nome": "azul",    "hex": "#3B82F6", "uso": "bastidores_software"},
        {"nome": "tiffany", "hex": "#14B8A6", "uso": "transformacao_carreira"},
        {"nome": "amarelo", "hex": "#FBBF24", "uso": "prova_social"},
        {"nome": "vermelho","hex": "#EF4444", "uso": "venda_direta"},
        {"nome": "magenta", "hex": "#D946EF", "uso": "bonus_variacao"}
      ]'::jsonb,
      sistema_cor_regra   = 'rotaciona por pilar de conteudo: cada pilar tem uma cor dominante; sempre fundo claro/branco, cor em blocos solidos de destaque (faixas, numeros grandes, backgrounds de bullets)'
  WHERE slug = 'scannerdasaude';

UPDATE aline.perfis
  SET nicho_principal     = 'nutricao_de_precisao_e_nutrigenetica',
      publico_alvo        = 'Mulheres 30-55 preocupadas com saude preventiva; profissionais de saude',
      valor_consulta      = 650,
      valor_teste         = 1800,
      cor_primaria        = '#0D9488',
      cor_secundaria      = '#D946EF',
      paleta_cores        = '[
        {"nome": "tiffany_escuro", "hex": "#0D9488", "uso": "primaria_dominante"},
        {"nome": "magenta",        "hex": "#D946EF", "uso": "contraste_destaque"},
        {"nome": "creme",          "hex": "#FAF6F0", "uso": "fundo_editorial"}
      ]'::jsonb,
      sistema_cor_regra   = 'primaria verde tiffany dominante, magenta usado com parcimonia (CTAs, bullets, numeros) para contraste editorial; fundo creme neutro'
  WHERE slug = 'nutrisecrets';

-- =============== DIAGNÓSTICOS ===============
CREATE TABLE IF NOT EXISTS aline.diagnosticos_perfil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,

  diagnostico_primeira_impressao TEXT,
  clareza_posicionamento TEXT,
  linha_editorial_atual TEXT,

  forcas JSONB DEFAULT '[]'::jsonb,
  fraquezas JSONB DEFAULT '[]'::jsonb,
  gargalos_crescimento JSONB DEFAULT '[]'::jsonb,
  gargalos_conversao JSONB DEFAULT '[]'::jsonb,
  erros_percepcao JSONB DEFAULT '[]'::jsonb,
  oportunidades_rapidas JSONB DEFAULT '[]'::jsonb,
  ideias_reposicionamento JSONB DEFAULT '[]'::jsonb,

  sugestoes_bio JSONB DEFAULT '[]'::jsonb,
  sugestoes_destaques JSONB DEFAULT '[]'::jsonb,
  sugestoes_linha_editorial TEXT,

  mudancas_priorizadas JSONB DEFAULT '[]'::jsonb,

  fonte_dados_ig JSONB,
  fonte_dados_perfil JSONB,

  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  status TEXT DEFAULT 'novo'
    CHECK (status IN ('novo', 'visualizado', 'aprovado', 'editado', 'descartado')),
  feedback TEXT,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  visualizado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_aline_diag_perfil
  ON aline.diagnosticos_perfil(perfil_id, criado_em DESC);

-- =============== DEPOIMENTOS ===============
-- Alimenta Skill 6 (Storytelling + Prova Social).
-- Pode ser caso da própria nutri/marca ou depoimento anônimo.
CREATE TABLE IF NOT EXISTS aline.depoimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,

  titulo TEXT NOT NULL,
  quem_era TEXT,                      -- "Marina, 42, executiva com diabetes familiar"
  problema_inicial TEXT NOT NULL,     -- situação antes
  ponto_ruptura TEXT,                 -- o que fez procurar
  solucao_aplicada TEXT NOT NULL,     -- o que foi feito (protocolo genérico, sem prescrição)
  resultado TEXT NOT NULL,            -- transformação (sem peso/medida especifica, respeita CFN)
  objecoes_relatadas TEXT,            -- objeções que a paciente tinha

  anonimo BOOLEAN DEFAULT TRUE,
  idade_aproximada INTEGER,
  genero TEXT,
  regiao TEXT,

  autorizacao_uso BOOLEAN DEFAULT TRUE,
  fonte TEXT DEFAULT 'relato_nutri'
    CHECK (fonte IN ('relato_nutri', 'screenshot_whatsapp', 'video', 'audio')),
  midia_url TEXT,

  usado_em_posts JSONB DEFAULT '[]'::jsonb,
  usado_em_ads JSONB DEFAULT '[]'::jsonb,

  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aline_depo_perfil
  ON aline.depoimentos(perfil_id, ativo);

COMMENT ON TABLE aline.diagnosticos_perfil IS
  'Skill 1 do Agente Organico: diagnostico estrategico por perfil.';
COMMENT ON TABLE aline.depoimentos IS
  'Skill 6 do Agente Organico: casos/depoimentos para storytelling.';


-- =====================================================
-- supabase/migrations/aline/003_auditorias_conteudo.sql
-- =====================================================
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


-- =====================================================
-- supabase/migrations/aline/004_storytellings_gerados.sql
-- =====================================================
-- ============================================================
-- MIGRATION 004 (aline): Skill 6 — Storytellings gerados
-- ============================================================
-- aline.depoimentos já existe (criada na migration 002).
-- Aqui adiciona aline.storytellings_gerados pra guardar output da Skill 6.

CREATE TABLE IF NOT EXISTS aline.storytellings_gerados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  depoimento_id UUID REFERENCES aline.depoimentos(id) ON DELETE SET NULL,

  modo TEXT NOT NULL CHECK (modo IN ('6a_depoimento', '6b_publico_se_ve', '6c_ideia_historia')),

  input JSONB NOT NULL,
  output JSONB NOT NULL,

  versao_post_longo TEXT,
  versao_post_curto TEXT,
  versao_reels_script TEXT,
  versao_ad_125 TEXT,

  ia_modelo TEXT,
  ia_tokens_input INTEGER,
  ia_tokens_output INTEGER,
  ia_tokens_cached INTEGER,
  ia_custo_usd DECIMAL(10, 4),
  latencia_ms INTEGER,

  status TEXT DEFAULT 'novo'
    CHECK (status IN ('novo', 'aprovado', 'postado', 'usado_em_ad', 'descartado')),

  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aline_storytellings_perfil
  ON aline.storytellings_gerados(perfil_id, criado_em DESC);

COMMENT ON TABLE aline.storytellings_gerados IS
  'Skill 6: output dos 3 modos de storytelling. Reuso entre organico e ads.';

