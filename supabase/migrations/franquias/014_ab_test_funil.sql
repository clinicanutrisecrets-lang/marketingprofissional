-- ============================================================
-- MIGRATION 014: A/B test de funil (sofia_slug + funil_variante)
-- ============================================================
-- Duas variantes de funil a testar:
--   1. Ad → URL Sofia direto (scannerdasaude.com/sofia/[sofia_slug])
--   2. Ad → LP /nutri/[slug] (app.scannerdasaude.com) com CTA pra Sofia
--
-- sofia_slug: codigo/hash que identifica a nutri na Sofia do SaaS
-- funil_variante: qual funil o anuncio especifico esta testando

ALTER TABLE franqueadas
  ADD COLUMN IF NOT EXISTS sofia_slug TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_franqueadas_sofia_slug
  ON franqueadas(sofia_slug) WHERE sofia_slug IS NOT NULL;

ALTER TABLE anuncios
  ADD COLUMN IF NOT EXISTS funil_variante TEXT CHECK (funil_variante IN (
    'sofia_direto',        -- ad → URL Sofia
    'lp_bridge',           -- ad → LP → Sofia
    null
  ));

CREATE INDEX IF NOT EXISTS idx_anuncios_funil_variante
  ON anuncios(funil_variante, franqueada_id)
  WHERE funil_variante IS NOT NULL;

-- Adiciona funil_variante em conversoes_registradas pra filtrar
-- eventos por variante de teste e comparar performance (CPL, CPA, ROAS).
ALTER TABLE conversoes_registradas
  ADD COLUMN IF NOT EXISTS funil_variante TEXT;

CREATE INDEX IF NOT EXISTS idx_conversoes_funil_variante
  ON conversoes_registradas(franqueada_id, funil_variante, tipo, event_time DESC)
  WHERE funil_variante IS NOT NULL;

COMMENT ON COLUMN franqueadas.sofia_slug IS
  'Slug/hash da nutri no SaaS Sofia. URL completa: scannerdasaude.com/sofia/[sofia_slug].';
COMMENT ON COLUMN anuncios.funil_variante IS
  'A/B test — sofia_direto ou lp_bridge. Null = ainda sem variante definida.';
