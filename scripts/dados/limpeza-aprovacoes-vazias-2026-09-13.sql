-- Limpeza das APROVAÇÕES SEMANAIS SEM POST NENHUM (13/09/2026)
--
-- Contexto: a linha de `aprovacoes_semanais` nasce ANTES dos posts
-- (gerarPostsDaSemana insere a aprovação e só então gera um post por vez), então
-- geração que falhou no meio deixa uma carcaça sem post. Ela fazia dois estragos:
--   1. a tela "Aprovar semana" escolhia essa linha e mostrava o estado vazio
--      "Nenhuma semana aguardando aprovação" — mesmo com a semana boa pronta;
--   2. a semana daquela data ficava TRAVADA pra sempre: todo clique em montar a
--      semana batia em "Já existe aprovação pra essa semana".
-- Foi o que aconteceu com a Juliana: a carcaça de 17/08 (criada no onboarding
-- dela em 11/08) escondia a semana de 14/09 que ela tinha aprovado.
--
-- O código já ficou imune (a tela ignora aprovação vazia e a geração apaga a
-- carcaça antes de refazer a semana). Este script tira as que já existem.
--
-- 🔴 Só apaga linha com ZERO post. As duas FKs que apontam pra cá são
-- ON DELETE SET NULL, então apagar uma aprovação COM post órfãozaria os posts
-- (eles sobreviveriam sem semana e nenhuma tela os mostraria).
--
-- Medido antes de rodar: 6 linhas — 1 da conta demo (20/04), 4 da Aline
-- (11/05, 18/05, 25/05, 15/06) e 1 da Juliana (17/08). Nenhuma tem post.

begin;

-- Confira primeiro (deve listar as mesmas 6, todas com posts = 0):
-- select a.id, f.email, a.semana_ref, a.status,
--        (select count(*) from posts_agendados p where p.aprovacao_semanal_id = a.id) as posts
--   from aprovacoes_semanais a join franqueadas f on f.id = a.franqueada_id
--  where not exists (select 1 from posts_agendados p where p.aprovacao_semanal_id = a.id)
--  order by a.criado_em;

delete from aprovacoes_semanais a
 where not exists (
   select 1 from posts_agendados p where p.aprovacao_semanal_id = a.id
 );

commit;
