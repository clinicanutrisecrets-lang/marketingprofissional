-- 032: o roteiro falado do reel da semana fica no post.
--
-- O gerador semanal sempre pediu ao modelo o roteiro de narração do reel
-- (campo script_reels do JSON) e nunca o gravou: a nutri recebia só a legenda
-- e um vídeo de fundo que, sem crédito no Creatomate, nem saía. O reel da
-- semana é ela gravando, com o roteiro no teleprompter, como o post de venda
-- e o Estúdio de conteúdo já fazem. Esta coluna é onde o roteiro mora.
--
-- Aditiva e nula por padrão: post que não é reel não muda. Pode ser aplicada
-- antes do deploy (o código antigo não conhece a coluna) e PRECISA estar
-- aplicada antes dele (o gerador novo grava nela; PostgREST recusa insert com
-- coluna desconhecida e o pacote da semana inteiro falharia).
alter table public.posts_agendados
  add column if not exists roteiro_reels text;

comment on column public.posts_agendados.roteiro_reels is
  'Reels: o texto corrido que a profissional fala, lido no teleprompter. Nulo fora de reels.';
