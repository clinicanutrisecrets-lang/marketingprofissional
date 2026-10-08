-- Corrigir o texto da ARTE antes de postar (Juliana e Aline, 08/10/2026:
-- "um botão de corrigir o texto antes de gerar a imagem"; "reduz a objeção
-- de que não dá pra mudar as informações do post sugerido").
--
-- Até aqui o texto desenhado na arte (título, subtítulo, cada slide) só
-- existia na memória da geração: o banco guardava a imagem pronta, e o
-- "Editar" da tela Aprovar semana só mexia na legenda.
--
-- posts_agendados.texto_arte: as peças desenhadas, na ordem
--   ([{headline, subtitle?, corpo?}], uma por slide; peça única = 1 item).
-- posts_agendados.foto_arte_ref: a foto do banco "Minhas fotos" que entrou
--   na capa/arte, pra o redesenho manter a mesma foto.
--
-- Aditiva: o código no ar não lê nenhuma das duas. Seguro antes do deploy.

alter table public.posts_agendados add column if not exists texto_arte jsonb;
alter table public.posts_agendados add column if not exists foto_arte_ref text;
