-- ============================================================
-- Canva pipeline — pool de designs + cache de fotos Pexels
-- ============================================================
-- Substitui colunas legacy aline.perfis.canva_template_*_id por pool
-- de designs com tags (selector escolhe via match + LRU).
-- Cache fotos_usadas garante rotação Pexels.

-- =============== POOL DE CANVA DESIGNS ===============
CREATE TABLE IF NOT EXISTS aline.canva_designs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id    UUID REFERENCES aline.perfis(id) ON DELETE CASCADE,
  -- Quando perfil_id IS NULL, o design é "shared" (qualquer perfil pode usar)
  design_id    TEXT NOT NULL,
  tipo         TEXT NOT NULL
    CHECK (tipo IN ('feed_imagem','feed_carrossel','stories','reels','generico')),
  tags         TEXT[] DEFAULT ARRAY[]::TEXT[],
  descricao    TEXT,
  ativo        BOOLEAN DEFAULT TRUE,

  ultimo_uso   TIMESTAMPTZ,
  uso_count    INTEGER DEFAULT 0,

  criado_em    TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- COALESCE não é aceito em UNIQUE constraint — usa unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS uniq_canva_design_perfil
  ON aline.canva_designs (design_id, COALESCE(perfil_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_canva_designs_perfil_tipo
  ON aline.canva_designs(perfil_id, tipo, ativo);

CREATE INDEX IF NOT EXISTS idx_canva_designs_tags
  ON aline.canva_designs USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_canva_designs_lru
  ON aline.canva_designs(tipo, ultimo_uso NULLS FIRST);

ALTER TABLE aline.canva_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia canva_designs"
  ON aline.canva_designs FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

COMMENT ON TABLE aline.canva_designs IS
  'Pool de Canva designs disponíveis pra duplicate-and-edit. perfil_id NULL = shared (Scanner 2.0 pool da Aline).';

-- =============== CACHE FOTOS PEXELS ===============
CREATE TABLE IF NOT EXISTS aline.fotos_usadas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id       UUID NOT NULL REFERENCES aline.perfis(id) ON DELETE CASCADE,
  pexels_photo_id TEXT NOT NULL,
  photo_url       TEXT,
  visual_hint     TEXT,
  post_id         UUID REFERENCES aline.posts(id) ON DELETE SET NULL,
  usado_em        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fotos_usadas_perfil_data
  ON aline.fotos_usadas(perfil_id, usado_em DESC);

CREATE INDEX IF NOT EXISTS idx_fotos_usadas_photo_id
  ON aline.fotos_usadas(perfil_id, pexels_photo_id);

ALTER TABLE aline.fotos_usadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin ve fotos_usadas"
  ON aline.fotos_usadas FOR SELECT
  USING (EXISTS (SELECT 1 FROM admins WHERE auth_user_id = auth.uid()));

COMMENT ON TABLE aline.fotos_usadas IS
  'Cache de fotos Pexels já usadas. Pipeline filtra estas pra evitar repetição visual.';

-- =============== SEED Scanner 2.0 ===============
-- 6 designs do pool da Aline (perfil_id NULL = shared entre perfis).
-- Tags iniciais — admin refina via UI depois.
INSERT INTO aline.canva_designs (perfil_id, design_id, tipo, tags, descricao)
VALUES
  (NULL, 'DAHIK0W1LD4', 'feed_imagem',    ARRAY['scanner_2_0','warm_cream','foto_hero','headline'], 'Scanner 2.0 — feed imagem com foto hero + headline'),
  (NULL, 'DAHGMl54D-8', 'feed_imagem',    ARRAY['scanner_2_0','warm_cream','flat_lay','alimento'],   'Scanner 2.0 — flat-lay de alimento'),
  (NULL, 'DAHIztQhOKs', 'feed_imagem',    ARRAY['scanner_2_0','warm_cream','question_card'],         'Scanner 2.0 — question card sobre tópico'),
  (NULL, 'DAHIK_YXsDc', 'feed_carrossel', ARRAY['scanner_2_0','warm_cream','carrossel','educativo'], 'Scanner 2.0 — capa de carrossel educativo'),
  (NULL, 'DAG7zkzfCAQ', 'feed_imagem',    ARRAY['scanner_2_0','warm_cream','microscopia','cientifico'], 'Scanner 2.0 — visual científico'),
  (NULL, 'DAG7IDNTt68', 'stories',        ARRAY['scanner_2_0','warm_cream','stories'],               'Scanner 2.0 — stories 9:16')
ON CONFLICT DO NOTHING;

-- =============== RPC: marcar design usado ===============
CREATE OR REPLACE FUNCTION aline.marcar_canva_design_usado(p_design_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE aline.canva_designs
     SET ultimo_uso = NOW(),
         uso_count = uso_count + 1,
         atualizado_em = NOW()
   WHERE id = p_design_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION aline.marcar_canva_design_usado(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION aline.marcar_canva_design_usado(UUID) TO service_role;
