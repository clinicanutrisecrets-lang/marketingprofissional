-- Migration 020: colunas para integração sem App Review da Meta
-- Publer: agendamento orgânico
-- Meta BM: ad accounts e vinculação de página

ALTER TABLE franqueadas
  ADD COLUMN IF NOT EXISTS facebook_pagina_url    TEXT,
  ADD COLUMN IF NOT EXISTS publer_workspace_id    TEXT,
  ADD COLUMN IF NOT EXISTS publer_profile_id      TEXT,
  ADD COLUMN IF NOT EXISTS meta_ads_account_id    TEXT,
  ADD COLUMN IF NOT EXISTS meta_ads_account_name  TEXT,
  ADD COLUMN IF NOT EXISTS meta_page_access_status TEXT DEFAULT 'pendente';
  -- pendente | solicitado | aceito
