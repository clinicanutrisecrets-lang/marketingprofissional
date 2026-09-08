-- ============================================================
-- Robô do Instagram: botões também nos PASSOS de sequência (o "Sim, quero /
-- Só o protocolo" do follow-up de 23h do fluxo GLP1), e a fila carrega os
-- botões do passo pra mandar junto.
-- Aditiva. Pode aplicar antes ou depois do deploy.
-- ============================================================
ALTER TABLE aline.ig_sequencia_passos
  ADD COLUMN IF NOT EXISTS opcoes JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE aline.ig_fila
  ADD COLUMN IF NOT EXISTS passo_id UUID REFERENCES aline.ig_sequencia_passos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opcoes JSONB;
