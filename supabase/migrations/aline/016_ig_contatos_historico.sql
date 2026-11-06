-- Quando o robô conferiu, pela API, se a Aline já conversava com esta pessoa
-- ANTES de o webhook existir (a trava aline_falou_em só via eco não pega a
-- amiga de anos que escreve pela primeira vez depois que o robô ligou).
-- Aditiva, só schema aline. Seguro antes ou depois do deploy: o código lê a
-- coluna com fallback (ausente = não conferido).
alter table aline.ig_contatos
  add column if not exists historico_conferido_em timestamptz;

comment on column aline.ig_contatos.historico_conferido_em is
  'Quando o robô leu o histórico da conversa na API para saber se a dona do perfil já tinha escrito ali. Null = ainda não conferido.';
