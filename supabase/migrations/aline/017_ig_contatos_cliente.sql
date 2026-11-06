-- A closer do direct reconhece quem JÁ é cliente da Clínica Nutri Secrets
-- (Aline, 06/11/2026). Guarda só as BANDEIRAS que o Scanner devolveu
-- (confirmado, paciente, tem_genetico, tem_epigenetico, comprou_lotus), nunca
-- o e-mail digitado nem dado de saúde. Aditiva, só schema aline: aplicar
-- ANTES do deploy (o select do robô lê as colunas).
alter table aline.ig_contatos
  add column if not exists cliente_situacao jsonb,
  add column if not exists cliente_conferido_em timestamptz;

comment on column aline.ig_contatos.cliente_situacao is
  'Bandeiras do Scanner (/api/integrations/marketing/cliente): confirmado com e-mail + nome. Sem e-mail, sem dado clínico.';
