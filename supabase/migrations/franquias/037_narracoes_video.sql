-- ============================================================
-- MIGRATION 037: Narração gravada por cima do vídeo (Aline, 13/10/2026)
-- ============================================================
-- A profissional grava a própria voz por cima do vídeo animado (ou de um
-- vídeo da metodologia que vem sem voz), lendo o roteiro em karaokê. O áudio
-- sobe pro bucket `franqueadas-assets` e o worker narrar-video.yml junta voz
-- e vídeo com ffmpeg (sem modelo nenhum, custo zero de IA).
--
-- `reels_animados.spec` guarda o roteiro (as cenas com a duração de cada
-- uma) que antes era jogado fora depois do render: é ele que dá o ritmo do
-- karaokê. Reel antigo fica com spec nulo e grava sem o texto.
--
-- Aditiva. Rodar de novo é seguro (IF NOT EXISTS).

ALTER TABLE reels_animados ADD COLUMN IF NOT EXISTS spec JSONB;

CREATE TABLE IF NOT EXISTS narracoes_video (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id   UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  origem          TEXT NOT NULL CHECK (origem IN ('reel', 'metodologia')),
  ref             TEXT NOT NULL,           -- id do reel ou id do vídeo da metodologia
  audio_path      TEXT,                    -- voz gravada (franqueadas-assets)
  audio_mime      TEXT,
  atraso_ms       INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'enviando'
                  CHECK (status IN ('enviando', 'montando', 'pronto', 'erro')),
  erro_msg        TEXT,
  path            TEXT,                    -- MP4 com a voz (franqueadas-assets)
  url             TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_narracoes_video_ref
  ON narracoes_video(franqueada_id, origem, ref, criado_em DESC);

ALTER TABLE narracoes_video ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'narracoes_video' AND policyname = 'narracoes_video_own') THEN
    CREATE POLICY "narracoes_video_own" ON narracoes_video FOR ALL
      USING (
        franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
        OR is_admin()
      );
  END IF;
END $$;
