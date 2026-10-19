-- ============================================================
-- MIGRATION 042: Revisor da arte (Aline, 19/10/2026)
-- ============================================================
-- O revisor (apps/franquias/src/lib/revisor-arte) olha cada arte com foto
-- antes de o post ir para a profissional. Quando acha foto cortada ou texto
-- ilegível, refaz a arte sem foto; o resto vira aviso. Uma linha por post
-- revisado com achado (ou com leitura de imagem), para o alerta do admin.
--
-- Aditiva: tabela nova, nenhuma tabela existente muda. O código grava com a
-- service key e tolera a tabela ainda não existir (só loga), então a ordem
-- entre esta migração e o deploy não importa. Rodar de novo é seguro.

CREATE TABLE IF NOT EXISTS revisoes_arte (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id        UUID NOT NULL REFERENCES posts_agendados(id) ON DELETE CASCADE,
  franqueada_id  UUID NOT NULL REFERENCES franqueadas(id) ON DELETE CASCADE,
  semana_ref     DATE,
  tipo_post      TEXT,
  acao           TEXT NOT NULL CHECK (acao IN ('ok', 'refazer_sem_foto', 'sinalizar')),
  achados        JSONB NOT NULL DEFAULT '[]'::jsonb,
  olhar          JSONB,
  url_antes      TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revisoes_arte_recentes
  ON revisoes_arte(criado_em DESC, franqueada_id);

ALTER TABLE revisoes_arte ENABLE ROW LEVEL SECURITY;

-- Só o time lê (alerta do admin). A profissional não vê esta tabela.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'revisoes_arte' AND policyname = 'revisoes_arte_admin_select') THEN
    CREATE POLICY "revisoes_arte_admin_select" ON revisoes_arte FOR SELECT USING (is_admin());
  END IF;
END $$;
