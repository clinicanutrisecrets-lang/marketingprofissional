-- Reel animado no pacote de domingo (Aline, 05/10/2026: entra JUNTO com o
-- vídeo de b-roll). O worker render-reel liga o MP4 ao post quando termina.
-- ADITIVA: coluna nova, nula para os reels feitos pelo botão manual.
alter table public.reels_animados
  add column if not exists post_id uuid references public.posts_agendados(id) on delete set null;
create index if not exists idx_reels_animados_post on public.reels_animados(post_id) where post_id is not null;
