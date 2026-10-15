-- ============================================================
-- MIGRATION 040: Vídeos animados na marca da profissional (Aline, 15/10/2026)
-- ============================================================
-- Moldes do Claude Design em apps/franquias/public/videos-marca/. O worker
-- render-video-marca.yml abre o molde com a cor e a logo dela e grava o MP4
-- no bucket franqueadas-assets. Uma linha por (profissional, vídeo,
-- assinatura): mudou a cor, a logo ou a versão do molde, nasce outra linha.
--
-- A narração por cima ganha a origem 'marca' (ref = id do vídeo).
-- Aditiva. Rodar de novo é seguro.

CREATE TABLE IF NOT EXISTS videos_marca (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id   UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  video_id        TEXT NOT NULL,
  assinatura      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'gerando'
                  CHECK (status IN ('gerando', 'pronto', 'erro')),
  path            TEXT,
  url             TEXT,
  erro_msg        TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_marca_franqueada
  ON videos_marca(franqueada_id, video_id, criado_em DESC);

ALTER TABLE videos_marca ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'videos_marca' AND policyname = 'videos_marca_own_select') THEN
    CREATE POLICY "videos_marca_own_select" ON videos_marca FOR SELECT
      USING (
        franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
        OR is_admin()
      );
  END IF;
END $$;

ALTER TABLE narracoes_video DROP CONSTRAINT IF EXISTS narracoes_video_origem_check;
ALTER TABLE narracoes_video ADD CONSTRAINT narracoes_video_origem_check
  CHECK (origem IN ('reel', 'metodologia', 'marca'));
