-- Adiciona colunas para token OAuth do Meta Ads por franqueada
-- Permite que o agente de tráfego gerencie campanhas em nome da franqueada

ALTER TABLE franqueadas
  ADD COLUMN IF NOT EXISTS meta_ads_access_token TEXT,
  ADD COLUMN IF NOT EXISTS meta_ads_token_expiry TIMESTAMPTZ;
