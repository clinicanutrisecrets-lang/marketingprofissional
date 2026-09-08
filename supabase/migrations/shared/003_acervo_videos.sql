-- ============================================================
-- ACERVO DE VÍDEOS COMPARTILHADO (b-roll "coringa")
-- ============================================================
-- Hoje existem DUAS bibliotecas de b-roll, uma por produto:
--   public.videos_franqueada  (Scanner Franquias, 1 por franqueada)
--   aline.videos_perfil       (Studio Aline, 1 por perfil)
-- Um clipe genérico ("mãos cortando vegetais") serve pros dois, e subir o
-- mesmo arquivo nas duas telas dobra o trabalho e desencontra as listas.
--
-- Esta tabela é o acervo COMUM: sobe uma vez, aparece nos dois produtos e no
-- worker de corte com IA (packages/corte-ia). As bibliotecas particulares
-- continuam existindo e têm prioridade — o acervo é o fundo de catálogo.
--
-- Escrita: só admin. Leitura: qualquer usuário autenticado (franqueada
-- logada no SaaS e admin no Studio).
--
-- ADITIVA: não toca em videos_franqueada nem em videos_perfil.

CREATE TABLE IF NOT EXISTS acervo_videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          TEXT NOT NULL,
  descricao       TEXT,                       -- o que se vê na cena (a IA lê isto)
  categoria       TEXT,                       -- grupo do catálogo (ver docs/broll-coringas.md)
  -- Arquivo: `path_storage` é a fonte de verdade (a URL assinada expira e é
  -- regerada); `url` fica como atalho de exibição.
  bucket          TEXT NOT NULL DEFAULT 'videos-biblioteca',
  path_storage    TEXT,
  url             TEXT NOT NULL,
  thumbnail_url   TEXT,
  duracao_seg     INTEGER,
  largura_px      INTEGER,
  altura_px       INTEGER,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  fonte           TEXT NOT NULL DEFAULT 'upload'
                  CHECK (fonte IN ('upload', 'pexels', 'ia')),
  pexels_video_id TEXT,
  usado_quantas_vezes INTEGER NOT NULL DEFAULT 0,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  criado_por      UUID,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Match por tag (mesmo padrão de videos_franqueada.tags)
CREATE INDEX IF NOT EXISTS idx_acervo_videos_tags ON acervo_videos USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_acervo_videos_ativo ON acervo_videos(ativo, criado_em DESC);

ALTER TABLE acervo_videos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'acervo_videos' AND policyname = 'acervo_leitura_autenticada') THEN
    CREATE POLICY "acervo_leitura_autenticada" ON acervo_videos
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;

  -- Escrita só de admin. Sem policy de INSERT/UPDATE/DELETE pra franqueada:
  -- o acervo é curado, não é a biblioteca pessoal dela.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'acervo_videos' AND policyname = 'acervo_escrita_admin') THEN
    CREATE POLICY "acervo_escrita_admin" ON acervo_videos
      FOR ALL USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;

COMMENT ON TABLE acervo_videos IS
  'Acervo de b-roll compartilhado entre Scanner Franquias e Studio Aline. Curado por admin; lido pelas duas bibliotecas e pelo worker de corte com IA. Bibliotecas particulares (videos_franqueada / aline.videos_perfil) têm prioridade sobre o acervo.';
COMMENT ON COLUMN acervo_videos.descricao IS
  'Descrição da cena em linguagem natural. É o campo que o agente usa pra casar o clipe com o trecho da fala — vale mais que as tags.';
