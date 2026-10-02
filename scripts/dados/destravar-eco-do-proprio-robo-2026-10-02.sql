-- Solta os contatos que o robô travou lendo o ECO DELE MESMO como se fosse a
-- Aline escrevendo (incidente 29/09/2026, corrigido em apps/aline/src/lib/
-- automacao/envio.ts).
--
-- A assinatura é inconfundível: a pessoa comenta a palavra-chave, o robô
-- responde em público (isso FICA registrado), manda a resposta privada (a
-- Meta devolve 500 e entrega do mesmo jeito, então o registro NÃO é escrito),
-- o eco da própria mensagem volta sem nada pra casar, e o robô conclui que
-- foi a dona do perfil que falou. O `aline_falou_em` cai de 3 a 5 segundos
-- depois da mensagem DA PESSOA.
--
-- 🔴 POR QUE NÃO LIMPAR TODOS OS `aline_falou_em`: dos 27 travados em
-- 02/10/2026, 18 são TRAVA LEGÍTIMA — conversa de verdade da Aline (irmã,
-- amigos, parcerias). Soltar tudo poria o robô de volta dentro das conversas
-- pessoais dela, que é exatamente o incidente de 22/09 que criou esta coluna.
-- Por isso o critério é a assinatura, não uma lista digitada à mão: nenhuma
-- trava legítima tem mensagem da pessoa nos 10 segundos anteriores
-- (conferido: as travas legítimas não têm mensagem nenhuma em ±6 minutos).

begin;

create temp table solta_eco as
select c.id, c.username, c.aline_falou_em
from aline.ig_contatos c
where c.aline_falou_em is not null
  and exists (
    select 1 from aline.ig_mensagens m
    where m.contato_id = c.id
      and m.direcao = 'entrada'
      and m.criado_em <= c.aline_falou_em
      and m.criado_em >= c.aline_falou_em - interval '10 seconds'
  );

-- Confira antes de confirmar: tem que dar 9 linhas, e nenhuma pode ser
-- conversa pessoal dela.
select count(*) as total, string_agg(username, ', ' order by aline_falou_em) as contas
from solta_eco;

update aline.ig_contatos c
set aline_falou_em = null
where c.id in (select id from solta_eco);

commit;
