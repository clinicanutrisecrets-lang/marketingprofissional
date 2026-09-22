-- ============================================================
-- MIGRATION 028: vídeo curto = clipe da biblioteca + frase em cima
-- ============================================================
-- Pedido da Aline (22/09/2026): "fazer aqueles vídeos curtinhos que é só o
-- vídeo com uma escrita em cima, que está na moda".
--
-- O corte de sempre parte de uma gravação COM FALA (a legenda sai da
-- transcrição). Aqui não há fala: o texto é a frase que ela escreveu e o
-- vídeo é um clipe que já está na biblioteca dela (ou no acervo
-- compartilhado). Por isso `modo`: o worker desvia pro renderizador próprio
-- (packages/corte-ia/clipe_frase.py) e pula transcrição, limpeza e plano.
--
-- 🔴 GUARDAMOS O ID DO CLIPE, NUNCA A URL. O worker resolve a URL em
-- `videos_franqueada`/`acervo_videos` e confere de quem é. Aceitar URL vinda
-- da tela faria o worker baixar qualquer endereço que alguém mandasse.
--
-- Tudo aditivo: `modo` nasce 'fala' e as linhas que já existem seguem
-- idênticas. `origem_path` passa a aceitar NULL porque no modo clipe não há
-- gravação enviada — nenhuma linha existente é afetada, e o código que já
-- está no ar sempre preenche o campo.
--
-- Segura de aplicar ANTES do deploy: coluna nova com default é invisível pro
-- código antigo, e afrouxar NOT NULL não quebra insert que já preenche.

ALTER TABLE cortes_ia
  ADD COLUMN IF NOT EXISTS modo TEXT NOT NULL DEFAULT 'fala',
  ADD COLUMN IF NOT EXISTS frase TEXT,
  ADD COLUMN IF NOT EXISTS clipe_video_id UUID,
  ADD COLUMN IF NOT EXISTS clipe_origem TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cortes_ia_modo_check'
  ) THEN
    ALTER TABLE cortes_ia
      ADD CONSTRAINT cortes_ia_modo_check CHECK (modo IN ('fala', 'clipe_frase'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cortes_ia_clipe_origem_check'
  ) THEN
    ALTER TABLE cortes_ia
      ADD CONSTRAINT cortes_ia_clipe_origem_check
      CHECK (clipe_origem IS NULL OR clipe_origem IN ('biblioteca', 'acervo'));
  END IF;
  -- Modo clipe precisa de frase e de clipe; modo fala precisa da gravação.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cortes_ia_modo_completo_check'
  ) THEN
    ALTER TABLE cortes_ia
      ADD CONSTRAINT cortes_ia_modo_completo_check CHECK (
        (modo = 'fala' AND origem_path IS NOT NULL)
        OR (modo = 'clipe_frase' AND clipe_video_id IS NOT NULL
            AND frase IS NOT NULL AND length(btrim(frase)) > 0)
      );
  END IF;
END $$;

ALTER TABLE cortes_ia ALTER COLUMN origem_path DROP NOT NULL;

COMMENT ON COLUMN cortes_ia.modo IS
  'fala = gravação transcrita e legendada (o corte de sempre). clipe_frase = clipe da biblioteca com uma frase escrita em cima, sem fala.';
COMMENT ON COLUMN cortes_ia.clipe_video_id IS
  'Id em videos_franqueada (clipe_origem=biblioteca) ou acervo_videos (clipe_origem=acervo). A URL é resolvida no worker, nunca recebida da tela.';
