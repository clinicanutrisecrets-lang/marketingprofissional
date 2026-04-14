-- ============================================================
-- Suporte a carrossel (múltiplas mídias por post)
-- Antes: posts_agendados tinha só url_imagem_final / url_video_final
-- Depois: tabela post_midias com 1..N mídias ordenadas por post
-- ============================================================

CREATE TABLE post_midias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         UUID NOT NULL REFERENCES posts_agendados(id) ON DELETE CASCADE,
  ordem           INTEGER NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('imagem', 'video')),
  url             TEXT NOT NULL,
  largura_px      INTEGER,
  altura_px       INTEGER,
  duracao_seg     INTEGER,             -- para vídeos
  tamanho_bytes   INTEGER,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, ordem)
);

CREATE INDEX idx_post_midias_post ON post_midias(post_id, ordem);

-- Ativar RLS herdando de posts_agendados
ALTER TABLE post_midias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_midias_self" ON post_midias FOR ALL USING (
  post_id IN (
    SELECT id FROM posts_agendados
    WHERE franqueada_id IN (SELECT id FROM franqueadas WHERE auth_user_id = auth.uid())
  )
  OR is_admin()
);
