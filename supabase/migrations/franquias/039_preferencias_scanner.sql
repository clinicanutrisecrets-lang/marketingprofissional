-- Respostas de marketing que a profissional dá no painel do Scanner
-- (Aline, 15/10/2026): grava vídeos? e a escolha de cada data comemorativa.
-- Espelhadas pelo mesmo sync do público (lib/publico/sync.ts). Aditiva.
alter table public.franqueadas add column if not exists preferencias_scanner jsonb;
