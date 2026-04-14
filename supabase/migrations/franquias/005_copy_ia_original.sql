-- ============================================================
-- Preservar a versão original gerada pela IA separada da versão final
-- Isso alimenta o loop de aprendizado: o sistema compara o que a IA
-- gerou com o que foi publicado (depois de edições da nutri/admin) e
-- calibra os próximos prompts.
-- ============================================================

ALTER TABLE posts_agendados
  ADD COLUMN copy_legenda_ia_original  TEXT,
  ADD COLUMN copy_cta_ia_original      TEXT,
  ADD COLUMN hashtags_ia_original      TEXT[],
  ADD COLUMN ia_model_usado            TEXT,        -- ex: 'claude-sonnet-4-5'
  ADD COLUMN ia_tokens_input           INTEGER,
  ADD COLUMN ia_tokens_output          INTEGER,
  ADD COLUMN ia_tokens_cached          INTEGER;     -- quantos foram cache hit
