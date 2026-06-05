-- 022_ads_automacao.sql
-- Suporte ao gestor de tráfego Meta Ads completamente automatizado.
--
-- 1. Novos status no fluxo automático:
--    - criativo_aprovado: nutri aprovou um criativo, aguardando o cron lançar a campanha
--    - lancando: cron está no meio do pipeline de criação Meta API (lock transitório)
-- 2. Colunas pra rastrear os públicos Meta criados automaticamente.
-- 3. Índice pra o cron criar-campanhas achar rápido o que lançar.

-- 1. Atualizar CHECK de status (drop + recreate, nome do constraint pode variar)
ALTER TABLE anuncios DROP CONSTRAINT IF EXISTS anuncios_status_check;

ALTER TABLE anuncios
  ADD CONSTRAINT anuncios_status_check CHECK (status IN (
    'rascunho',
    'aguardando_aprovacao',
    'criativo_aprovado',
    'lancando',
    'ativo',
    'pausado',
    'pausado_pela_nutri',
    'pausado_pelo_budget_cap',
    'pausado_por_performance_ruim',
    'encerrado'
  ));

-- 2. Novas colunas
ALTER TABLE anuncios
  ADD COLUMN IF NOT EXISTS meta_audience_id     TEXT,
  ADD COLUMN IF NOT EXISTS meta_lookalike_id    TEXT,
  ADD COLUMN IF NOT EXISTS criativo_aprovado_em TIMESTAMPTZ;

-- 3. Índice pro cron de lançamento (busca status='criativo_aprovado')
CREATE INDEX IF NOT EXISTS idx_anuncios_criativo_aprovado
  ON anuncios (status)
  WHERE status = 'criativo_aprovado';

-- 4. Colunas extras no audit log pra rastrear ações automáticas Meta
ALTER TABLE ads_audit_log
  ADD COLUMN IF NOT EXISTS meta_campaign_id TEXT,
  ADD COLUMN IF NOT EXISTS detalhes         JSONB;

-- 5. Novo ator no audit log: agente revisor IA auto-executa pausas/ajustes de budget
ALTER TABLE ads_audit_log DROP CONSTRAINT IF EXISTS ads_audit_log_ator_check;
ALTER TABLE ads_audit_log
  ADD CONSTRAINT ads_audit_log_ator_check CHECK (ator IN (
    'nutri',
    'admin',
    'sistema_cron',
    'sistema_kill_switch',
    'agente_revisor_ia'
  ));
