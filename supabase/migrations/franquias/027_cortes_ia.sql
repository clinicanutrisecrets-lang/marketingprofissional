-- ============================================================
-- MIGRATION 027: Cortes com IA (gravação do teleprompter → reel editado)
-- ============================================================
-- A nutri grava até 60 s no teleprompter, o vídeo bruto sobe pro bucket
-- `videos-biblioteca` e um worker (GitHub Actions, packages/corte-ia)
-- transcreve, planeja com o Claude (palavras-chave, legendas, b-roll da
-- biblioteca) e renderiza o MP4 9:16 com ffmpeg. O resultado vai pro bucket
-- `franqueadas-assets` e o status fica nesta tabela, no mesmo padrão de
-- `reels_animados`.
--
-- Recurso atrás de flag por e-mail (CORTE_IA_EMAILS) enquanto está em teste
-- na conta da Aline. A tabela é aditiva e não toca em nada existente.
--
-- ✅ Aplicada em produção (mfldshdxulqxskwcoxrl) em 05/09/2026, antes do
-- deploy. Rodar de novo é seguro (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS cortes_ia (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franqueada_id   UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  sugestao_id     UUID REFERENCES sugestoes_conteudo(id) ON DELETE SET NULL,
  tema            TEXT NOT NULL,
  -- gravação bruta (bucket videos-biblioteca)
  origem_path     TEXT NOT NULL,
  origem_mime     TEXT,
  duracao_seg     NUMERIC,
  -- pipeline
  status          TEXT NOT NULL DEFAULT 'enviado'
                  CHECK (status IN ('enviado', 'processando', 'pronto', 'erro')),
  etapa           TEXT,            -- transcrevendo | planejando | renderizando
  erro_msg        TEXT,
  transcricao     JSONB,           -- frases + palavras com timestamps
  plano           JSONB,           -- saída do Claude (capa, palavras-chave, b-roll)
  -- resultado (bucket franqueadas-assets)
  path            TEXT,
  url             TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cortes_ia_franqueada
  ON cortes_ia(franqueada_id, criado_em DESC);

ALTER TABLE cortes_ia ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cortes_ia' AND policyname = 'cortes_ia_own') THEN
    CREATE POLICY "cortes_ia_own" ON cortes_ia FOR ALL
      USING (
        franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
        OR is_admin()
      );
  END IF;
END $$;

COMMENT ON TABLE cortes_ia IS
  'Gravações do teleprompter (até 60 s) editadas por IA: transcrição, legendas dinâmicas, palavras-chave e b-roll da biblioteca. Worker: packages/corte-ia.';
