-- Carrossel de sinergia da semana (Aline, 05/10/2026). Guarda QUAL foto do
-- acervo do Scanner o post usou, pra a conta não receber o mesmo prato de novo
-- enquanto houver foto nova do tema dela. Os 3 stories da mesma sinergia levam
-- a mesma chave.
-- ADITIVA: coluna nova, nula em todo post que não é de sinergia.
alter table public.posts_agendados
  add column if not exists sinergia_chave text;
create index if not exists idx_posts_sinergia_chave
  on public.posts_agendados(franqueada_id, sinergia_chave)
  where sinergia_chave is not null;
