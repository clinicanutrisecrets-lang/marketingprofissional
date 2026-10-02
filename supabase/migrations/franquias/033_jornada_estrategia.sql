-- A Jornada até o Teste (Aline, 01–02/10/2026). Aditiva: o código no ar não lê
-- nenhuma destas colunas, então aplicar antes do deploy é seguro.
--
-- aprovacoes_semanais.estrategia: o que a semana faz na jornada (semana N de 4,
--   título, frase, passos, queixas da rodada). A tela de aprovação e o aviso do
--   Scanner leem daqui.
-- posts_agendados.papel_estrategia: uma frase do que o post faz na semana.
-- posts_agendados.lembrete_execucao: o que ela faz no Instagram (pôr a enquete
--   por cima, o adesivo de link).
-- posts_agendados.objecao_dissolvida: a objeção que o gancho dissolve.
-- cortes_ia.post_id: o vídeo curto que nasce junto com o reel da semana.

alter table public.aprovacoes_semanais add column if not exists estrategia jsonb;
alter table public.posts_agendados add column if not exists papel_estrategia text;
alter table public.posts_agendados add column if not exists lembrete_execucao text;
alter table public.posts_agendados add column if not exists objecao_dissolvida text;
alter table public.cortes_ia add column if not exists post_id uuid references public.posts_agendados(id) on delete set null;
create index if not exists cortes_ia_post_id_idx on public.cortes_ia(post_id) where post_id is not null;
