-- ============================================================
-- Nutri Video AI (packages/video-ai): registro dos LoRAs treinados na fal.ai
-- e histórico dos clipes gerados. Studio Aline, uso de uma dona só.
-- Aditiva: tabelas novas no schema aline, zero toque em tabela existente.
-- Pode aplicar antes ou depois de qualquer deploy (o CLI é local e trata a
-- tabela ausente como aviso, não como erro: loras.json é a fonte de verdade).
-- O bucket privado `video-ai` é criado pelo próprio CLI (service role).
-- ============================================================

CREATE TABLE IF NOT EXISTS aline.video_loras (
  id                  UUID PRIMARY KEY,
  nome                TEXT NOT NULL,
  dataset             TEXT NOT NULL,              -- receitas | ciencia | ...
  modo                TEXT NOT NULL CHECK (modo IN ('t2v', 'i2v')),
  passos              INTEGER NOT NULL,
  learning_rate       NUMERIC(8,6) NOT NULL,
  trigger             TEXT NOT NULL,              -- frase-gatilho usada nas legendas
  lora_url            TEXT NOT NULL,              -- lora_file.url devolvido pela fal
  lora_storage_path   TEXT,                       -- cópia em video-ai/loras/<nome>.safetensors
  config_url          TEXT,
  request_id          TEXT NOT NULL,
  custo_estimado_usd  NUMERIC(10,2) NOT NULL DEFAULT 0,
  pacote_url          TEXT,                       -- zip do dataset que treinou
  aprovado            BOOLEAN NOT NULL DEFAULT FALSE,  -- a Aline marca depois do grid de teste
  observacoes         TEXT,
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS video_loras_dataset_idx ON aline.video_loras (dataset, criado_em DESC);

-- Fase 2 (geração) grava aqui: uma linha por clipe, com prompt, seed e custo.
CREATE TABLE IF NOT EXISTS aline.video_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lora_id           UUID REFERENCES aline.video_loras(id) ON DELETE SET NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('receita', 'ciencia')),
  modo              TEXT NOT NULL CHECK (modo IN ('t2v', 'i2v')),
  formato           TEXT NOT NULL CHECK (formato IN ('9:16', '16:9')),
  prompt            TEXT NOT NULL,
  negative_prompt   TEXT,
  imagem_url        TEXT,                        -- só no i2v
  seed              BIGINT,
  request_id        TEXT,
  status            TEXT NOT NULL DEFAULT 'na_fila' CHECK (status IN ('na_fila', 'gerando', 'pronto', 'erro')),
  video_url         TEXT,
  video_storage_path TEXT,
  custo_usd         NUMERIC(10,4),
  erro              TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concluido_em      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS video_jobs_criado_idx ON aline.video_jobs (criado_em DESC);

ALTER TABLE aline.video_loras ENABLE ROW LEVEL SECURITY;
ALTER TABLE aline.video_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aline_video_loras_admin" ON aline.video_loras;
CREATE POLICY "aline_video_loras_admin" ON aline.video_loras FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND papel = 'super_admin')
);
DROP POLICY IF EXISTS "aline_video_jobs_admin" ON aline.video_jobs;
CREATE POLICY "aline_video_jobs_admin" ON aline.video_jobs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admins WHERE auth_user_id = auth.uid() AND papel = 'super_admin')
);

COMMENT ON TABLE aline.video_loras IS 'LoRAs de estilo (Wan 2.2, fal.ai) treinados pelo CLI packages/video-ai. Espelho de loras.json do repo.';
COMMENT ON TABLE aline.video_jobs IS 'Clipes gerados pelo pipeline Nutri Video AI (Fase 2). Prompt, seed e custo por clipe.';
