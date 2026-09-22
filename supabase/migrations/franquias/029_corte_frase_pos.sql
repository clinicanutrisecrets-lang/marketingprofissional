-- ============================================================
-- MIGRATION 029: onde a faixa com a frase fica no vídeo curto
-- ============================================================
-- Pedido da Aline (22/09/2026): "como se fosse o editor igual do Instagram,
-- que é só eu mover para cima e para baixo, eu colocar na posição que eu
-- quero". Até aqui a faixa era sempre o centro exato da tela — e o centro é
-- justamente onde o assunto do clipe costuma estar.
--
-- 🔴 GUARDAMOS FRAÇÃO DA ALTURA, NUNCA PIXEL. A tela desenha sobre uma
-- miniatura de tamanho qualquer e o worker renderiza em 1080x1920: pixel da
-- tela faria a frase sair num lugar no preview e noutro no vídeo.
--
-- O default 0.5 é o centro de sempre, e com ele o renderizador devolve o
-- vídeo BYTE A BYTE igual ao de antes desta coluna existir. Linha que já
-- existe segue idêntica.
--
-- Segura de aplicar ANTES do deploy: coluna nova com default é invisível pro
-- código que está no ar.

ALTER TABLE cortes_ia
  ADD COLUMN IF NOT EXISTS frase_pos NUMERIC(4, 3) NOT NULL DEFAULT 0.5;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cortes_ia_frase_pos_check'
  ) THEN
    -- Os mesmos limites de lib/corte/video-curto.ts e clipe_frase.py: em cima
    -- some sob a borda, embaixo cobre a assinatura.
    ALTER TABLE cortes_ia
      ADD CONSTRAINT cortes_ia_frase_pos_check
      CHECK (frase_pos >= 0.18 AND frase_pos <= 0.82);
  END IF;
END $$;

COMMENT ON COLUMN cortes_ia.frase_pos IS
  'Altura da faixa da frase no vídeo curto, em fração (0 = topo, 1 = pé). 0.5 é o centro, que era o único lugar possível até 22/09/2026.';
