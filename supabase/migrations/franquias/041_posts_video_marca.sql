-- Vídeo de marca da semana (16/10/2026): qual vídeo do catálogo
-- (apps/franquias/src/lib/videos/marca.ts) aquele post leva. É por esta
-- coluna que o pacote de domingo sabe o que ela já recebeu e não repete.
-- Aditiva: o código no ar não lê a coluna.
alter table public.posts_agendados add column if not exists video_marca_id text;
create index if not exists posts_agendados_video_marca_idx
  on public.posts_agendados (franqueada_id, video_marca_id)
  where video_marca_id is not null;
