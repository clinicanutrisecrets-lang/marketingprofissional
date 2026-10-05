-- Conta as vezes que a fila tentou mandar a MESMA linha.
--
-- 🔴 EXISTE POR CAUSA DE UM INCIDENTE REAL (05/10/2026). O conserto de 29/09
-- passou a gravar `status='sem_confirmacao'` na fila — valor que o CHECK
-- `ig_fila_status_check` recusa — e o código não lia o erro do UPDATE. A linha
-- ficava `pendente`, o cron pegava de novo, e a mesma resposta privada saiu
-- DEZ vezes, de 5 em 5 minutos, até alguém marcar a linha à mão.
--
-- A tradução desfecho→status e a leitura do erro consertam a causa. Esta
-- coluna é a rede: linha que já foi tentada e CONTINUA pendente significa que
-- a marcação falhou, qualquer que seja o motivo futuro. Aí ela para, em vez de
-- gastar a paciência de quem está do outro lado.
alter table aline.ig_fila
  add column if not exists tentativas integer not null default 0;

comment on column aline.ig_fila.tentativas is
  'Tentativas de envio desta linha. Sobe ANTES do envio. >= 2 com status pendente = a marcacao falhou; a fila para e marca falhou.';
