-- 031: todos os slides do carrossel no post.
--
-- O carrossel da semana passa a sair pelo desenhador tipográfico, que devolve
-- uma imagem por slide. `url_imagem_final` continua com o slide 1 (a prévia e
-- tudo que já lê esse campo seguem iguais); a lista inteira fica aqui, na
-- ordem, pra a tela Aprovar semana mostrar e baixar todos.
--
-- Aditiva e nula por padrão: post que não é carrossel não muda. Pode ser
-- aplicada antes do deploy (o código antigo não conhece a coluna) e PRECISA
-- estar aplicada antes dele (o gerador novo grava nela).
alter table public.posts_agendados
  add column if not exists urls_slides text[];

comment on column public.posts_agendados.urls_slides is
  'Carrossel: URL de cada slide, na ordem. url_imagem_final guarda o slide 1.';
