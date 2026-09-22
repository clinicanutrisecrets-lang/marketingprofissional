-- Vídeo gravado no campo da IMAGEM: conserto do dado.
--
-- Causa (corrigida em código no mesmo dia): a geração semanal decidia entre
-- `url_imagem_final` e `url_video_final` pelo tipo de post PEDIDO, não pelo
-- que o Creatomate devolveu. Template de vídeo configurado pro carrossel =>
-- MP4 gravado como se fosse arte. Foi assim que o carrossel da Juliana da
-- semana de 08/09/2026 apareceu como um vídeo de bicicleta.
--
-- Medido em 22/09/2026, antes de rodar:
--   feed_carrossel  8 linhas (Aline 6, Juliana 1, demo 1)
--   stories        13 linhas (Aline)
--   total          21, em 3 contas — todas internas (time + demo).
--   1 delas está `aprovado`: o carrossel da Juliana.
--
-- 🔴 O tratamento é DIFERENTE por formato, e a diferença importa:
--   • stories aceita vídeo no Instagram => o arquivo MUDA DE CAMPO, não se
--     perde. Apagar destruiria um criativo que funciona.
--   • carrossel e feed são formatos de imagem parada => ali o vídeo não é
--     "campo trocado", é criativo errado. O campo fica NULO e o post volta a
--     não ter arte, que é o estado honesto: a nutri gera de novo ou monta no
--     Editor de arte.
--
-- Idempotente: a condição casa só o que ainda está errado.

begin;

-- 1) stories: o vídeo vai pro campo de vídeo
update posts_agendados
set    url_video_final  = url_imagem_final,
       url_imagem_final = null,
       atualizado_em    = now()
where  tipo_post = 'stories'
  and  url_imagem_final ~* '\.(mp4|mov|webm)(\?|$)'
  and  url_video_final is null;

-- 2) carrossel e feed: vídeo não é arte — o campo fica vazio
update posts_agendados
set    url_imagem_final = null,
       atualizado_em    = now()
where  tipo_post in ('feed_carrossel', 'feed_imagem')
  and  url_imagem_final ~* '\.(mp4|mov|webm)(\?|$)';

commit;

-- Conferência: tem que voltar ZERO.
-- select count(*) from posts_agendados
--  where url_imagem_final ~* '\.(mp4|mov|webm)(\?|$)';
