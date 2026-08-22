-- Stories entram no pacote semanal de sugestões (Juliana, 22/08/2026:
-- "ele não sugere os stories"). Amplia o CHECK de tipo — mudança ADITIVA,
-- segura antes do deploy (o código antigo nunca grava 'story').
-- ✅ JÁ APLICADA em produção em 22/08/2026.
alter table sugestoes_conteudo drop constraint sugestoes_conteudo_tipo_check;
alter table sugestoes_conteudo add constraint sugestoes_conteudo_tipo_check
  check (tipo = any (array['feed_imagem'::text, 'feed_carrossel'::text, 'reel'::text, 'story'::text]));
