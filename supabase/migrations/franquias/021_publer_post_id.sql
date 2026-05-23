-- Coluna para rastrear posts publicados via Publer
ALTER TABLE posts_agendados
  ADD COLUMN IF NOT EXISTS publer_post_id TEXT;

-- Novo status possível: agendado_publer
-- (os demais: rascunho, aprovado, postado, erro)
